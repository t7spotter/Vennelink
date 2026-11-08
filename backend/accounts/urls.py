from django.contrib.auth import views as auth_views
from django.urls import path

from . import views, webapi

urlpatterns = [
    path("accounts/register/", views.register, name="register"),
    path("accounts/login/", views.login_view, name="login"),
    path("accounts/login/google/", views.google_login, name="google_login"),
    path("accounts/login/google/callback/", views.google_callback, name="google_callback"),
    path("accounts/two-factor/", views.two_factor_view, name="two_factor"),
    path("accounts/two-factor/setup/", views.two_factor_setup, name="two_factor_setup"),
    path("accounts/two-factor/qr.svg", views.two_factor_qr, name="two_factor_qr"),
    path("accounts/logout/", views.logout_view, name="logout"),
    path("accounts/profile/", views.profile, name="profile"),
    path("accounts/export/", views.export_data, name="export_data"),
    path("accounts/delete/", views.delete_account, name="delete_account"),
    # JSON websurface endpoints for the React frontend (accounts/webapi.py).
    path("webapi/csrf/", webapi.csrf, name="webapi_csrf"),
    path("webapi/auth/login/", webapi.login, name="webapi_login"),
    path("webapi/auth/register/", webapi.register, name="webapi_register"),
    path("webapi/auth/logout/", webapi.logout, name="webapi_logout"),
    path("webapi/auth/two-factor/", webapi.two_factor, name="webapi_two_factor"),
    path("webapi/auth/two-factor/state/", webapi.two_factor_state, name="webapi_2fa_state"),
    path("webapi/auth/two-factor/setup/", webapi.two_factor_setup, name="webapi_2fa_setup"),
    path("webapi/auth/password/change/", webapi.password_change, name="webapi_password_change"),
    path("webapi/auth/password/reset/", webapi.password_reset, name="webapi_password_reset"),
    path("webapi/auth/password/reset/check/<str:uidb64>/<str:token>/", webapi.password_reset_check, name="webapi_password_reset_check"),
    path("webapi/auth/password/reset/confirm/<str:uidb64>/<str:token>/", webapi.password_reset_confirm, name="webapi_password_reset_confirm"),
    path("webapi/me/profile/", webapi.profile, name="webapi_profile"),
    path("webapi/me/profile/actions/", webapi.profile_actions, name="webapi_profile_actions"),
    path("webapi/me/delete/", webapi.delete_account, name="webapi_delete_account"),
    path("webapi/mcp-docs/", webapi.mcp_docs, name="webapi_mcp_docs"),
    path(
        "password/change/",
        auth_views.PasswordChangeView.as_view(template_name="registration/password_change.html"),
        name="password_change",
    ),
    path(
        "password/change/done/",
        auth_views.PasswordChangeDoneView.as_view(
            template_name="registration/password_change_done.html"
        ),
        name="password_change_done",
    ),
    path(
        "password/reset/",
        auth_views.PasswordResetView.as_view(template_name="registration/password_reset.html"),
        name="password_reset",
    ),
    path(
        "password/reset/done/",
        auth_views.PasswordResetDoneView.as_view(
            template_name="registration/password_reset_done.html"
        ),
        name="password_reset_done",
    ),
    path(
        "password/reset/<uidb64>/<token>/",
        auth_views.PasswordResetConfirmView.as_view(
            template_name="registration/password_reset_confirm.html"
        ),
        name="password_reset_confirm",
    ),
    path(
        "password/reset/complete/",
        auth_views.PasswordResetCompleteView.as_view(
            template_name="registration/password_reset_complete.html"
        ),
        name="password_reset_complete",
    ),
]
