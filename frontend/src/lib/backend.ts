/**
 * Server-side data fetching for pages: every payload goes through Django's
 * /webapi/* endpoints with the visitor's cookies attached.
 */

import { ApiError, apiServer } from "@/lib/api";
import { outgoingCookies } from "@/lib/auth";
import type { ProfilePayload } from "@/types/api";

/** Fetch a GET endpoint from Django with the visitor's cookies. */
export async function webApiServer<T>(path: string): Promise<T> {
  return apiServer<T>(path, { cookie: await outgoingCookies() });
}

/** True when the visitor holds an authenticated Django session. */
export async function checkSignedIn(): Promise<boolean> {
  try {
    await apiServer<ProfilePayload>("/webapi/me/profile/", {
      cookie: await outgoingCookies(),
    });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false;
    throw error;
  }
}
