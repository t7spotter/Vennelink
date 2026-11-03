import type { Metadata } from "next";

import { AuthShell } from "@/components/ui";
import { ResetConfirmForm, ResetInvalid } from "@/components/auth/PasswordForms";
import { apiServer } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Set new password" };

interface CheckPayload {
  valid: boolean;
}

export default async function PasswordResetConfirmPage({
  params,
}: {
  params: Promise<{ uidb64: string; token: string }>;
}) {
  const { uidb64, token } = await params;
  // Django decides whether the token still works; the page renders either
  // the password form or the invalid-link card.
  let valid = false;
  try {
    const data = await apiServer<CheckPayload>(
      `/webapi/auth/password/reset/check/${uidb64}/${token}/`,
    );
    valid = data.valid;
  } catch {
    valid = false;
  }

  return (
    <AuthShell>
      {valid ? (
        <ResetConfirmForm uidb64={uidb64} token={token} />
      ) : (
        <ResetInvalid />
      )}
    </AuthShell>
  );
}
