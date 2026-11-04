/**
 * Server-side session helper: pages that need a signed-in user call the
 * backend with the visitor's cookies and redirect to login when Django
 * says 401. Django remains the authority on authentication.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, apiServer } from "@/lib/api";
import type { ProfilePayload } from "@/types/api";

/** Pass-through of the visitor's session + CSRF cookies (async in Next 15). */
export async function outgoingCookies(): Promise<string> {
  const jar = await cookies();
  return ["sessionid", "csrftoken"]
    .map((name) => {
      const value = jar.get(name)?.value;
      return value ? `${name}=${value}` : null;
    })
    .filter(Boolean)
    .join("; ");
}

/**
 * Fetch the signed-in user header data for a protected page. Redirects
 * anonymous visitors to the login page with the current path as ?next=.
 */
export async function requireUser(nextPath?: string): Promise<ProfilePayload> {
  try {
    return await apiServer<ProfilePayload>("/webapi/me/profile/", {
      cookie: await outgoingCookies(),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const next = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
      redirect(`/accounts/login/${next}`);
    }
    throw error;
  }
}
