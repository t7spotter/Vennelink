"""JSON endpoints under /webapi/ for the Next.js/React frontend.

These views express the same operations as the template views in
links/views.py, but as session-authenticated JSON instead of Django
template + HTMX fragments. They reuse the existing forms, helpers, and
querysets wherever possible so validation semantics stay identical:

- LinkForm for create/update (duplicate-destination warning included)
- _filtered_links + _table_page for search/filter/pagination
- the import row parsing from link_import
- normalize_tag_names, rate_limited, and the trash/restore/purge rules

The browser-facing origin proxy handles CORS-free same-origin requests;
CSRF is enforced by Django's middleware for every unsafe method (the SPA
sends X-CSRFToken).
"""

import json

from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .forms import LinkForm
from .models import Link, Tag, normalize_tag_names
from .views import (
    MAX_IMPORT_ROWS,
    _duplicate_destination_code,
    _filtered_links,
    rate_limited,
)


# ---- serialization helpers -----------------------------------------------


def _iso(dt):
    return dt.isoformat() if dt else None


def _local_input(dt):
    """Formatted for <input type="datetime-local"> in the current timezone."""
    if not dt:
        return ""
    return timezone.localtime(dt).strftime("%Y-%m-%dT%H:%M")


def _form_errors(form):
    return {field: [str(e) for e in errors] for field, errors in form.errors.items()}


def _split_referrers(raw):
    return [d for d in (raw or "").split("\n") if d]


def link_dict(link):
    """Full link payload — the edit page and analytics header use this."""
    return {
        "id": link.pk,
        "code": link.code,
        "short_url": link.short_url,
        "destination": link.destination,
        "title": link.title,
        "notes": link.notes,
        "is_active": link.is_active,
        "status": link.status,
        "permanent": link.permanent,
        "public_stats": link.public_stats,
        "public_hide_countries": link.public_hide_countries,
        "expires_at": _iso(link.expires_at),
        "expires_local": _local_input(link.expires_at),
        "goes_live_at": _iso(link.goes_live_at),
        "goes_live_local": _local_input(link.goes_live_at),
        "variant_b": link.variant_b,
        "domain": link.domain,
        "qr_dark": link.qr_dark,
        "qr_light": link.qr_light,
        "allowed_referrers": _split_referrers(link.allowed_referrers),
        "has_password": bool(link.password_hash),
        "tags": sorted(link.tags.values_list("name", flat=True)),
        "domain_choices": _domain_choices(),
        "created_at": _iso(link.created_at),
        "updated_at": _iso(link.updated_at),
    }


def row_dict(link):
    """The row subset rendered in the dashboard table."""
    return {
        "id": link.pk,
        "code": link.code,
        "short_url": link.short_url,
        "destination": link.destination,
        "title": link.title,
        "status": link.status,
        "is_active": link.is_active,
        "goes_live_at": _iso(link.goes_live_at),
        "health_status": link.health_status,
        "health_detail": link.health_detail,
        "tags": sorted(link.tags.values_list("name", flat=True)),
        "click_count": getattr(link, "click_count", link.clicks.count()),
        "last_click_at": _iso(getattr(link, "last_click_at", None)),
        "created_at": _iso(link.created_at),
    }


def _domain_choices():
    from urllib.parse import urlsplit

    from django.conf import settings

    default_host = urlsplit(settings.SITE_URL).hostname
    hosts = [default_host or ""] + [
        d for d in settings.EXTRA_DOMAINS if d != default_host
    ]
    return [h for h in hosts if h]


def _ok(payload, status=200):
    return JsonResponse(payload, status=status)


# ---- read endpoints ------------------------------------------------------


@require_GET
def dashboard_payload(request):
    """Headline stats, the 14-day series, and recent activity for /dashboard."""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)

    from analytics import queries

    links = _filtered_links(request.user, request)
    table = _table(request, links)
    series = queries.clicks_over_time(request.user, days=14)
    stats = queries.user_totals(request.user)
    return _ok(
        {
            "stats": {
                "total_links": stats["total_links"],
                "active_links": stats["active_links"],
                "total_clicks": stats["total_clicks"],
                "last_click": _iso(stats["last_click"]),
            },
            "series": series,
            "series_total": sum(point["clicks"] for point in series),
            "recent_clicks": [
                {
                    "code": click.link.code,
                    "created_at": _iso(click.created_at),
                    "timesince": _timesince(click.created_at),
                }
                for click in queries.recent_clicks(request.user, limit=5)
            ],
            **table,
        }
    )


