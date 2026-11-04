import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AuthLockup } from "@/components/auth/AuthLockup";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthShell } from "@/components/ui";
import { checkSignedIn, webApiServer } from "@/lib/backend";
import type { SitePayload } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Django mirrors the old template view: signed-in visitors skip to the
  // dashboard; the login page itself is never shown.
  if (await checkSignedIn()) {
    redirect("/dashboard/");
  }
  const [{ next }, site] = await Promise.all([
    searchParams,
    webApiServer<SitePayload>("/webapi/site/"),
  ]);

  return (
    <AuthShell>
      <AuthLockup />
      <LoginForm next={next || ""} googleOauth={site.google_oauth} />
      <p className="mt-6 text-center body-sm text-ink-soft">
        New to this installation?{" "}
        <a href="/accounts/register/" className="font-semibold hover:underline">
          Create an account
        </a>
      </p>
    </AuthShell>
  );
}
