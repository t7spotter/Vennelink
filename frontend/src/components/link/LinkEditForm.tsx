"use client";

/**
 * Edit-link form (mirrors templates/pages/link_edit.html): destination,
 * A/B, title + private note, code/domain, tags, expiry/schedule pickers,
 * status & behavior switches, referrer allow-list, QR colors, gate
 * password — plus the ownership-transfer and delete sections at the
 * bottom. Django's LinkForm webapi payload stays the contract.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, TriangleAlert as AlertGlyph } from "lucide-react";

import { DateTimeField } from "@/components/form/DateTimeField";
import { notifyLinksChanged } from "@/components/dashboard/LinksSection";
import { Button, Notice, useToast } from "@/components/ui";
import { apiMutate, ApiError } from "@/lib/api";
import type { FieldErrors, LinkDetail } from "@/types/api";

interface UpdateResponse {
  link: LinkDetail;
  created: boolean;
}

export function LinkEditForm({
  link,
  siteUrl,
}: {
  link: LinkDetail;
  siteUrl: string;
}) {
  const router = useRouter();
  const show = useToast().show;
  const [form] = useState(link);
  const [expires, setExpires] = useState(link.expires_local || "");
  const [goesLive, setGoesLive] = useState(link.goes_live_local || "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [duplicateCode, setDuplicateCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedTick, setSavedTick] = useState(0);

  const tagString = link.tags.join(", ");
  const referrerString = link.allowed_referrers.join(", ");
  const fieldError = (name: string) => errors[name]?.[0];
  const formError = errors.non_field_errors?.[0];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const data = new FormData(event.currentTarget);
    try {
      await apiMutate<UpdateResponse>(`/webapi/links/${link.code}/update/`, {
        body: {
          destination: String(data.get("destination") || ""),
          variant_b: String(data.get("variant_b") || ""),
          title: String(data.get("title") || ""),
          notes: String(data.get("notes") || ""),
          code: String(data.get("code") || ""),
          domain: String(data.get("domain") || ""),
          tags: String(data.get("tags") || ""),
          expires_at: expires,
          goes_live_at: goesLive,
          is_active: data.get("is_active") === "on",
          permanent: data.get("permanent") === "on",
          public_stats: data.get("public_stats") === "on",
          public_hide_countries: data.get("public_hide_countries") === "on",
          allowed_referrers: String(data.get("allowed_referrers") || ""),
          qr_dark: String(data.get("qr_dark") || ""),
          qr_light: String(data.get("qr_light") || ""),
          password: String(data.get("password") || ""),
          remove_password: data.get("remove_password") === "on",
          confirm_duplicate: data.get("confirm_duplicate") === "on",
        },
      });
      setDuplicateCode(null);
      setSavedTick((tick) => tick + 1);
      show("Changes saved.");
      notifyLinksChanged();
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setDuplicateCode(error.errors.duplicate_code?.[0] || "");
        } else if (error.errors.errors) {
          setErrors(error.errors.errors as unknown as FieldErrors);
        } else {
          setErrors(error.errors);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vn-card">
      <h1 className="heading text-ink">Edit link</h1>
      <p className="body-sm text-ink-soft">
        <span className="font-mono font-medium text-violet-ink">{form.short_url}</span> →{" "}
        <span className="break-all">{form.destination}</span>
      </p>

      <form onSubmit={submit} className="flex flex-col gap-6 border-t border-line pt-6">
        {duplicateCode ? (
          <div role="alert">
            <Notice tone="warning" icon={AlertGlyph} title="Another short link already points here">
              <p>
                <a href={`/dashboard/links/${duplicateCode}/edit`} className="font-semibold text-ink underline">
                  /{duplicateCode}
                </a>{" "}
                already points to this destination. “Save changes” will now save anyway.
              </p>
            </Notice>
          </div>
        ) : null}

        {formError ? (
          <div role="alert">
            <Notice tone="danger" icon={AlertGlyph}>
              {formError}
            </Notice>
          </div>
        ) : null}

        <div className={`vn-field${fieldError("destination") ? " is-invalid" : ""}`}>
          <label htmlFor="id_destination" className="vn-field-label">
            <span>Destination URL</span>
          </label>
          <input
            type="text"
            inputMode="url"
            name="destination"
            id="id_destination"
            defaultValue={form.destination}
            required
            className="vn-input"
          />
          {fieldError("destination") ? <p className="vn-field-error">{fieldError("destination")}</p> : null}
        </div>

        <details className="rounded-md bg-mist px-4 py-3" open={!!form.variant_b}>
          <summary className="cursor-pointer select-none body-sm font-semibold text-ink">
            A/B split test
          </summary>
          <div className={`mt-3 vn-field${fieldError("variant_b") ? " is-invalid" : ""}`}>
            <label htmlFor="id_variant_b" className="vn-field-label">
              <span>Variant B destination</span>
              <span className="vn-field-opt">empty = no test</span>
            </label>
            <input
              type="text"
              inputMode="url"
              name="variant_b"
              id="id_variant_b"
              defaultValue={form.variant_b}
              className="vn-input"
            />
            <p className="vn-field-hint">
              Variant A is the destination above. When B is set, traffic is split roughly 50/50 and clicks
              are counted per variant.
            </p>
            {fieldError("variant_b") ? <p className="vn-field-error">{fieldError("variant_b")}</p> : null}
          </div>
        </details>

        <div className={`vn-field${fieldError("title") ? " is-invalid" : ""}`}>
          <label htmlFor="id_title" className="vn-field-label">
            <span>Title</span>
          </label>
          <input type="text" name="title" id="id_title" defaultValue={form.title} className="vn-input" />
          {fieldError("title") ? <p className="vn-field-error">{fieldError("title")}</p> : null}
        </div>

        <div className="vn-field">
          <label htmlFor="id_notes" className="vn-field-label">
            <span>Private note</span>
          </label>
          <textarea
            name="notes"
            id="id_notes"
            rows={2}
            className="vn-input"
            placeholder="Seen only by you (e.g. 'for the newsletter, kill on Friday')"
            defaultValue={form.notes}
          />
        </div>

        <div className={`vn-field${fieldError("code") ? " is-invalid" : ""}`}>
          <label htmlFor="id_code" className="vn-field-label">
            <span>Short code</span>
          </label>
          <div
            className={`flex items-stretch overflow-hidden rounded-md border bg-surface transition-colors ${
              fieldError("code") ? "border-danger" : "border-line-strong"
            } focus-within:border-violet`}
          >
            <span className="mono-sm whitespace-nowrap border-r border-line bg-mist px-3 leading-10 text-ink-soft">
              {siteUrl}/
            </span>
            <input
              type="text"
              name="code"
              id="id_code"
              defaultValue={form.code}
              autoComplete="off"
              spellCheck={false}
              className="w-full min-w-0 border-0 bg-transparent px-3 font-mono text-[15px] text-ink placeholder:text-ink-faint focus:shadow-none"
            />
          </div>
          <p className="vn-field-hint">Lowercase letters, numbers, and hyphens only.</p>
          {fieldError("code") ? <p className="vn-field-error">{fieldError("code")}</p> : null}
          {form.domain_choices.length > 1 ? (
            <div className="vn-field">
              <label htmlFor="id_domain" className="vn-field-label">
                <span>Domain</span>
              </label>
              <select name="domain" id="id_domain" className="vn-input" defaultValue={form.domain}>
                {form.domain_choices.map((host, index) => (
                  <option key={host} value={host}>
                    {index === 0 ? `Default (${siteUrl})` : host}
                  </option>
                ))}
              </select>
              <p className="vn-field-hint">The link works only on the chosen domain.</p>
            </div>
          ) : null}
        </div>

        <div className={`vn-field${fieldError("tags") ? " is-invalid" : ""}`}>
          <label htmlFor="id_tags" className="vn-field-label">
            <span>Tags</span>
          </label>
          <input
            type="text"
            name="tags"
            id="id_tags"
            defaultValue={tagString}
            autoComplete="off"
            placeholder="docs, marketing"
            className="vn-input"
          />
          <p className="vn-field-hint">Comma-separated labels; at most 5.</p>
          {fieldError("tags") ? <p className="vn-field-error">{fieldError("tags")}</p> : null}
        </div>

        <div className={`vn-field${fieldError("expires_at") ? " is-invalid" : ""}`}>
          <label htmlFor="id_expires_at" className="vn-field-label">
            <span>Expires at</span>
          </label>
          <DateTimeField id="id_expires_at" value={expires} onChange={setExpires} error={fieldError("expires_at")} />
          <p className="vn-field-hint">Leave empty for a link that never expires.</p>
        </div>

        <div className={`vn-field${fieldError("goes_live_at") ? " is-invalid" : ""}`}>
          <label htmlFor="id_goes_live_at" className="vn-field-label">
            <span>Goes live at</span>
          </label>
          <DateTimeField id="id_goes_live_at" value={goesLive} onChange={setGoesLive} error={fieldError("goes_live_at")} />
          <p className="vn-field-hint">Until then the link 404s. Leave empty to go live immediately.</p>
        </div>

        {/* Status & behavior */}
        <div>
          <p className="label text-ink">Status &amp; behavior</p>
          <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-3">
            <label htmlFor="id_is_active" className="flex cursor-pointer items-center gap-2 body-sm font-semibold text-ink">
              <input type="checkbox" name="is_active" id="id_is_active" defaultChecked={form.is_active} />
              Active
            </label>
            <label
              htmlFor="id_permanent"
              className="flex cursor-pointer items-center gap-2 body-sm font-semibold text-ink"
              title="Browsers cache 301s — clicks stop being reported for this link"
            >
              <input type="checkbox" name="permanent" id="id_permanent" defaultChecked={form.permanent} />
              Permanent redirect (301)
            </label>
            <label
              htmlFor="id_public_stats"
              className="flex cursor-pointer items-center gap-2 body-sm font-semibold text-ink"
              title="Anyone with the URL sees aggregate clicks only — no destinations, no click lists"
            >
              <input type="checkbox" name="public_stats" id="id_public_stats" defaultChecked={form.public_stats} />
              Public stats page
            </label>
            <label
              htmlFor="id_public_hide_countries"
              className="flex cursor-pointer items-center gap-2 body-sm text-ink-soft"
              title="Drops the country list from the public stats page"
            >
              <input
                type="checkbox"
                name="public_hide_countries"
                id="id_public_hide_countries"
                defaultChecked={form.public_hide_countries}
              />
              Hide countries on the public page
            </label>
          </div>
        </div>

        <div className="border-t border-line pt-6">
          <div className={`vn-field${fieldError("allowed_referrers") ? " is-invalid" : ""}`}>
            <label htmlFor="id_allowed_referrers" className="vn-field-label">
              <span>Referrer allow-list</span>
            </label>
            <input
              type="text"
              name="allowed_referrers"
              id="id_allowed_referrers"
              defaultValue={referrerString}
              className="vn-input"
              placeholder="e.g. blog.example.com, docs.example.com"
            />
            <p className="vn-field-hint">
              Hotlink protection: when set, the link only redirects visitors whose referrer matches one of
              these domains (subdomains included). Direct traffic and QR scans always work.
            </p>
            {fieldError("allowed_referrers") ? (
              <p className="vn-field-error">{fieldError("allowed_referrers")}</p>
            ) : null}
          </div>
        </div>

        <div className="border-t border-line pt-6">
          <p className="label text-ink">QR code colors</p>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div className={`vn-field${fieldError("qr_dark") ? " is-invalid" : ""}`}>
              <label htmlFor="id_qr_dark" className="vn-field-label">
                <span>Dark (code)</span>
              </label>
              <input
                type="color"
                name="qr_dark"
                id="id_qr_dark"
                defaultValue={form.qr_dark || "#0e353c"}
                className="h-10 w-full cursor-pointer rounded-md border border-line-strong bg-surface p-1"
              />
              {fieldError("qr_dark") ? <p className="vn-field-error">{fieldError("qr_dark")}</p> : null}
            </div>
            <div className={`vn-field${fieldError("qr_light") ? " is-invalid" : ""}`}>
              <label htmlFor="id_qr_light" className="vn-field-label">
                <span>Light (background)</span>
              </label>
              <input
                type="color"
                name="qr_light"
                id="id_qr_light"
                defaultValue={form.qr_light || "#ffffff"}
                className="h-10 w-full cursor-pointer rounded-md border border-line-strong bg-surface p-1"
              />
              {fieldError("qr_light") ? <p className="vn-field-error">{fieldError("qr_light")}</p> : null}
            </div>
          </div>
          <p className="vn-field-hint mt-2">
            Applies to the QR SVG for this link (save first, re-open the QR to see changes). Empty or default
            values use the server defaults.
          </p>
        </div>

        <div className="border-t border-line pt-6">
          <div className="vn-field">
            <label htmlFor="id_password" className="vn-field-label">
              <span>Gate password</span>
              {form.has_password ? (
                <span className="vn-tag vn-tag-warning h-5 px-2 text-[11px]">protected</span>
              ) : null}
            </label>
            <input
              type="password"
              name="password"
              id="id_password"
              autoComplete="new-password"
              className="vn-input"
              placeholder={form.has_password ? "Leave empty to keep the current one" : "Optional"}
            />
            <p className="vn-field-hint">
              Visitors must enter this once per browser session before the link redirects.
            </p>
            {form.has_password ? (
              <label htmlFor="id_remove_password" className="mt-1 flex cursor-pointer items-center gap-2 caption text-ink-soft">
                <input type="checkbox" name="remove_password" id="id_remove_password" />
                Remove password (link will redirect directly)
              </label>
            ) : null}
          </div>
        </div>

        <div>
          <button type="submit" className="vn-btn vn-btn-primary vn-btn-block" disabled={busy}>
            {busy ? "Saving…" : `Save changes${duplicateCode ? " anyway" : ""}`}
          </button>
          {savedTick > 0 ? (
            <p className="mt-2 text-center caption text-success">
              Saved — re-open the QR dialog to see new colors.
            </p>
          ) : null}
        </div>
      </form>

      {/* Transfer ownership */}
      <TransferSection code={link.code} />

      {/* Delete */}
      <div className="border-t border-line pt-6">
        <Button
          variant="secondary"
          className="text-danger"
          onClick={async () => {
            if (!window.confirm("Delete this link and its click history?")) return;
            try {
              await apiMutate(`/webapi/links/${link.code}/trash/`, {});
              show("Moved to the trash.");
              notifyLinksChanged();
              router.push("/dashboard");
            } catch {
              show("Could not trash that link.");
            }
          }}
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} /> Move to trash
        </Button>
        <p className="mt-2 vn-field-hint">
          Links go to the trash first; restore or purge them from the dashboard&apos;s Trash filter.
        </p>
      </div>
    </div>
  );
}

