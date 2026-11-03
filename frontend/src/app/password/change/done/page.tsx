import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck } from "lucide-react";

import { AuthShell } from "@/components/ui";

export const metadata: Metadata = { title: "Password changed" };

export default async function PasswordChangeDonePage() {
  return (
    <AuthShell>
      <div className="text-center">
        <span className="vn-avatar mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
          <CircleCheck className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <h1 className="title mt-5 text-ink">Password changed</h1>
        <p className="mt-2 body-sm text-ink-soft">Your password has been updated.</p>
        <Link href="/accounts/profile" className="vn-btn vn-btn-primary mt-6">
          Back to profile
        </Link>
      </div>
    </AuthShell>
  );
}
