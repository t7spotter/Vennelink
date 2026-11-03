"use client";

/**
 * The dashboard table region: search + status filter, tag filter chips,
 * the table with sparklines, row actions, the sticky bulk bar, and the
 * pager. Data comes from Django's /webapi/links/ with the same query
 * contract the old HTMX fragment used. Row actions elsewhere in the app
 * (create form, edit page) dispatch the "links-changed" event; this
 * component refetches on it, like the old htmx listener did.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Copy,
  MousePointerClick,
  Pause,
  Pencil,
  Play,
  QrCode,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";

import { QrModal } from "@/components/dashboard/QrModal";
import { Pager, StatusTag, useToast } from "@/components/ui";
import { useClipboard } from "@/lib/useClipboard";
import { apiGet, apiMutate, ApiError } from "@/lib/api";
import { intcomma, naturaltime } from "@/lib/format";
import type { LinkRow, TablePayload } from "@/types/api";

const STATUSES = ["all", "active", "inactive", "expired", "trash"] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  active: "Active",
  inactive: "Inactive",
  expired: "Expired",
  trash: "Trash",
};

const LINKS_CHANGED = "links-changed";

/** Announce that links changed so table hosts refetch (old htmx trigger). */
export function notifyLinksChanged() {
  window.dispatchEvent(new Event(LINKS_CHANGED));
}

export function useLinksChanged(handler: () => void) {
  useEffect(() => {
    window.addEventListener(LINKS_CHANGED, handler);
    return () => window.removeEventListener(LINKS_CHANGED, handler);
  }, [handler]);
}

