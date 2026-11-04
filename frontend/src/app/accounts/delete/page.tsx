import type { Metadata } from "next";

import { DeleteAccountFlow } from "@/components/auth/DeleteAccountFlow";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Delete account" };

export default async function DeleteAccountPage() {
  const profile = await requireUser("/accounts/delete/");
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <DeleteAccountFlow username={profile.username} />
    </div>
  );
}
