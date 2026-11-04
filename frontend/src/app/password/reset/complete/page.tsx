import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck } from "lucide-react";

import { AuthShell } from "@/components/ui";

export const metadata: Metadata = { title: "Password reset complete" };

export default async function PasswordResetCompletePage() {
  return (
    <AuthShell>
      <div className="vn-card is-raised text-center">
        <span className="vn-avatar mx-auto grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success">
          <CircleCheck className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h1 className="heading mt-4 text-ink">Password reset complete</h1>
        <p className="mt-1.5 body-sm text-ink-soft">You can now log in with your new password.</p>
        <Link href="/accounts/login/" className="vn-btn vn-btn-primary mt-5">
          Log in
        </Link>
      </div>
    </AuthShell>
  );
}
