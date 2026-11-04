import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AuthLockup } from "@/components/auth/AuthLockup";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthShell, Notice } from "@/components/ui";
import { CircleAlert } from "lucide-react";
import { checkSignedIn, webApiServer } from "@/lib/backend";
import type { SitePayload } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await checkSignedIn()) {
    redirect("/dashboard/");
  }
  const site = await webApiServer<SitePayload>("/webapi/site/");
  if (!site.registration_enabled) {
    return (
      <AuthShell>
        <AuthLockup size="h-8" />
        <Notice tone="warning" icon={CircleAlert}>
          Registration is disabled on this installation.
        </Notice>
        <p className="mt-6 text-center body-sm text-ink-soft">
          Already have an account?{" "}
          <a href="/accounts/login/" className="font-semibold hover:underline">
            Log in
          </a>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthLockup size="h-8" />
      <RegisterForm googleOauth={site.google_oauth} />
      <p className="mt-6 text-center body-sm text-ink-soft">
        Already have an account?{" "}
        <a href="/accounts/login/" className="font-semibold hover:underline">
          Log in
        </a>
      </p>
    </AuthShell>
  );
}
