import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AuthLockup } from "@/components/auth/AuthLockup";
import { TwoFactorForm } from "@/components/auth/TwoFactorForm";
import { AuthShell } from "@/components/ui";
import { apiServer } from "@/lib/api";
import { outgoingCookies } from "@/lib/auth";
import type { ProfilePayload } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Two-factor check" };

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Django only keeps the pending 2FA session key after a password login;
  // anyone fully signed in should just be on the dashboard. `await
  // cookies()` must happen inside the request scope, so do the check here
  // rather than in a helper that closes over nothing.
  try {
    await apiServer<ProfilePayload>("/webapi/me/profile/", {
      cookie: await outgoingCookies(),
    });
    redirect("/dashboard/");
  } catch {
    // Not signed in yet — that is the expected state on this page.
  }
  const { next } = await searchParams;
  return (
    <AuthShell>
      <AuthLockup size="h-8" />
      <TwoFactorForm next={next || ""} />
    </AuthShell>
  );
}