def _timesince(dt):
    from django.contrib.humanize.templatetags.humanize import naturaltime

    return naturaltime(dt)


def _table(request, links):
    """Paginate the already-filtered queryset; mirrors _table_page in views."""
    from links.views import _table_page

    page_data = _table_page(request, links)
    page = page_data["page_obj"]
    page_links = list(page.object_list)
    return {
        "items": [row_dict(link) for link in page_links],
        "page": page.number,
        "num_pages": page.paginator.num_pages,
        "count": page.paginator.count,
        "tag_names": page_data["tag_names"],
        "spark": page_data["spark"],
        "query": page_data["query"],
        "status": page_data["status"],
        "tag": page_data["tag"],
    }


@require_GET
def links_table(request):
    """Paginated, filtered links table for the dashboard."""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    links = _filtered_links(request.user, request)
    return _ok(_table(request, links))


@require_GET
def link_detail(request, code):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    link = get_object_or_404(Link, code=code, user=request.user)
    data = link_dict(link)
    data["click_count"] = link.clicks.count()
    data["last_click_at"] = _iso(
        link.clicks.order_by("-created_at").values_list("created_at", flat=True).first()
    )
    return _ok({"link": data})


# ---- create / edit -------------------------------------------------------


def create_or_edit(request, instance=None):
    """Shared create/update handler. POSTed JSON, form-validated."""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"non_field_errors": ["Invalid JSON body."]}, status=400)

    data = {
        key: value
        for key, value in payload.items()
        if value is not None
    }
    form = LinkForm(data, instance=instance)
    form.user = request.user
    if not form.is_valid():
        return JsonResponse({"errors": _form_errors(form)}, status=400)

    duplicate_code = _duplicate_destination_code(form)
    if duplicate_code and not form.cleaned_data.get("confirm_duplicate"):
        return JsonResponse({"duplicate_code": duplicate_code}, status=409)
    link = form.save()
    return _ok(
        {"link": link_dict(link), "created": instance is None}, status=201 if instance is None else 200
    )


@require_POST
@rate_limited("webapi_link_create", limit=60, window_seconds=3600, key=lambda r: r.user.pk)
def link_create(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    return create_or_edit(request)


@require_POST
def link_update(request, code):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    link = get_object_or_404(Link, code=code, user=request.user)
    return create_or_edit(request, instance=link)


# ---- single-link actions ----------------------------------------------


@require_POST
def link_toggle(request, code):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    link = get_object_or_404(Link, code=code, user=request.user)
    link.is_active = not link.is_active
    link.save(update_fields=["is_active", "updated_at"])
    return _ok({"link": row_dict(link)})


@require_POST
def link_trash(request, code):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    link = get_object_or_404(Link, code=code, user=request.user)
    link.deleted_at = timezone.now()
    link.save(update_fields=["deleted_at", "updated_at"])
    return _ok({"trashed": link.code})


@require_POST
def link_restore(request, code):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    link = get_object_or_404(
        Link.all_objects, code=code, user=request.user, deleted_at__isnull=False
    )
    try:
        with transaction.atomic():
            link.deleted_at = None
            link.save(update_fields=["deleted_at", "updated_at"])
    except IntegrityError:
        return JsonResponse(
            {"detail": "Another link now owns that short code; rename it first."},
            status=409,
        )
    return _ok({"link": row_dict(link)})


@require_POST
def link_purge(request, code):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    link = get_object_or_404(
        Link.all_objects, code=code, user=request.user, deleted_at__isnull=False
    )
    link.delete()
    return _ok({"purged": link.code})


@require_POST
def link_bulk(request):
    """Same actions and scoping rules as links.views.link_bulk."""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON body."}, status=400)

    action = payload.get("action", "")
    raw_codes = payload.get("codes") or []
    if isinstance(raw_codes, str):
        raw_codes = [c.strip() for c in raw_codes.split(",") if c.strip()]
    raw_codes = [str(c).strip() for c in raw_codes if str(c).strip()]
    if not action or not raw_codes:
        return JsonResponse({"detail": "No links selected."}, status=400)

    links = list(
        Link.objects.filter(
            user=request.user, code__in=raw_codes, deleted_at__isnull=True
        )
    )
    if action == "activate":
        for link in links:
            if not link.is_active:
                link.is_active = True
                link.save(update_fields=["is_active", "updated_at"])
    elif action == "deactivate":
        for link in links:
            if link.is_active:
                link.is_active = False
                link.save(update_fields=["is_active", "updated_at"])
    elif action == "trash":
        now = timezone.now()
        for link in links:
            link.deleted_at = now
        Link.objects.bulk_update(links, ["deleted_at"]) if links else None
    elif action == "tag":
        try:
            tag_names = normalize_tag_names(payload.get("tag", ""))
        except Exception:
            return JsonResponse({"detail": "Invalid tag name."}, status=400)
        if not tag_names:
            return JsonResponse({"detail": "No tag given."}, status=400)
        for tag_name in tag_names:
            tag, _ = Tag.objects.get_or_create(user=request.user, name=tag_name)
            for link in links:
                link.tags.add(tag)
    else:
        return JsonResponse({"detail": "Unknown bulk action."}, status=400)
    return _ok({"action": action, "count": len(links)})


# ---- import ---------------------------------------------------------------


@require_POST
def link_import(request):
    """CSV import — same parsing and partial-success semantics as the page."""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)

    upload = request.FILES.get("file")
    if upload is None or not upload.name.endswith(".csv"):
        return _ok({"error": "Choose a .csv file to import."})
    try:
        text = upload.read().decode("utf-8-sig")
    except UnicodeDecodeError:
        return _ok({"error": "The file is not readable UTF-8/ASCII CSV."})

    from .views import _ERROR_PREVIEW_LIMIT, run_import

    created, failed, total, error = run_import(text, request.user)
    if error:
        return _ok({"error": error})
    shown = failed[:_ERROR_PREVIEW_LIMIT]
    hidden = max(0, len(failed) - _ERROR_PREVIEW_LIMIT)
    if not error and created + len(failed) == 0:
        error_word = "No rows were imported."
        return _ok({"error": error_word})
    return _ok(
        {
            "created": created,
            "total": total,
            "failed": [
                {"row": row, "message": message} for row, message in shown
            ],
            "hidden_errors": hidden,
        }
    )


