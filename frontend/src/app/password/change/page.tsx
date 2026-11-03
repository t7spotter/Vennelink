import type { Metadata } from "next";
import Link from "next/link";

import { ChangePasswordForm } from "@/components/auth/PasswordForms";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Change password" };

export default async function PasswordChangePage() {
  await requireUser("/password/change/");
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Link href="/accounts/profile" className="vn-btn vn-btn-quiet -ml-3 mb-6">
        <span aria-hidden="true">←</span> Back to profile
      </Link>
      <ChangePasswordForm />
    </div>
  );
}
