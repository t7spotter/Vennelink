"use client";

/**
 * Profile page interactions: API key create/revoke (shown-once token),
 * sign-out-everywhere, weekly digest, webhook URL, the appearance tabs
 * (explicit theme choice instead of the sidebar's quick cycle), and the
 * paths toward password/2FA/deletion. Server-fetched profile data comes
 * in via props; every mutation is a CSRF-protected POST to /webapi/me/*.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, ShieldCheck, Webhook } from "lucide-react";

import { useTheme, type ThemePreference } from "@/components/theme/ThemeProvider";
import { LogoutButton } from "@/components/shell/AppShell";
import { Button, Notice, Tabs, useToast } from "@/components/ui";
import { useClipboard } from "@/lib/useClipboard";
import { apiMutate, ApiError } from "@/lib/api";
import { formatDate, intcomma } from "@/lib/format";
import type { ProfilePayload } from "@/types/api";

export function ProfileClient({ profile }: { profile: ProfilePayload }) {
  const router = useRouter();
  const show = useToast().show;
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { copy } = useClipboard();
  const [busy, setBusy] = useState(false);

  /** Accepts either {"action": ...} payloads or a bare action name. */
  async function action<T>(
    payload: Record<string, unknown> | string,
    onDone: (data: T) => void,
  ) {
    setBusy(true);
    try {
      const body = typeof payload === "string" ? { action: payload } : payload;
      const data = await apiMutate<T>("/webapi/me/profile/actions/", { body });
      onDone(data);
      router.refresh();
    } catch (error) {
      show(
        error instanceof ApiError
          ? error.errors.detail?.[0] || "That action failed."
          : "That action failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyToken(token: string) {
    await copy(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="vn-btn vn-btn-quiet -ml-3 mb-6">
        <span aria-hidden="true">←</span> Back to dashboard
      </Link>

      {/* Identity card */}
      <div className="vn-card">
        <div className="flex items-center gap-4">
          <span className="vn-avatar vn-avatar-violet h-14 w-14 text-xl">
            {profile.username.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="heading text-ink">{profile.username}</h1>
            <p className="body-sm text-ink-soft">{profile.email}</p>
          </div>
        </div>

        <dl className="mt-2 flex flex-col">
          <div className="vn-row">
            <dt className="vn-row-main">
              <span className="vn-row-desc">Member since</span>
            </dt>
            <dd className="vn-row-meta">{formatDate(profile.date_joined)}</dd>
          </div>
          <div className="vn-row">
            <dt className="vn-row-main">
              <span className="vn-row-desc">Links created</span>
            </dt>
            <dd className="vn-row-meta">{intcomma(profile.link_count)}</dd>
          </div>
        </dl>

        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/accounts/two-factor/setup" className="vn-btn vn-btn-secondary">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            {profile.two_factor_enabled ? "Two-factor is on" : "Enable two-factor"}
          </Link>
          <Link href="/password/change/" className="vn-btn vn-btn-secondary">
            <span aria-hidden="true">🔑</span> Change password
          </Link>
          <Link href="/password/reset/" className="vn-btn vn-btn-secondary">
            <span aria-hidden="true">💡</span> Forgot password
          </Link>
        </div>
      </div>

      <AppearanceCard />

      {/* API access */}
      <div className="vn-card mt-6">
        <h2 className="subheading text-ink">API access</h2>
        <p className="body-sm text-ink-soft">
          Use an API key to call the REST API (<code>Authorization: Bearer &lt;key&gt;</code>). See the{" "}
          <a href="/api/docs/" className="font-semibold underline underline-offset-2">
            API documentation
          </a>{" "}
          for every endpoint.
        </p>

        {newToken ? (
          <Notice tone="info" icon={KeyRound} title="Your API key — shown only this once">
            <div className="mt-2 flex items-center gap-2">
              <code className="mono min-w-0 flex-1 truncate text-ink">{newToken}</code>
              <button
                type="button"
                className="vn-btn vn-btn-sm vn-btn-secondary"
                onClick={() => void copyToken(newToken)}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </Notice>
        ) : null}

        {profile.has_api_token && !newToken ? (
          <>
            <p className="body-sm text-ink-soft">An API key exists for this account.</p>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                void action("revoke_api_key", () => {
                  show("API key revoked");
                  setNewToken(null);
                })
              }
            >
              Revoke API key
            </Button>
          </>
        ) : null}
        {!profile.has_api_token && !newToken ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void action<{ token: string }>("create_api_key", (data) => setNewToken(data.token))
            }
          >
            Create API key
          </Button>
        ) : null}
      </div>

      {/* Sessions */}
      <div className="vn-card mt-6">
        <h2 className="subheading text-ink">Active logins</h2>
        <p className="body-sm text-ink-soft">Browsers and devices currently signed into this account.</p>
        <ul className="flex flex-col">
          <li className="flex items-center justify-between rounded-sm bg-success-soft px-4 py-2.5">
            <span className="body-sm font-semibold text-success">This device</span>
            <span className="mono-sm text-success">current</span>
          </li>
          {profile.other_sessions.length === 0 ? (
            <li className="px-4 py-2.5 body-sm text-ink-soft">No other sign-ins for this account.</li>
          ) : (
            profile.other_sessions.map((session) => (
              <li
                key={session.expires}
                className="flex items-center justify-between rounded-sm bg-mist px-4 py-2.5"
              >
                <span className="body-sm text-ink">Other browser</span>
                <span className="mono-sm text-ink-soft">expires {session.expires}</span>
              </li>
            ))
          )}
        </ul>
        {profile.other_sessions.length > 0 ? (
          <Button
            variant="danger"
            disabled={busy}
            onClick={() =>
              void action<{ killed: number }>("sign_out_elsewhere", (data) =>
                show(
                  data.killed === 1
                    ? "Signed out 1 other session"
                    : `Signed out ${data.killed} other sessions`,
                ),
              )
            }
          >
            Sign out everywhere else
          </Button>
        ) : null}
      </div>

      {/* Weekly digest */}
      <div className="vn-card mt-6">
        <h2 className="subheading text-ink">Weekly digest</h2>
        <p className="body-sm text-ink-soft">
          An email every Monday with your top links and total non-bot clicks for the week.
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const want = form.get("weekly_digest") === "on";
            void action<{ weekly_digest: boolean }>(
              { action: "digest", weekly_digest: want },
              () => show("Digest preference saved"),
            );
          }}
        >
          <label className="cursor-pointer body-sm text-ink" htmlFor="weekly_digest">
            <input
              type="checkbox"
              name="weekly_digest"
              id="weekly_digest"
              defaultChecked={profile.weekly_digest}
            />{" "}
            Send me the weekly digest
          </label>
          <Button variant="secondary" type="submit" disabled={busy} className="mt-3">
            Save preference
          </Button>
        </form>
      </div>

      {/* Webhook */}
      <div className="vn-card mt-6">
        <h2 className="subheading text-ink">Click webhook</h2>
        <p className="body-sm text-ink-soft">
          One POST per recorded click (code, timestamp, device, variant — no IP addresses) to your HTTPS
          endpoint. Retries happen when{" "}
          <code className="rounded-sm bg-mist px-1 py-0.5 caption">flush_webhooks</code> runs.
        </p>
        <form
          className="vn-field"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void action<{ webhook_url: string }>(
              { action: "webhook", webhook_url: String(form.get("webhook_url") || "") },
              () => show("Webhook saved"),
            );
          }}
        >
          <input
            type="url"
            name="webhook_url"
            id="id_webhook_url"
            placeholder="https://example.com/hook"
            defaultValue={profile.webhook_url}
            className="vn-input"
          />
          <Button variant="secondary" type="submit" disabled={busy}>
            <Webhook className="h-4 w-4" strokeWidth={1.75} /> Save webhook
          </Button>
          {profile.webhook_url ? (
            <p className="vn-field-hint">
              Currently posting to <span className="break-all">{profile.webhook_url}</span>
            </p>
          ) : null}
        </form>
      </div>

      {/* Log out */}
      <div className="mt-6">
        <LogoutButton className="vn-btn vn-btn-secondary" />
      </div>
      {/* Data */}
      <div className="vn-card mt-6">
        <h2 className="subheading text-ink">Your data</h2>
        <p className="body-sm text-ink-soft">
          Download everything Vennelink holds about your account as one JSON file — links, click history, and
          settings.
        </p>
        <a href="/accounts/export/" className="vn-btn vn-btn-secondary">
          Download my data
        </a>
        <p className="body-sm text-ink-soft">
          Deleting your account permanently removes all links, analytics, and settings. You&apos;ll be asked
          to confirm.
        </p>
        <Link href="/accounts/delete" className="vn-btn vn-btn-danger">
          Delete account
        </Link>
      </div>
    </div>
  );
}

function AppearanceCard() {
  const { preference, setPreference } = useTheme();
  const options: ThemePreference[] = ["system", "light", "dark"];
  return (
    <div className="vn-card mt-6">
      <h2 className="subheading text-ink">Appearance</h2>
      <Tabs label="Theme selection" className="vn-tabs-block mt-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`vn-tab${preference === option ? " is-selected" : ""}`}
            onClick={() => setPreference(option)}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </Tabs>
    </div>
  );
}
