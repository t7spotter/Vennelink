import type { Metadata } from "next";

import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";
import { webApiServer } from "@/lib/backend";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Two-factor authentication" };

interface TwoFactorState {
  enabled: boolean;
  secret: string;
}

export default async function TwoFactorSetupPage() {
  await requireUser(`/accounts/two-factor/setup/`);
  const state = await webApiServer<TwoFactorState>("/webapi/auth/two-factor/state/");
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <nav className="mono-sm mb-2 text-ink-soft" aria-label="Breadcrumb">
        <a href="/accounts/profile" className="hover:underline">
          Profile
        </a>{" "}
        / Two-factor
      </nav>
      <h1 className="title text-ink">Two-factor authentication</h1>
      <TwoFactorSetup initial={state} />
    </main>
  );
}
