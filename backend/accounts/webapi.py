"""JSON endpoints under /webapi/ for the Next.js/React frontend: auth,
two-factor, profile, and session management.

Every endpoint mirrors the semantics of the template views in
accounts/views.py and reuses the same forms and helpers. CSRF is enforced
by Django's middleware (the SPA sends X-CSRFToken); responses are JSON
instead of template renders and redirects — the SPA does client-side
navigation on the redirect targets it receives.
"""

import json

from django.conf import settings
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from . import oauth
from .forms import RegisterForm, VennelinkLoginForm
from .views import (
    LOGIN_LIMIT,
    REGISTER_LIMIT,
    SESSION_2FA_KEY,
    _pending_2fa_user,
    _use_recovery,
    _user_sessions,
    _verify_totp,
    rate_limited,
)

from links.views import rate_limited as link_rate_limited  # noqa: F401  (consistency)

PASSWORD_RESET_LIMIT_CLIENT = rate_limited("webapi_password_reset", limit=10, window_seconds=3600)


def _bad(errors, status=400):
    return JsonResponse(errors, status=status)


def _safe_next(value: str) -> str:
    from django.utils.http import url_has_allowed_host_and_scheme

    if value and url_has_allowed_host_and_scheme(
        value, allowed_hosts=None, require_https=False
    ):
        return value
    return ""


@ensure_csrf_cookie
@require_GET
def csrf(request):
    """Ensure the csrftoken cookie exists and return the live token.

    GET /webapi/csrf/ both runs ensure_csrf_cookie (so the cookie is set)
    and echoes the current token in the JSON body, giving the React client
    a read of the token even if a deployment sets CSRF_COOKIE_HTTPONLY.
    """
    from django.middleware.csrf import get_token

    return JsonResponse({"ok": True, "token": get_token(request)})


@ensure_csrf_cookie
@require_GET
def session_survey(request):
    """Who is signed in + the site flags this page's chrome depends on."""
    from links.views import FEATURES, PREVIEW_ITEMS

    data = {
        "authenticated": bool(request.user.is_authenticated),
        "username": request.user.username if request.user.is_authenticated else "",
        "site_url": settings.SITE_URL,
        "landing_enabled": settings.LANDING_ENABLED,
        "registration_enabled": settings.REGISTRATION_ENABLED,
        "google_oauth": oauth.oauth_available(),
        "extra_domains": settings.EXTRA_DOMAINS,
        "features": FEATURES,
        "preview_items": PREVIEW_ITEMS,
    }
    return JsonResponse(data)


@require_POST
@LOGIN_LIMIT
def login(request):
    if request.user.is_authenticated:
        return JsonResponse({"status": "redirect", "path": "/dashboard/"})
    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return _bad({"non_field_errors": ["Invalid JSON body."]})
    form = VennelinkLoginForm(request, data=payload)
    if not form.is_valid():
        errors = {k: [str(e) for e in v] for k, v in form.errors.items()}
        return _bad(errors)
    user = form.get_user()
    two = getattr(user, "two_factor", None)
    if two is not None and two.enabled:
        request.session[SESSION_2FA_KEY] = user.pk
        return JsonResponse(
            {"status": "two-factor", "path": "/accounts/two-factor/"}
        )
    auth_login(request, user)
    nxt = _safe_next(payload.get("next") or "")
    return JsonResponse({"status": "redirect", "path": nxt or "/dashboard/"})


@require_POST
@REGISTER_LIMIT
def register(request):
    if not settings.REGISTRATION_ENABLED:
        return JsonResponse(
            {"non_field_errors": ["Registration is disabled on this installation."]},
            status=403,
        )
    if request.user.is_authenticated:
        return JsonResponse({"status": "redirect", "path": "/dashboard/"})
    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return _bad({"non_field_errors": ["Invalid JSON body."]})
    # UserCreationForm field names: username, email, password1, password2.
    form = RegisterForm(
        data={
            "username": payload.get("username") or "",
            "email": payload.get("email") or "",
            "password1": payload.get("password1") or "",
            "password2": payload.get("password2") or payload.get("password") or "",
        }
    )
    if not form.is_valid():
        return _bad(
            {k: [str(e) for e in v] for k, v in form.errors.items()}
        )
    user = form.save()
    auth_login(request, user)
    return JsonResponse({"status": "redirect", "path": "/dashboard/"})


@require_POST
def logout(request):
    """POST-only logout so link prefetching cannot log people out."""
    auth_logout(request)
    back = "/accounts/login/" if not settings.LANDING_ENABLED else "/"
    return JsonResponse({"status": "redirect", "path": back})