function TransferSection({ code }: { code: string }) {
  const router = useRouter();
  const show = useToast().show;
  const [stage, setStage] = useState<"idle" | "confirm" | "done">("idle");
  const [owner, setOwner] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function transfer(confirm: boolean) {
    setBusy(true);
    setError("");
    try {
      const data = await apiMutate<{ stage: "confirm" | "done"; new_owner: string }>(
        `/webapi/links/${code}/transfer/`,
        { body: { new_owner: owner, confirm } },
      );
      setStage(data.stage);
      setOwner(data.new_owner);
      if (data.stage === "done") {
        show(`Link transferred to ${data.new_owner}.`);
        notifyLinksChanged();
        router.push("/dashboard");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.errors.detail?.[0] || "Transfer failed."
          : "Transfer failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-line pt-6">
      <div className="vn-field">
        <label htmlFor="id_new_owner" className="vn-field-label">
          <span>Transfer ownership</span>
        </label>
        <div className="flex items-start gap-3">
          <input
            type="text"
            id="id_new_owner"
            placeholder="username or email"
            className="vn-input"
            value={stage === "confirm" ? owner : undefined}
            onChange={(event) => setOwner(event.target.value)}
          />
          <button
            type="button"
            className="vn-btn vn-btn-secondary shrink-0"
            disabled={busy}
            onClick={() => void transfer(stage === "confirm")}
          >
            {stage === "confirm" ? "Confirm transfer" : "Transfer"}
          </button>
        </div>
        {stage === "confirm" ? (
          <p className="vn-field-hint">
            Transfer everything to <span className="font-semibold text-ink">{owner}</span>? Click again to
            confirm.
          </p>
        ) : (
          <p className="vn-field-hint">
            Hands this link (and its history and tags) to another user on this server. You&apos;ll be asked to
            confirm.
          </p>
        )}
        {error ? <p className="vn-field-error">{error}</p> : null}
      </div>
    </div>
  );
}
