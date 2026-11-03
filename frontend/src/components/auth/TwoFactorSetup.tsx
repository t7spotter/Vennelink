"use client";

/**
 * 2FA setup: scan-and-confirm when off, disable-with-code when on, and
 * the show-once recovery codes grid after enabling (coral card).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck, CircleAlert } from "lucide-react";

import { Notice, Button } from "@/components/ui";
import { apiMutate, ApiError } from "@/lib/api";

const AlertGlyph = CircleAlert;

interface SetupResponse {
  action: "enable" | "disable";
  fresh_codes: string[] | null;
}

interface StatePayload {
  enabled: boolean;
  secret: string;
}

export function TwoFactorSetup({ initial }: { initial: StatePayload }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [freshCodes, setFreshCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(action: "enable" | "disable", code: string) {
    setBusy(true);
    setError("");
    try {
      const data = await apiMutate<SetupResponse>("/webapi/auth/two-factor/setup/", {
        body: { action, code },
      });
      if (data.action === "enable") {
        setEnabled(true);
        setFreshCodes(data.fresh_codes || []);
      } else {
        setEnabled(false);
        setFreshCodes([]);
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.errors.detail?.[0] || "Something went wrong — try again."
          : "Something went wrong — try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div role="alert">
          <Notice tone="danger" icon={AlertGlyph}>
            {error}
          </Notice>
        </div>
      ) : null}

      {enabled ? (
        <div className="vn-notice vn-notice-success mt-6">
          <ShieldCheck className="vn-notice-icon h-5 w-5" strokeWidth={1.75} />
          <div className="vn-notice-body">
            <p className="vn-notice-title">Two-factor is protecting this account</p>
            <p className="vn-notice-text">
              Logins need a code from your authenticator app (or a recovery code).
            </p>
            <form
              className="vn-notice-action flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void submit("disable", String(form.get("code") || ""));
              }}
            >
              <input
                type="text"
                name="code"
                inputMode="numeric"
                maxLength={7}
                placeholder="Current code to confirm"
                className="vn-input w-56"
              />
              <Button variant="secondary" size="sm" type="submit" disabled={busy}>
                Turn off
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="vn-card mt-6">
          <h2 className="subheading text-ink">Scan with your authenticator, then confirm</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5 body-sm text-ink-soft">
            <li>Open your authenticator app (Aegis, 1Password, Google Authenticator, …).</li>
            <li>
              Scan this QR code — or add the key{" "}
              <code className="rounded-sm bg-mist px-1.5 py-0.5 font-mono caption text-ink">
                {initial.secret}
              </code>
              .
            </li>
            <li>Enter the 6-digit code it shows to prove the link.</li>
          </ol>
          <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            {/* The QR stays a Django endpoint — it encodes the user's secret. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/accounts/two-factor/qr.svg"
              alt="2FA QR code"
              width={180}
              height={180}
              className="rounded-md border border-line bg-surface p-2"
            />
            <form
              className="flex w-full items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void submit("enable", String(form.get("code") || ""));
              }}
            >
              <input
                type="text"
                name="code"
                inputMode="numeric"
                maxLength={7}
                placeholder="123456"
                required
                autoFocus
                className="vn-input w-40 font-mono"
              />
              <Button type="submit" disabled={busy}>
                Enable
              </Button>
            </form>
          </div>
        </div>
      )}

      {freshCodes.length > 0 ? (
        <div className="vn-card is-raised mt-6 border-coral-soft bg-coral-soft">
          <h2 className="subheading text-ink">Recovery codes — shown once, store them now</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono caption text-ink">
            {freshCodes.map((code) => (
              <li key={code} className="truncate">
                {code}
              </li>
            ))}
          </ul>
          <p className="mt-3 caption text-ink-soft">
            Each works exactly once if your authenticator is lost. Only hashes are kept on the server.
          </p>
        </div>
      ) : null}

      <Link href="/accounts/profile" className="vn-btn vn-btn-quiet -ml-3 mt-8">
        <span aria-hidden="true">←</span> Back to profile
      </Link>
    </div>
  );
}
