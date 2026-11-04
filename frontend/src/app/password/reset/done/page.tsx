import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { AuthShell } from "@/components/ui";

export const metadata: Metadata = { title: "Password reset sent" };

export default async function PasswordResetDonePage() {
  return (
    <AuthShell>
      <div className="text-center">
        <span className="vn-avatar mx-auto grid h-14 w-14 place-items-center rounded-full bg-violet-soft text-violet-ink">
          <MailCheck className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <h1 className="title mt-5 text-ink">Check your email</h1>
        <p className="mt-2 body-sm text-ink-soft">
          If an account exists for that email, we&apos;ve sent instructions for setting a new password.
        </p>
        <Link href="/accounts/login/" className="vn-btn vn-btn-primary mt-6">
          Back to log in
        </Link>
      </div>
    </AuthShell>
  );
}
