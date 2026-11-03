import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/ui";
import { ResetRequestForm } from "@/components/auth/PasswordForms";

export const metadata: Metadata = { title: "Reset password" };

export default async function PasswordResetPage() {
  return (
    <AuthShell>
      <ResetRequestForm />
      <p className="mt-6 text-center body-sm text-ink-soft">
        <Link href="/accounts/login/" className="font-semibold hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}
