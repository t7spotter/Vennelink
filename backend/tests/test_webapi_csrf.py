"""Regression tests for SPA CSRF handling.

The React client reads the csrftoken cookie with document.cookie and sends
it back as X-CSRFToken (see frontend/src/lib/api.ts). Two bugs previously
made the client POST an empty X-CSRFToken against a non-empty csrftoken
cookie, so Django 403'd every mutation:

1. CSRF_COOKIE_HTTPONLY defaulted to True, so the cookie was invisible to
   document.cookie -- the browser still sent it (explaining "cookie present
   in the request") but JavaScript could never read it.
2. csrfToken() fetched /webapi/csrf/ and then discarded the token returned
   in the response body, so the HttpOnly fallback never had a chance.

These tests pin the contract the SPA depends on: a JS-readable cookie, a
body token that matches it, and create working when the token comes from
either source -- plus 403 when it isn't sent at all.

Note: the conftest `client` fixture does NOT enforce CSRF (Django's test
client defaults to enforce_csrf_checks=False), so these tests construct
their own client with enforcement on to exercise the real middleware.
"""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings

from links.models import Link

pytestmark = pytest.mark.django_db

CREATE_URL = "/webapi/links/create/"
CSRF_URL = "/webapi/csrf/"
PAYLOAD = {"destination": "https://example.com/page", "code": "csrf-e2e"}


@pytest.fixture
def secure_client(db):
    """A CSRF-enforcing, authenticated client -- the browser environment."""
    get_user_model().objects.create_user(
        username="alice",
        email="alice@example.com",
        password="correct-horse-42",
    )
    c = Client(enforce_csrf_checks=True)
    c.login(username="alice", password="correct-horse-42")
    return c


@pytest.fixture
def csrf_client(secure_client):
    """Client that has done the GET /webapi/csrf/ step like every SPA flow."""
    response = secure_client.get(CSRF_URL)
    assert response.status_code == 200
    return secure_client


def _cookie_token(client):
    """The token as the browser's JS would read it from document.cookie."""
    return client.cookies["csrftoken"].value


def test_csrf_cookie_is_readable_by_javascript(client):
    """CSRF_COOKIE_HTTPONLY must default off: HttpOnly hides the cookie
    from document.cookie, so the SPA sends an empty X-CSRFToken header
    while the cookie still rides along -- 403s on every mutation."""
    client.get(CSRF_URL)
    cookie = client.cookies["csrftoken"]
    assert not cookie["httponly"], (
        "With HttpOnly the React client cannot read the CSRF token; "
        "every mutation would fail 'CSRF verification failed'"
    )


def test_csrf_endpoint_body_token_is_accepted_as_header(csrf_client):
    """The JSON body carries a usable token. In Django >= 5 the cookie
    stores the raw CSRF secret while get_token() returns a *masked*
    (randomly padded per call) variant, so cookie value and body token
    never compare byte-equal -- what the SPA needs is merely that the
    header built from the body works, which is asserted below."""
    body = csrf_client.get(CSRF_URL).json()
    token = body["token"]
    cookie = _cookie_token(csrf_client)
    assert token and cookie
    # Per-call random padding, but both encode the same 32-char secret.
    assert len(token) == 64
    assert len(cookie) == 32
    response = csrf_client.post(
        CREATE_URL,
        PAYLOAD,
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert response.status_code == 201


def test_create_without_token_is_rejected(csrf_client):
    """Django must not let header-less mutations through."""
    response = csrf_client.post(
        CREATE_URL, PAYLOAD, content_type="application/json"
    )
    assert response.status_code == 403
    assert not Link.objects.filter(code="csrf-e2e").exists()


def test_create_with_cookie_token_succeeds(csrf_client):
    """Simulate the SPA flow: GET /webapi/csrf/, read csrftoken from the
    cookie jar (document.cookie, now that it is non-HttpOnly), send it as
    X-CSRFToken with cookies attached -> create succeeds with 201."""
    token = _cookie_token(csrf_client)
    assert token, "cookie unreadable even though HttpOnly is off"
    response = csrf_client.post(
        CREATE_URL,
        PAYLOAD,
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert response.status_code == 201
    link = Link.objects.get(code="csrf-e2e")
    assert response.json()["link"]["code"] == "csrf-e2e"
    assert link.user.get_username() == "alice"


@override_settings(CSRF_COOKIE_HTTPONLY=True)
def test_create_with_body_token_succeeds_under_httponly(secure_client):
    """Deployments that really do want an HttpOnly cookie still work:
    csrfToken() falls back to the /webapi/csrf/ response body token when
    document.cookie can't read the cookie. Simulate exactly that: take
    the token from the JSON body, never read document.cookie."""
    body = secure_client.get(CSRF_URL).json()
    assert secure_client.cookies["csrftoken"]["httponly"]  # HttpOnly env
    token = body["token"]
    assert token, "the body fallback is what makes HttpOnly deployable"
    response = secure_client.post(
        CREATE_URL,
        PAYLOAD,
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert response.status_code == 201
    assert Link.objects.get(code="csrf-e2e").destination == PAYLOAD["destination"]
