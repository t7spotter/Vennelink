"use client";

/**
 * Create-link form (right column of the dashboard). Mirrors
 * links/_form.html: destination + A/B details, custom alias + domain,
 * title, expiry/schedule pickers, tags, UTM builder. Django's LinkForm
 * stays the validator; 409 is the duplicate-destination confirmation.
 */

import { useState } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";

import { DateTimeField } from "@/components/form/DateTimeField";
import { notifyLinksChanged } from "@/components/dashboard/LinksSection";
import { useClipboard } from "@/lib/useClipboard";
import { Notice, useToast } from "@/components/ui";
import { apiMutate, ApiError } from "@/lib/api";
import type { FieldErrors, LinkDetail } from "@/types/api";

const CheckGlyph = CircleCheck;
const AlertGlyph = TriangleAlert;

interface CreateResponse {
  link: LinkDetail;
  created: boolean;
}

export function CreateLinkForm({ siteUrl, domains }: { siteUrl: string; domains: string[] }) {
  const show = useToast().show;
  const { copy, copied } = useClipboard();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [createdUrl, setCreatedUrl] = useState("");
  const [duplicateCode, setDuplicateCode] = useState<string | null>(null);

  const fieldError = (name: string) => errors[name]?.[0];

  async function submit(event: React.FormEvent<HTMLFormElement>, confirmDuplicate: boolean) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const form = new FormData(event.currentTarget);
    try {
      const data = await apiMutate<CreateResponse>("/webapi/links/create/", {
        body: {
          destination: String(form.get("destination") || ""),
          variant_b: String(form.get("variant_b") || ""),
          code: String(form.get("code") || ""),
          domain: String(form.get("domain") || ""),
          title: String(form.get("title") || ""),
          expires_at: String(form.get("expires_at") || ""),
          goes_live_at: String(form.get("goes_live_at") || ""),
          tags: String(form.get("tags") || ""),
          utm_source: String(form.get("utm_source") || ""),
          utm_medium: String(form.get("utm_medium") || ""),
          utm_campaign: String(form.get("utm_campaign") || ""),
          is_active: true,
          confirm_duplicate: confirmDuplicate || form.get("confirm_duplicate") === "on",
        },
      });
      setCreatedUrl(data.link.short_url);
      setDuplicateCode(null);
      show("Short URL ready.");
      notifyLinksChanged();
      // Reset the form so the next link starts fresh.
      const formElement = event.currentTarget;
      formElement.reset();
      // datetimes are controlled via DateTimeField state → force clear
      setExpires("");
      setGoesLive("");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setDuplicateCode(error.errors.duplicate_code?.[0] || "");
        } else {
          const mapped = error.errors;
          if (mapped.errors) {
            // create_or_edit nests form errors under {"errors": {...}}
            setErrors(mapped.errors as unknown as FieldErrors);
          } else {
            setErrors(mapped);
          }
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const [expires, setExpires] = useState("");
  const [goesLive, setGoesLive] = useState("");

  return (
    <div id="create-form" className="vn-card">
      <h2 className="subheading text-ink">Create a short link</h2>

      {createdUrl ? (
        <Notice tone="success" icon={CheckGlyph}>
          <div className="flex min-w-0 items-center gap-2">
            <a
              href={createdUrl}
              target="_blank"
              rel="noopener"
              className="min-w-0 flex-1 truncate font-medium text-success hover:underline"
            >
              {createdUrl}
            </a>
            <button
              type="button"
              className="shrink-0 rounded-sm p-1 text-success hover:bg-white/60"
              aria-label="Copy short URL"
              onClick={() => void copy(createdUrl)}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p>Short URL ready.</p>
        </Notice>
      ) : null}

      {duplicateCode ? (
        <div role="alert">
          <Notice tone="warning" icon={AlertGlyph} title="Another short link already points here">
            <p>
              <a href={`/dashboard/links/${duplicateCode}/edit`} className="font-semibold text-ink underline">
                /{duplicateCode}
              </a>{" "}
              already points to this destination. Still create it? Submitting again will save.
            </p>
          </Notice>
        </div>
      ) : null}

      <form
        onSubmit={(event) => void submit(event, !!duplicateCode)}
        className="mt-1 flex flex-col gap-4"
      >
        {errors.non_field_errors?.length ? (
          <div role="alert">
            <Notice tone="danger" icon={AlertGlyph}>
              {errors.non_field_errors.join(" ")}
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
            required
            placeholder="https://example.com/very/long/page"
            autoComplete="off"
            className="vn-input"
          />
          {fieldError("destination") ? <p className="vn-field-error">{fieldError("destination")}</p> : null}
          <details className="rounded-md bg-mist px-4 py-3">
            <summary className="-mx-1 cursor-pointer select-none rounded-sm px-1 body-sm font-semibold text-ink">
              A/B split test <span className="body-sm font-normal text-ink-soft">(optional)</span>
            </summary>
            <div className="mt-3">
              <div className={`vn-field${fieldError("variant_b") ? " is-invalid" : ""}`}>
                <label htmlFor="id_variant_b" className="vn-field-label">
                  <span>Variant B destination</span>
                  <span className="vn-field-opt">empty = no test</span>
                </label>
                <input
                  type="text"
                  inputMode="url"
                  name="variant_b"
                  id="id_variant_b"
                  placeholder="https://example.com/alt-page"
                  autoComplete="off"
                  className="vn-input"
                />
                <p className="vn-field-hint">
                  When set, visitors go to variant A (the destination above) or B roughly 50/50, and the
                  analytics page counts clicks per variant.
                </p>
                {fieldError("variant_b") ? <p className="vn-field-error">{fieldError("variant_b")}</p> : null}
              </div>
            </div>
          </details>
        </div>

        <div className={`vn-field${fieldError("code") ? " is-invalid" : ""}`}>
          <label htmlFor="id_code" className="vn-field-label">
            <span>Custom alias</span>
            <span className="vn-field-opt">optional</span>
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
              autoComplete="off"
              spellCheck={false}
              placeholder="campaign or blank for auto"
              className="w-full min-w-0 border-0 bg-transparent px-3 font-mono text-[15px] text-ink placeholder:text-ink-faint focus:shadow-none"
            />
          </div>
          {fieldError("code") ? <p className="vn-field-error">{fieldError("code")}</p> : null}
          {domains.length > 0 ? (
            <div className="vn-field mt-3">
              <label htmlFor="id_domain" className="vn-field-label">
                <span>Domain</span>
                <span className="vn-field-opt">optional</span>
              </label>
              <select name="domain" id="id_domain" className="vn-input">
                <option value="">Default ({siteUrl})</option>
                {domains.map((host) => (
                  <option key={host} value={host}>
                    {host}
                  </option>
                ))}
              </select>
              <p className="vn-field-hint">
                The link works only on the chosen domain, and its QR code points there.
              </p>
            </div>
          ) : null}
        </div>

        <div className={`vn-field${fieldError("title") ? " is-invalid" : ""}`}>
          <label htmlFor="id_title" className="vn-field-label">
            <span>Title</span>
            <span className="vn-field-opt">optional</span>
          </label>
          <input
            type="text"
            name="title"
            id="id_title"
            placeholder="Spring campaign"
            className="vn-input"
          />
          {fieldError("title") ? <p className="vn-field-error">{fieldError("title")}</p> : null}
        </div>

        <div className={`vn-field${fieldError("expires_at") ? " is-invalid" : ""}`}>
          <label htmlFor="id_expires_at" className="vn-field-label">
            <span>Expires at</span>
            <span className="vn-field-opt">optional</span>
          </label>
          <DateTimeField id="id_expires_at" value={expires} onChange={setExpires} error={fieldError("expires_at")} />
          <p className="vn-field-hint">Leave empty for a link that never expires.</p>
        </div>

        <div className={`vn-field${fieldError("goes_live_at") ? " is-invalid" : ""}`}>
          <label htmlFor="id_goes_live_at" className="vn-field-label">
            <span>Goes live at</span>
            <span className="vn-field-opt">optional</span>
          </label>
          <DateTimeField id="id_goes_live_at" value={goesLive} onChange={setGoesLive} error={fieldError("goes_live_at")} minDate={new Date()} />
        </div>

        <div className={`vn-field${fieldError("tags") ? " is-invalid" : ""}`}>
          <label htmlFor="id_tags" className="vn-field-label">
            <span>Tags</span>
            <span className="vn-field-opt">optional, comma-separated</span>
          </label>
          <input
            type="text"
            name="tags"
            id="id_tags"
            placeholder="docs, marketing"
            autoComplete="off"
            className="vn-input"
          />
          {fieldError("tags") ? <p className="vn-field-error">{fieldError("tags")}</p> : null}
        </div>

        <details className="rounded-md bg-mist px-4 py-3">
          <summary className="-mx-1 cursor-pointer select-none rounded-sm px-1 body-sm font-semibold text-ink">
            UTM builder <span className="body-sm font-normal text-ink-soft">(optional)</span>
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <input type="text" name="utm_source" id="id_utm_source" placeholder="Source, e.g. newsletter" className="vn-input" />
            <input type="text" name="utm_medium" id="id_utm_medium" placeholder="Medium, e.g. email" className="vn-input" />
            <input type="text" name="utm_campaign" id="id_utm_campaign" placeholder="Campaign, e.g. spring-launch" className="vn-input" />
            <p className="vn-field-hint">Appended to the destination at save time. Existing UTM parts are kept.</p>
          </div>
        </details>

        <button type="submit" className="vn-btn vn-btn-primary vn-btn-block" disabled={busy}>
          <span aria-hidden="true">✂</span> {duplicateCode ? "Create anyway" : busy ? "Shortening…" : "Shorten URL"}
        </button>
        <p className="text-center caption text-ink-faint">Only http:// and https:// destinations are accepted.</p>
      </form>
    </div>
  );
}
