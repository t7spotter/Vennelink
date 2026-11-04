"use client";

/**
 * Sign-in step 2: a TOTP code, or a recovery code via the details panel.
 * Django holds the pending 2FA session key; this page just posts it back.
 */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CircleAlert } from "lucide-react";

import { Notice } from "@/components/ui";
import { apiMutate, ApiError } from "@/lib/api";

const AlertGlyph = CircleAlert;

export function TwoFactorForm({ next }: { next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recoveryRef = useRef<HTMLInputElement>(null);

  async function verify(code: string, recovery = "") {
    setBusy(true);
    setError("");
    try {
      const data = await apiMutate<{ status: string; path: string }>(
        "/webapi/auth/two-factor/",
        { body: { code, recovery, next } },
      );
      router.push(data.path || "/dashboard/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.errors.detail?.[0] || err.errors.non_field_errors?.[0] || "Check the code and try again."
          : "Something went wrong — try again.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="vn-card is-raised">
      <h1 className="heading text-ink">Two-factor check</h1>
      <p className="body-sm text-ink-soft">
        Enter the 6-digit code from your authenticator app.
      </p>

      {error ? (
        <div role="alert">
          <Notice tone="danger" icon={AlertGlyph}>
            {error}
          </Notice>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void verify(String(form.get("code") || ""));
        }}
        className="flex flex-col gap-4"
        autoComplete="off"
      >
        <div className="vn-field">
          <label htmlFor="id_code" className="vn-field-label">
            <span>Authenticator code</span>
          </label>
          <input
            id="id_code"
            name="code"
            inputMode="numeric"
            pattern="[0-9 ]*"
            maxLength={7}
            autoFocus
            placeholder="123456"
            className="vn-input text-center font-mono text-lg tracking-[0.4em]"
          />
        </div>
        <button type="submit" className="vn-btn vn-btn-primary vn-btn-block" disabled={busy}>
          {busy ? "Verifying…" : "Verify"}
        </button>
      </form>

      <details className="border-t border-line pt-4">
        <summary className="cursor-pointer select-none body-sm font-semibold text-ink-soft hover:text-ink">
          Lost your device?
        </summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void verify("", String(recoveryRef.current?.value || ""));
          }}
          className="mt-3 flex flex-col gap-3"
          autoComplete="off"
        >
          <input
            ref={recoveryRef}
            type="text"
            name="recovery"
            placeholder="Recovery code"
            required
            className="vn-input font-mono"
          />
          <button type="submit" className="vn-btn vn-btn-secondary vn-btn-block" disabled={busy}>
            Use a recovery code
          </button>
        </form>
      </details>
    </div>
  );
}
