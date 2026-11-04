from django.urls import include, path, re_path

from analytics import views as analytics_views, webapi as analytics_webapi
from . import views, webapi

urlpatterns = [
    path("", views.landing, name="landing"),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("dashboard/links/table/", views.link_table, name="link_table"),
    path("dashboard/links/import/", views.link_import, name="link_import"),
    path("dashboard/links/export.csv", views.link_export, name="link_export"),
    path("dashboard/links/new/", views.link_create, name="link_create"),
    path("dashboard/links/bulk/", views.link_bulk, name="link_bulk"),
    path("dashboard/links/<str:code>/edit/", views.link_edit, name="link_edit"),
    path("dashboard/links/<str:code>/transfer/", views.link_transfer, name="link_transfer"),
    path("dashboard/links/<str:code>/toggle/", views.link_toggle, name="link_toggle"),
    path("dashboard/links/<str:code>/delete/", views.link_delete, name="link_delete"),
    path("dashboard/links/<str:code>/restore/", views.link_restore, name="link_restore"),
    path("dashboard/links/<str:code>/purge/", views.link_purge, name="link_purge"),
    path("dashboard/links/<str:code>/analytics/", analytics_views.link_analytics, name="link_analytics"),
    path("dashboard/links/<str:code>/analytics.csv", analytics_views.link_analytics_csv, name="link_analytics_csv"),
    path("webapi/analytics/<str:code>/", analytics_webapi.link_analytics, name="webapi_analytics"),
    path("webapi/public/<str:code>/", analytics_webapi.public_stats, name="webapi_public_stats"),
    path("stats/<str:code>", analytics_views.public_stats, name="public_stats"),
    # Docs pages (human-level API & MCP reference pages). Two segments, so
    # they cannot collide with the single-segment catch-all below.
    path("docs/api/", views.docs_api, name="docs_api"),
    path("docs/mcp/", views.docs_mcp, name="docs_mcp"),
    # QR for a short code. Must stay above the catch-all redirect route.
    re_path(r"^(?P<code>[a-z0-9][a-z0-9-]{1,30})\.qr\.svg$", views.link_qr, name="link_qr"),
    # JSON websurface endpoints for the React frontend (links/webapi.py).
    # Fixed segments must come before the parameterized detail route.
    path("webapi/dashboard/", webapi.dashboard_payload, name="webapi_dashboard"),
    path("webapi/links/", webapi.links_table, name="webapi_links_table"),
    path("webapi/links/create/", webapi.link_create, name="webapi_link_create"),
    path("webapi/links/import/", webapi.link_import, name="webapi_link_import"),
    path("webapi/links/bulk/", webapi.link_bulk, name="webapi_link_bulk"),
    path("webapi/links/<str:code>/", webapi.link_detail, name="webapi_link_detail"),
    path("webapi/links/<str:code>/update/", webapi.link_update, name="webapi_link_update"),
    path("webapi/links/<str:code>/toggle/", webapi.link_toggle, name="webapi_link_toggle"),
    path("webapi/links/<str:code>/trash/", webapi.link_trash, name="webapi_link_trash"),
    path("webapi/links/<str:code>/restore/", webapi.link_restore, name="webapi_link_restore"),
    path("webapi/links/<str:code>/purge/", webapi.link_purge, name="webapi_link_purge"),
    path("webapi/links/<str:code>/transfer/", webapi.link_transfer, name="webapi_link_transfer"),
    path("webapi/site/", webapi.site_payload, name="webapi_site"),
    # This must stay last: it is the catch-all public redirect route.
    # Reserved Django namespaces (admin/api/mcp, defined in config.urls)
    # are excluded so they resolve as Django URLs both directly and
    # through the frontend proxy's slash normalization.
    re_path(
        r"^(?!(?:admin|api|mcp)(?:/|$))(?P<code>[^/]+)$",
        views.redirect_view,
        name="redirect",
    ),
]
