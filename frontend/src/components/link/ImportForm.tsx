"use client";

/**
 * CSV import form + partial-success report (mirrors link_import.html).
 * The backend answers either {error} or the ImportPayload shape.
 */

import Link from "next/link";
import { useState } from "react";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";

import { Notice } from "@/components/ui";
import { apiMutate } from "@/lib/api";
import { intcomma } from "@/lib/format";
import type { ImportPayload } from "@/types/api";

type Outcome =
  | { kind: "error"; message: string }
  | { kind: "payload"; data: ImportPayload };

export function ImportForm({ maxRows }: { maxRows: number }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setOutcome(null);
    const data = new FormData(event.currentTarget);
    try {
      // multipart: apiMutate leaves Content-Type to the browser.
      const result = await apiMutate<Partial<ImportPayload> & { error?: string }>(
        "/webapi/links/import/",
        { body: data },
      );
      if (result.error) {
        setOutcome({ kind: "error", message: result.error });
      } else {
        setOutcome({
          kind: "payload",
          data: result as ImportPayload,
        });
        window.dispatchEvent(new Event("links-changed"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (outcome) {
    const failed = outcome.kind === "payload" ? outcome.data.failed : [];
    return (
      <>
        {outcome.kind === "error" ? (
          <Notice tone="danger" icon={CircleAlert}>
            {outcome.message}
            <div className="vn-notice-action">
              <Link href="/dashboard/links/import" className="vn-btn vn-btn-secondary vn-btn-sm">
                Try another file
              </Link>
            </div>
          </Notice>
        ) : (
          <>
            <Notice tone="success" icon={CircleCheck}>
              Imported {intcomma(outcome.data.created)} of {intcomma(outcome.data.total)} rows.
            </Notice>
            {failed.length > 0 ? (
              <Notice tone="warning" icon={TriangleAlert} title={`${failed.length} row${failed.length === 1 ? "" : "s"} not imported`}>
                <ul className="list-inside list-disc">
                  {failed.map((row) => (
                    <li key={row.row}>
                      Row {row.row} — {row.message}
                    </li>
                  ))}
                </ul>
                {outcome.data.hidden_errors > 0 ? (
                  <p>…and {intcomma(outcome.data.hidden_errors)} more.</p>
                ) : null}
              </Notice>
            ) : null}
          </>
        )}
        <Link href="/dashboard" className="vn-btn vn-btn-primary mt-6">
          Back to dashboard
        </Link>
      </>
    );
  }

  return (
    <form onSubmit={submit} className="vn-card mt-6">
      <div className="vn-field">
        <label htmlFor="file" className="vn-field-label">
          <span>CSV file</span>
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full rounded-md border border-line-strong bg-mist px-3 py-2.5 body-sm text-ink file:cursor-pointer file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-1.5 file:caption file:font-semibold file:text-on-action"
        />
        <p className="vn-field-hint">
          The first column with a <code>destination</code>/<code>long url</code> header is the destination;
          optional <code>alias</code>/<code>short url</code> and <code>title</code> columns are used too. A
          bit.ly/short.io export in its original shape works as-is. Files without a header row are treated as
          one destination URL per line. At most {intcomma(maxRows)} rows per upload.
        </p>
      </div>
      <button type="submit" className="vn-btn vn-btn-primary" disabled={busy}>
        {busy ? "Importing…" : "Import"}
      </button>
    </form>
  );
}
