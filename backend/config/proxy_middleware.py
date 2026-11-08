"""Restore the trailing slash the Next.js proxy strips.

The frontend's same-origin proxy (next.config.ts afterFiles rewrite)
forwards URLs to Django verbatim (skipTrailingSlashRedirect), but Deep
links and client code can still send slash-less paths, so Django is
protected here: the slash is appended to path_info only when the
slash-less path does not yield a usable match while the slash-ful one
does.

"Usable" matters because Django's admin registers a final catch-all
(``re_path(r"(?P<url>.*)$", admin_view(catch_all_view))``) that matches
every path, and its admin_view wrapper bounces anonymous users to the
login page with ``next=request.get_full_path()`` — which, on a
slash-less arrival, re-encodes the query string into itself and loops.
The wrapper carries ``should_append_slash=False`` (via no_append_slash),
so a match sporting that flag is treated as "not usable" here and the
slash-ful resolution wins instead.
"""

from django.http import HttpRequest
from django.urls import Resolver404, resolve


class ProxySlashFixMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest):
        path = request.path_info
        if not path.endswith("/") and "." not in path.rsplit("/", 1)[-1]:
            usable = False
            try:
                match = resolve(path)
            except Resolver404:
                pass
            else:
                # Catch-alls marked no_append_slash (Django admin) defer
                # to slash restoration, which must happen here because
                # their permission wrapper fires first.
                usable = getattr(match.func, "should_append_slash", True)
            if not usable:
                try:
                    resolve(f"{path}/")
                except Resolver404:
                    return self.get_response(request)
                request.path_info = f"{path}/"
        return self.get_response(request)