export function LinksSection({ initial }: { initial: TablePayload }) {
  const [table, setTable] = useState<TablePayload>(initial);

  const [queryInput, setQueryInput] = useState(initial.query);
  const [query, setQuery] = useState(initial.query);
  const [status, setStatus] = useState<StatusFilter>(
    (STATUSES as readonly string[]).includes(initial.status)
      ? (initial.status as StatusFilter)
      : "all",
  );
  const [tag, setTag] = useState(initial.tag || "");

  const [selected, setSelected] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [qrCode, setQrCode] = useState<LinkRow | null>(null);
  const show = useToast().show;

  const fetchTable = useCallback(
    async (q: string, s: string, t: string, page: number) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (s !== "all") params.set("status", s);
      if (t) params.set("tag", t);
      if (page > 1) params.set("page", String(page));
      try {
        const data = await apiGet<TablePayload>(`/webapi/links/${params.toString() ? `?${params}` : ""}`);
        setTable(data);
        setSelected([]);
      } catch {
        show("Could not refresh the links table.");
      }
    },
    [show],
  );

  const currentView = useCallback(
    () => fetchTable(query, status, tag, table.page),
    [fetchTable, query, status, tag, table.page],
  );

  // External changes (create form, edit page, analytics actions).
  useLinksChanged(currentView);

  // Debounced search: the old HTMX form sent on a 300ms input delay.
  useEffect(() => {
    if (query === queryInput) return;
    const timer = setTimeout(() => {
      setQuery(queryInput);
      void fetchTable(queryInput, status, tag, 1);
    }, 300);
    return () => clearTimeout(timer);
    // The effect only re-arms when the typed input changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  const applyFilters = (
    nextQuery: string = query,
    nextStatus: StatusFilter = status,
    nextTag: string = tag,
  ) => {
    setQuery(nextQuery);
    setStatus(nextStatus);
    setTag(nextTag);
    if (nextQuery === queryInput) {
      void fetchTable(nextQuery, nextStatus, nextTag, 1);
    } else {
      setQueryInput(nextQuery);
      void fetchTable(nextQuery, nextStatus, nextTag, 1);
    }
  };

  const allSelected = table.items.length > 0 && table.items.every((item) => selected.includes(item.code));

  async function bulk(action: string) {
    if (!selected.length) return;
    if (action === "tag" && !tagInput.trim()) {
      show("Enter the tag names first.");
      return;
    }
    try {
      const data = await apiMutate<{ count: number }>("/webapi/links/bulk/", {
        body: { action, codes: selected, tag: action === "tag" ? tagInput : undefined },
      });
      setTagInput("");
      await currentView();
      show(data.count === 1 ? "Updated 1 link" : `Updated ${data.count} links`);
      notifyLinksChanged();
    } catch (error) {
      if (error instanceof ApiError) {
        show(error.errors.detail?.[0] || "That bulk action failed.");
      } else {
        show("That bulk action failed.");
      }
    }
  }

  const trashed = status === "trash";

  return (
    <section aria-label="Your links" className="min-w-0">
      {/* Search + status filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Search title, destination, or code…"
              className="vn-input pl-9"
              aria-label="Search links"
            />
          </div>
          <select
            aria-label="Filter by status"
            className="vn-input w-auto"
            value={status}
            onChange={(event) => applyFilters(query, event.target.value as StatusFilter)}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tag filter chips */}
      {table.tag_names.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`vn-tag${!tag ? " vn-tag-violet" : ""}`}
            onClick={() => applyFilters(query, status, "")}
          >
            {!tag ? <span className="vn-tag-dot" /> : null}
            All
          </button>
          {table.tag_names.map((name) => (
            <button
              key={name}
              type="button"
              className={`vn-tag${tag === name ? " vn-tag-violet" : " hover:text-ink"}`}
              onClick={() => applyFilters(query, status, name === tag ? "" : name)}
            >
              {tag === name ? <span className="vn-tag-dot" /> : null}
              {name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Table card */}
      <div className="vn-card overflow-hidden p-0" style={{ gap: 0 }}>
        {table.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left body-sm">
              <thead>
                <tr className="border-b border-line caption text-ink-faint">
                  <th scope="col" className="px-2 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(event) =>
                        setSelected(event.target.checked ? table.items.map((item) => item.code) : [])
                      }
                      aria-label="Select all links on this page"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3">Link</th>
                  <th scope="col" className="px-4 py-3">Short URL</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Clicks</th>
                  <th scope="col" className="px-4 py-3">Last click</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {table.items.map((item) => (
                  <LinkRow
                    key={item.id}
                    link={item}
                    spark={table.spark[String(item.id)] || []}
                    trashed={trashed}
                    selected={selected.includes(item.code)}
                    onSelect={(checked) =>
                      setSelected((current) =>
                        checked
                          ? [...current, item.code]
                          : current.filter((code) => code !== item.code),
                      )
                    }
                    onQr={() => setQrCode(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 py-14 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-violet-soft text-violet-ink">
              <MousePointerClick className="h-6 w-6" strokeWidth={1.75} />
            </span>
            {query || status !== "all" ? (
              <>
                <p className="mt-4 label text-ink">No links match your filters</p>
                <p className="mt-1 body-sm text-ink-soft">Try a different search term or filter.</p>
              </>
            ) : (
              <>
                <p className="mt-4 label text-ink">No links yet</p>
                <p className="mt-1 body-sm text-ink-soft">
                  Create your first short link using the form — it only takes a URL.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <Pager
        page={table.page}
        numPages={table.num_pages}
        onPrevious={() => void fetchTable(query, status, tag, table.page - 1)}
        onNext={() => void fetchTable(query, status, tag, table.page + 1)}
      />

      {/* Sticky bulk bar */}
      {selected.length > 0 ? (
        <form
          className="sticky bottom-4 mt-4 flex flex-wrap items-center gap-2 rounded-full bg-ink p-3 pl-5 text-on-action shadow-md"
          onSubmit={(event) => event.preventDefault()}
        >
          <span className="caption font-semibold">{selected.length} selected</span>
          <button
            type="button"
            className="caption rounded-full bg-success-soft px-3 py-1.5 font-semibold text-success hover:opacity-90"
            onClick={() => void bulk("activate")}
          >
            Activate
          </button>
          <button
            type="button"
            className="caption rounded-full bg-surface px-3 py-1.5 font-semibold text-ink hover:opacity-90"
            onClick={() => void bulk("deactivate")}
          >
            Deactivate
          </button>
          <button
            type="button"
            className="caption rounded-full bg-violet-soft px-3 py-1.5 font-semibold text-violet-ink hover:opacity-90"
            onClick={() => void bulk("tag")}
          >
            Tag
          </button>
          <input
            type="text"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            placeholder="tag names, comma-separated"
            className="caption w-44 rounded-full border border-line-strong bg-transparent px-3 py-1.5 text-on-action placeholder:text-on-action/50 focus:border-violet"
          />
          <button
            type="button"
            className="caption rounded-full bg-danger px-3 py-1.5 font-semibold text-on-danger hover:opacity-90"
            onClick={() => void bulk("trash")}
          >
            Trash
          </button>
        </form>
      ) : null}

      {qrCode ? <QrModal code={qrCode.code} url={qrCode.short_url} onClose={() => setQrCode(null)} /> : null}
    </section>
  );
}

interface RowProps {
  link: LinkRow;
  spark: number[];
  trashed: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onQr: () => void;
}

function LinkRow({ link, spark, trashed, selected, onSelect, onQr }: RowProps) {
  const { copy } = useClipboard();
  const show = useToast().show;

  async function act(path: string, message: string) {
    try {
      await apiMutate(path, {});
      show(message);
      notifyLinksChanged();
    } catch {
      show("That action failed.");
    }
  }

  const highlights = spark.slice(-14);
  const max = Math.max(...highlights, 1);

  return (
    <tr className="border-b border-line/60 transition-colors last:border-0 hover:bg-mist/50">
      <td className="w-10 px-2 py-3.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelect(event.target.checked)}
          aria-label={`Select link ${link.code}`}
        />
      </td>
      <td className="max-w-[220px] px-4 py-3.5">
        {link.title ? (
          <p className="truncate label text-ink" title={link.title}>
            {link.title}
          </p>
        ) : null}
        <p className="truncate mt-0.5 body-sm text-ink-soft" title={link.destination}>
          {link.destination}
        </p>
        {link.health_status ? (
          <p
            className={`mt-0.5 flex items-center gap-1.5 caption ${
              link.health_status === "ok" ? "text-success" : "text-danger"
            }`}
            title={`${link.health_detail ? `${link.health_detail} — ` : ""}${link.destination}`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                link.health_status === "ok" ? "bg-success" : "bg-danger"
              }`}
            />
            {link.health_status === "ok" ? "Destination up" : "Destination down"}
            {link.health_detail ? <> · {link.health_detail}</> : null}
          </p>
        ) : null}
        {link.tags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {link.tags.map((item) => (
              <span key={item} className="vn-tag h-5 bg-mist px-2 text-[11px]">
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </td>
      <td className="max-w-[180px] px-4 py-3.5">
        <div className="flex items-center gap-1">
          <a
            href={link.short_url}
            className="truncate font-medium text-violet-ink hover:underline"
            target="_blank"
            rel="noopener"
          >
            {link.short_url}
          </a>
          <button
            type="button"
            className="rounded-sm p-1 text-ink-faint hover:bg-mist hover:text-ink"
            onClick={() => void copy(link.short_url)}
            aria-label="Copy short URL"
            title="Copy short URL"
          >
            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <StatusTag
          status={link.status}
          goesLiveAt={link.goes_live_at ? naturaltime(link.goes_live_at) : undefined}
        />
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className="mono font-medium tabular-nums text-ink">{intcomma(link.click_count)}</span>
        <span className="mt-0.5 flex h-3.5 items-end justify-end gap-px" aria-hidden="true">
          {highlights.map((value, index) => (
            <span
              key={index}
              className={`w-[3px] rounded-full ${value ? "bg-violet" : "bg-line"}`}
              style={{ height: `${Math.max((value / max) * 14, 2)}px` }}
            />
          ))}
        </span>
      </td>
      <td className="px-4 py-3.5 mono-sm text-ink-soft">
        {link.last_click_at ? naturaltime(link.last_click_at) : "—"}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex justify-end gap-1 text-ink-soft">
          {trashed ? (
            <>
              <button
                type="button"
                className="rounded-sm p-1.5 hover:bg-mist hover:text-success"
                onClick={() => void act(`/webapi/links/${link.code}/restore/`, `Restored /${link.code}`)}
                aria-label={`Restore /${link.code}`}
                title="Restore"
              >
                <Undo2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                className="rounded-sm p-1.5 hover:bg-coral-soft hover:text-danger"
                onClick={() => {
                  if (window.confirm(`Permanently delete /${link.code} and its click history?`)) {
                    void act(
                      `/webapi/links/${link.code}/purge/`,
                      `Deleted /${link.code} forever`,
                    );
                  }
                }}
                aria-label={`Delete forever /${link.code}`}
                title="Delete forever"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="rounded-sm p-1.5 hover:bg-mist hover:text-ink"
                onClick={onQr}
                aria-label={`QR code for /${link.code}`}
                title="QR code"
              >
                <QrCode className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <Link
                href={`/dashboard/links/${link.code}/analytics`}
                className="rounded-sm p-1.5 hover:bg-mist hover:text-ink"
                aria-label={`Analytics for /${link.code}`}
                title="Analytics"
              >
                <BarChart3 className="h-4 w-4" strokeWidth={1.75} />
              </Link>
              <Link
                href={`/dashboard/links/${link.code}/edit`}
                className="rounded-sm p-1.5 hover:bg-mist hover:text-ink"
                aria-label={`Edit /${link.code}`}
                title="Edit"
              >
                <Pencil className="h-4 w-4" strokeWidth={1.75} />
              </Link>
              {link.is_active ? (
                <button
                  type="button"
                  className="rounded-sm p-1.5 hover:bg-mist hover:text-warning"
                  onClick={() => void act(`/webapi/links/${link.code}/toggle/`, `Deactivated /${link.code}`)}
                  aria-label={`Deactivate /${link.code}`}
                  title="Deactivate"
                >
                  <Pause className="h-4 w-4" strokeWidth={1.75} />
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-sm p-1.5 hover:bg-mist hover:text-success"
                  onClick={() => void act(`/webapi/links/${link.code}/toggle/`, `Activated /${link.code}`)}
                  aria-label={`Activate /${link.code}`}
                  title="Activate"
                >
                  <Play className="h-4 w-4" strokeWidth={1.75} />
                </button>
              )}
              <button
                type="button"
                className="rounded-sm p-1.5 hover:bg-coral-soft hover:text-danger"
                onClick={() => {
                  if (window.confirm(`Move /${link.code} to the trash?`)) {
                    void act(
                      `/webapi/links/${link.code}/trash/`,
                      `Moved /${link.code} to the trash`,
                    );
                  }
                }}
                aria-label={`Trash /${link.code}`}
                title="Move to trash"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