@require_POST
@link_rate_limited(
    "webapi_two_factor",
    limit=10,
    window_seconds=900,
    key=lambda r: f"{r.META.get('REMOTE_ADDR','')}-{r.session.get(SESSION_2FA_KEY,'')}",
)
def two_factor(request):
    """Step 2 of 2: a 6-digit TOTP code or a single-use recovery code."""
    user = _pending_2fa_user(request)
    if user is None:
        return JsonResponse({"status": "redirect", "path": "/accounts/login/"})
    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return _bad({"detail": "Invalid JSON body."})
    code = (payload.get("code") or "").strip().replace(" ", "")
    recovery = (payload.get("recovery") or "").strip()
    if _verify_totp(user, code) or (recovery and _use_recovery(user, recovery)):
        request.session.pop(SESSION_2FA_KEY, None)
        auth_login(request, user)
        nxt = _safe_next(payload.get("next") or "")
        return JsonResponse({"status": "redirect", "path": nxt or "/dashboard/"})
    return _bad({"detail": "That code did not match. Codes refresh every 30 seconds."})


@require_GET
def two_factor_state(request):
    """Setup page payload: current TwoFactor row + whether it is enabled."""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    from .models import TwoFactor

    two = TwoFactor.objects.filter(user=request.user).first()
    if two is None:
        from django.contrib import messages  # noqa: F401
        from .models import TwoFactor as _TF

        two = _TF.objects.create(user=request.user, secret=_random_base32())
    return JsonResponse(
        {
            "enabled": two.enabled,
            "secret": two.secret,
        }
    )


def _random_base32() -> str:
    import pyotp

    return pyotp.random_base32()


@require_POST
@link_rate_limited("webapi_2fa_setup", limit=20, window_seconds=3600, key=lambda r: r.user.pk)
def two_factor_setup(request):
    """Enable or disable two-factor; returns fresh recovery codes when new."""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return _bad({"detail": "Invalid JSON body."})

    import hashlib
    import secrets

    import pyotp

    from .models import TwoFactor, TwoFactorRecoveryCode

    action = payload.get("action")
    code = (payload.get("code") or "").strip().replace(" ", "")
    two = TwoFactor.objects.filter(user=request.user).first()
    fresh_codes = None

    if action == "enable":
        secret = two.secret if (two and not two.enabled) else pyotp.random_base32()
        two, _ = TwoFactor.objects.get_or_create(
            user=request.user, defaults={"secret": secret}
        )
        if two.enabled:
            return _bad({"detail": "Two-factor is already on."})
        if not pyotp.TOTP(two.secret).verify(code, valid_window=1):
            return _bad({"detail": "That code did not match — scan the QR and try again."})
        two.enabled = True
        two.save(update_fields=["enabled"])
        TwoFactorRecoveryCode.objects.filter(two_factor=two, used_at__isnull=True).delete()
        fresh_codes = [
            secrets.token_hex(2) + "-" + secrets.token_hex(2) for _ in range(10)
        ]
        for raw in fresh_codes:
            TwoFactorRecoveryCode.objects.create(
                two_factor=two,
                code_hash=hashlib.sha256(raw.lower().encode()).hexdigest(),
            )
    elif action == "disable":
        if two and two.enabled and _verify_totp(request.user, code):
            TwoFactorRecoveryCode.objects.filter(two_factor=two).delete()
            two.delete()
        else:
            return _bad({"detail": "Wrong code — two-factor stays on."})
    else:
        return _bad({"detail": "Unknown action."})

    return JsonResponse({"action": action, "fresh_codes": fresh_codes})


# ---- password flows -------------------------------------------------------


@require_POST
@PASSWORD_RESET_LIMIT_CLIENT
def password_reset(request):
    """Always returns 200 — never reveals whether an account exists."""
    from django.contrib.auth import get_user_model
    from django.contrib.auth.forms import PasswordResetForm

    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return _bad({"email": ["Invalid request."]})
    email = (payload.get("email") or "").strip()
    User = get_user_model()
    form = PasswordResetForm(data={"email": email})
    if not form.is_valid():
        return _bad({k: [str(e) for e in v] for k, v in form.errors.items()})
    if form.get_users(email):
        form.save(
            request=request,
            email_template_name="registration/password_reset_email.html",
        )
    return JsonResponse({"ok": True})


@require_GET
def password_reset_check(request, uidb64, token):
    """Is this reset link valid? Drives the confirm page's invalid state."""
    from django.contrib.auth import get_user_model
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.http import urlsafe_base64_decode

    User = get_user_model()
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return JsonResponse({"valid": False})
    return JsonResponse(
        {"valid": default_token_generator.check_token(user, token)}
    )


@require_POST
def password_reset_confirm(request, uidb64, token):
    from django.contrib.auth import get_user_model
    from django.contrib.auth.forms import SetPasswordForm
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.http import urlsafe_base64_decode

    User = get_user_model()
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return _bad({"non_field_errors": ["This password reset link is invalid."]})

    if not default_token_generator.check_token(user, token):
        return _bad({"non_field_errors": ["This password reset link is invalid or has expired."]})

    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return _bad({"non_field_errors": ["Invalid JSON body."]})
    form = SetPasswordForm(
        user,
        data={
            "new_password1": payload.get("new_password1") or "",
            "new_password2": payload.get("new_password2") or "",
        },
    )
    if not form.is_valid():
        return _bad({k: [str(e) for e in v] for k, v in form.errors.items()})
    form.save()
    return JsonResponse({"ok": True})