# ---- transfer -------------------------------------------------------------


@require_POST
def link_transfer(request, code):
    """Two-step ownership transfer, reusing the confirmation rules."""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    from django.contrib.auth import get_user_model

    link = get_object_or_404(Link, code=code, user=request.user)
    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON body."}, status=400)

    new_owner_name = (payload.get("new_owner") or "").strip()
    confirm = bool(payload.get("confirm"))

    User = get_user_model()
    from django.db.models import Q

    lookup = Q(username__iexact=new_owner_name) | Q(email__iexact=new_owner_name)
    if new_owner_name.isdigit():
        lookup |= Q(pk=int(new_owner_name))
    new_owner = User.objects.filter(lookup).first()

    if not new_owner_name:
        return JsonResponse({"detail": "Enter a username or email."}, status=400)
    if new_owner is None:
        return JsonResponse(
            {"detail": "No user found with that username or email."}, status=400
        )
    if new_owner == request.user:
        return JsonResponse({"detail": "You already own this link."}, status=400)

    if not confirm:
        return _ok({"stage": "confirm", "new_owner": new_owner.username})

    with transaction.atomic():
        link.user = new_owner
        link.save(update_fields=["user", "updated_at"])
        tag_names = list(link.tags.values_list("name", flat=True))
        for name in tag_names:
            Tag.objects.get_or_create(user=new_owner, name=name)
        link.tags.set(list(Tag.objects.filter(user=new_owner, name__in=tag_names)))
    return _ok({"stage": "done", "new_owner": new_owner.username})


@ensure_csrf_cookie
@require_GET
def site_payload(request):
    """Public site config for the frontend (routes that render <SITE_URL>/)."""
    from django.conf import settings

    from accounts import oauth
    from links.views import FEATURES, PREVIEW_ITEMS

    return _ok(
        {
            "site_url": settings.SITE_URL,
            "landing_enabled": settings.LANDING_ENABLED,
            "registration_enabled": settings.REGISTRATION_ENABLED,
            "google_oauth": oauth.oauth_available(),
            "extra_domains": settings.EXTRA_DOMAINS,
            "max_import_rows": MAX_IMPORT_ROWS,
            "features": FEATURES,
            "preview_items": PREVIEW_ITEMS,
            "mcp_tools": _mcp_tool_summaries(),
        }
    )


def _mcp_tool_summaries():
    from .mcp import TOOLS

    summaries = []
    for tool in TOOLS:
        schema = tool.get("inputSchema") or {}
        required = list(schema.get("required") or [])
        optional = [n for n in (schema.get("properties") or {}) if n not in required]
        summaries.append(
            {
                "name": tool["name"],
                "description": tool["description"],
                "args": " · ".join([*required, *optional]),
            }
        )
    return summaries
