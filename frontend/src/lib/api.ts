/**
 * Typed client for the Django backend.
 *
 * Client components call same-origin relative paths; the Next.js rewrite
 * proxies them to Django. Server components call the backend directly
 * with DJANGO_BACKEND_URL to avoid self-request loops, and forward the
 * visitor's session/CSRF cookies for authentication.
 */

import type { FieldErrors } from "@/types/api";

export const BACKEND_URL = process.env.DJANGO_BACKEND_URL || "http://127.0.0.1:8000";

/** Error thrown for non-2xx API responses; carries the field errors. */
export class ApiError extends Error {
  status: number;
  errors: FieldErrors;
  detail?: string;

  constructor(status: number, errors: FieldErrors, detail?: string) {
    super(detail || "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.detail = detail;
  }
}

export type JsonBody = Record<string, unknown>;

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFieldErrors(data: unknown): FieldErrors {
  // Backend error maps are {field: [msg]}; some endpoints return {detail: "..."}.
  if (isJsonObject(data)) {
    const errors: FieldErrors = {};
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) errors[key] = value.map(String);
      else if (typeof value === "string") errors[key] = [value];
    }
    return errors;
  }
  return {};
}

async function parseResponse<T>(response: Response): Promise<T> {
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // 204s and HTML error pages have no body we can use.
  }
  if (!response.ok) {
    const errors = asFieldErrors(data);
    const detail =
      isJsonObject(data) && typeof data.detail === "string"
        ? data.detail
        : undefined;
    throw new ApiError(response.status, errors, detail);
  }
  return data as T;
}

// ---- server side -----------------------------------------------------------

export interface ServerFetchInit {
  cookie?: string;
}

/** Fetch a GET endpoint from Django with the visitor's cookies. */
export async function apiServer<T>(
  path: string,
  { cookie }: ServerFetchInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });
  } catch {
    throw new ApiError(502, { detail: [`${path}: backend unreachable`] });
  }
  return parseResponse<T>(response);
}

// ---- client side -----------------------------------------------------------

const CSRF_COOKIE_NAME = "csrftoken";

function readCookie(name: string): string | null {
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

let csrfRequest: Promise<string> | null = null;

/** Read the Django CSRF token from the cookie, fetching one if absent. */
export async function csrfToken(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;
  if (!csrfRequest) {
    csrfRequest = fetch("/webapi/csrf/", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data: { token?: string }) => data.token || "")
      .catch(() => "")
      .finally(() => {
        csrfRequest = null;
      });
  }
  await csrfRequest;
  return readCookie(CSRF_COOKIE_NAME) || "";
}

export interface ClientFetchInit {
  method?: "GET" | "POST";
  body?: JsonBody | FormData;
}

/** Mutate via the same-origin proxy, with enforced CSRF headers. */
export async function apiMutate<T>(
  path: string,
  { method = "POST", body }: ClientFetchInit = {},
): Promise<T> {
  const token = await csrfToken();
  const headers: HeadersInit = {
    Accept: "application/json",
    "X-CSRFToken": token,
  };
  const init: RequestInit = { method, credentials: "same-origin" };
  if (body instanceof FormData) {
    init.body = body;
    // File uploads: the browser sets Content-Type and boundary itself.
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const response = await fetch(path, { ...init, headers });
  return parseResponse<T>(response);
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  return parseResponse<T>(response);
}