@require_POST
def password_change(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    from django.contrib.auth.forms import PasswordChangeForm

    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return _bad({"detail": "Invalid JSON body."})
    form = PasswordChangeForm(
        request.user,
        data={
            "old_password": payload.get("old_password") or "",
            "new_password1": payload.get("new_password1") or "",
            "new_password2": payload.get("new_password2") or "",
        },
    )
    if not form.is_valid():
        return _bad({k: [str(e) for e in v] for k, v in form.errors.items()})
    form.save()
    from django.contrib.auth import update_session_auth_hash

    update_session_auth_hash(request, form.user)
    return JsonResponse({"ok": True})


# ---- profile -------------------------------------------------------------


@require_GET
def profile(request):
    """Everything the profile page renders, in one payload."""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)

    from links.models import Link
    from rest_framework.authtoken.models import Token

    from .models import UserSettings

    settings_row = getattr(request.user, "user_settings", None)
    two_enabled = bool(getattr(request.user, "two_factor", None)) and request.user.two_factor.enabled
    others = _other_sessions(request)
    return JsonResponse(
        {
            "username": request.user.username,
            "email": request.user.email,
            "date_joined": timezone.localtime(request.user.date_joined).isoformat(),
            "link_count": Link.objects.filter(user=request.user).count(),
            "two_factor_enabled": two_enabled,
            "has_api_token": Token.objects.filter(user=request.user).exists(),
            "weekly_digest": bool(settings_row and settings_row.weekly_digest),
            "webhook_url": (settings_row.webhook_url if settings_row else ""),
            "other_sessions": [
                {
                    "expires": timezone.localtime(s["expires"]).strftime(
                        "%b %d, %H:%M"
                    )
                }
                for s in others
            ],
        }
    )


def _other_sessions(request):
    """Template-safe view of the user's *other* login sessions."""
    return [
        {"key": session.session_key, "expires": session.expire_date}
        for session in _user_sessions(request.user, exclude_key=request.session.session_key)
    ]


@require_POST
def profile_actions(request):
    """The profile page's POST actions, one endpoint per action kind."""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return _bad({"detail": "Invalid JSON body."})

    action = payload.get("action")
    from rest_framework.authtoken.models import Token

    if action == "create_api_key":
        token, _ = Token.objects.get_or_create(user=request.user)
        return JsonResponse({"token": token.key})
    if action == "revoke_api_key":
        Token.objects.filter(user=request.user).delete()
        return JsonResponse({"ok": True})
    if action == "sign_out_elsewhere":
        from django.contrib.sessions.models import Session

        current = request.session.session_key
        killed = 0
        for session in _user_sessions(request.user):
            if session.session_key != current:
                session.delete()
                killed += 1
        return JsonResponse({"killed": killed})
    if action == "digest":
        from .models import UserSettings

        want = bool(payload.get("weekly_digest"))
        settings_row, _ = UserSettings.objects.get_or_create(user=request.user)
        if bool(settings_row.weekly_digest) != want:
            settings_row.weekly_digest = want
            settings_row.save(update_fields=["weekly_digest"])
        return JsonResponse({"weekly_digest": want})
    if action == "webhook":
        from django.core.exceptions import ValidationError

        from .models import UserSettings

        url = (payload.get("webhook_url") or "").strip()
        settings_row, _ = UserSettings.objects.get_or_create(user=request.user)
        settings_row.webhook_url = url
        try:
            if url and not url.startswith("https://"):
                raise ValidationError("Click webhooks must be https:// URLs.")
            settings_row.full_clean()
            settings_row.save(update_fields=["webhook_url"])
        except ValidationError:
            settings_row.refresh_from_db()
            return _bad({"detail": "Could not save that webhook URL — use an https:// URL."})
        return JsonResponse({"webhook_url": url})
    return _bad({"detail": "Unknown action."})


@require_POST
def delete_account(request):
    """Two-step confirmation; step 2 hard-deletes the user row."""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    try:
        payload = json.loads(request.body.decode() or "{}")
    except json.JSONDecodeError:
        return _bad({"detail": "Invalid JSON body."})

    if payload.get("confirm_deletion"):
        from django.contrib.auth import get_user_model

        row = get_user_model().objects.get(pk=request.user.pk)
        username = row.username
        row.delete()
        auth_logout(request)
        return JsonResponse({
            "deleted": username,
            "message": (
                f"Account {username} and all its links, analytics, and settings were deleted."
            ),
        })
    return JsonResponse(
        {"link_count": request.user.links.count(), "stage": "confirm"}
    )


@require_GET
def mcp_docs(request):
    """Tool summaries for the MCP reference page (from the server's TOOLS)."""
    from links.webapi import _mcp_tool_summaries

    return JsonResponse({"tools": _mcp_tool_summaries()})
