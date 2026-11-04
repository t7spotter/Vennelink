"""JSON analytics endpoints for the React frontend owner page and the public stats page."""

from django.core.exceptions import PermissionDenied
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_GET

from . import queries
from links.models import Link
from links.views import rate_limited


def _iso(dt):
    return dt.isoformat() if dt else None


@require_GET
def link_analytics(request, code):
    """Same payload as the analytics detail page, as JSON.

    Known bot clicks are excluded by default; `?bots=1` includes them.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    link = get_object_or_404(Link, code=code, user=request.user)
    include_bots = request.GET.get("bots") == "1"
    series = queries.clicks_over_time(
        request.user, days=30, link=link, include_bots=include_bots
    )
    referrers = queries.referrer_breakdown(
        request.user, link=link, limit=10, include_bots=include_bots
    )
    variants = (
        queries.variant_breakdown(request.user, link=link, include_bots=include_bots)
        if link.variant_b
        else {}
    )
    countries = queries.country_breakdown(
        request.user, link=link, limit=10, include_bots=include_bots
    )
    devices = queries.device_breakdown(
        request.user, link=link, include_bots=include_bots
    )
    return JsonResponse(
        {
            "link": {
                "code": link.code,
                "short_url": link.short_url,
                "destination": link.destination,
                "title": link.title,
                "status": link.status,
                "is_active": link.is_active,
                "created_at": _iso(link.created_at),
                "public_stats": link.public_stats,
                "stats_path": f"/stats/{link.code}",
                "variant_b": link.variant_b,
            },
            "bots": include_bots,
            "variant_a_count": variants.get("a", 0),
            "variant_b_count": variants.get("b", 0),
            "total_clicks": link.clicks.count(),
            "bot_clicks": link.clicks.filter(is_bot=True).count(),
            "total_clicks_30": sum(point["clicks"] for point in series),
            "series": series,
            "referrers": referrers,
            "devices": devices,
            "countries": countries,
            "recent_clicks": [
                {
                    "referrer": click.referrer,
                    "device": click.device,
                    "created_at": _iso(click.created_at),
                }
                for click in link.clicks.order_by("-created_at")[:10]
            ],
        }
    )


@require_GET
@rate_limited("public_stats", 120, 3600)
def public_stats(request, code):
    """Public JSON stats for a shareable stats page; aggregate numbers only."""
    link = get_object_or_404(
        Link,
        code=code,
        is_active=True,
        public_stats=True,
        deleted_at__isnull=True,
    )
    if link.expires_at and link.expires_at <= timezone.now():
        raise PermissionDenied
    series = queries.clicks_over_time(None, days=30, link=link)
    return JsonResponse(
        {
            "code": link.code,
            "title": link.title,
            "total_clicks": link.clicks.filter(is_bot=False).count(),
            "total_clicks_30": sum(point["clicks"] for point in series),
            "tracking_since": link.created_at.strftime("%b %Y"),
            "series": series,
            "show_countries": not link.public_hide_countries,
            "countries": []
            if link.public_hide_countries
            else queries.country_breakdown(None, link=link, limit=5),
            "referrers": queries.referrer_breakdown(None, link=link, limit=5),
            "devices": queries.device_breakdown(None, link=link),
        }
    )
