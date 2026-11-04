"use client";

/**
 * Owner analytics page (mirrors analytics/detail.html): summary header
 * with the bots toggle, stat cards, the 30-day chart, referrer/country/
 * device breakdowns, the A/B card when Variant B exists, recent clicks.
 * Client-side so the bots toggle and copy gestures are interactive.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  BotOff,
  Copy,
  Download,
  MousePointerClick,
  Pencil,
} from "lucide-react";

import { ClicksChart } from "@/components/dashboard/ClicksChart";
import { StatusTag, useToast } from "@/components/ui";
import { useClipboard } from "@/lib/useClipboard";
import { cleanReferrer, intcomma, naturaltime, truncate } from "@/lib/format";
import type { AnalyticsPayload } from "@/types/api";

export function LinkAnalyticsClient({ data, csvHref }: { data: AnalyticsPayload; csvHref: string }) {
  const router = useRouter();
  const show = useToast().show;
  const { copy } = useClipboard();
  const link = data.link;

  const maxReferrer = Math.max(...data.referrers.map((row) => row.count), 1);
  const deviceEntries = Object.entries(data.devices);

  function toggleBots() {
    // Django's analytics JSON takes ?bots=1; redirect to the same page.
    router.push(
      data.bots ? `/dashboard/links/${link.code}/analytics` : `/dashboard/links/${link.code}/analytics?bots=1`,
    );
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/dashboard" className="vn-btn vn-btn-quiet -ml-3 mb-6">
        <span aria-hidden="true">←</span> Back to dashboard
      </Link>

      {/* Link summary header */}
      <div className="vn-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="heading text-ink">{link.title || "Analytics"}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 body-sm">
              <a
                href={link.short_url}
                target="_blank"
                rel="noopener"
                className="font-mono font-medium text-violet-ink hover:underline"
              >
                {link.short_url}
              </a>
              <ArrowRight className="h-3.5 w-3.5 text-ink-faint" strokeWidth={1.75} />
              <span className="break-all text-ink-soft">{link.destination}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="vn-btn vn-btn-sm vn-btn-secondary"
              onClick={toggleBots}
              title={data.bots ? "Hide known bot clicks" : "Include known bot clicks"}
            >
              {data.bots ? (
                <BotOff className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Bot className="h-4 w-4" strokeWidth={1.75} />
              )}
              {data.bots ? "Bots shown" : "Include bots"}
              {data.bot_clicks > 0 ? <span className="vn-tab-count">{intcomma(data.bot_clicks)}</span> : null}
            </button>
            <a href={csvHref} className="vn-btn vn-btn-sm vn-btn-secondary" title="Download this link's analytics as CSV">
              <Download className="h-4 w-4" strokeWidth={1.75} /> CSV
            </a>
            <button
              type="button"
              className="vn-btn vn-btn-sm vn-btn-secondary"
              onClick={() => void copy(link.short_url).then(() => show("Copied to clipboard"))}
            >
              <Copy className="h-4 w-4" strokeWidth={1.75} /> Copy
            </button>
            <Link href={`/dashboard/links/${link.code}/edit`} className="vn-btn vn-btn-sm vn-btn-secondary">
              <Pencil className="h-4 w-4" strokeWidth={1.75} /> Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="vn-card">
          <p className="caption text-ink-soft">Total clicks</p>
          <p className="mt-1 font-mono text-[26px] font-medium tracking-tight text-ink">
            {intcomma(data.total_clicks)}
          </p>
        </div>
        <div className="vn-card">
          <p className="caption text-ink-soft">Clicks, 30 days</p>
          <p className="mt-1 font-mono text-[26px] font-medium tracking-tight text-ink">
            {intcomma(data.total_clicks_30)}
          </p>
        </div>
        <div className="vn-card">
          <p className="caption text-ink-soft">Status</p>
          <p className="mt-2">
            <StatusTag status={link.status} />
          </p>
        </div>
        <div className="vn-card">
          <p className="caption text-ink-soft">Created</p>
          <p className="mt-1 body-lg font-medium text-ink">{naturaltime(link.created_at)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="vn-card mt-6">
        <h2 className="subheading text-ink">Clicks over the last 30 days</h2>
        <div className="mt-4 h-56">
          <ClicksChart series={data.series} height={224} ariaLabel="Clicks per day over the last 30 days" />
        </div>
      </div>

      <BreakdownGrid
        referrers={data.referrers}
        maxReferrer={maxReferrer}
        countries={data.countries}
        devices={deviceEntries}
        totalClicks={data.total_clicks}
        variantB={link.variant_b}
        variantACount={data.variant_a_count}
        variantBCount={data.variant_b_count}
      />

      {/* Recent clicks */}
      <div className="vn-card mt-6">
        <h2 className="subheading text-ink">Recent clicks</h2>
        {data.recent_clicks.length > 0 ? (
          <ul className="flex flex-col">
            {data.recent_clicks.map((click, index) => (
              <li key={`${click.created_at}-${index}`} className="vn-row">
                <span className="vn-row-main">
                  <span className="vn-row-title">
                    {click.referrer ? truncate(cleanReferrer(click.referrer), 40) : "Direct"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="vn-tag h-5 px-2 text-[11px]">{click.device}</span>
                  <time className="vn-row-meta" dateTime={click.created_at}>
                    {naturaltime(click.created_at)}
                  </time>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-2 py-8 text-center">
            <MousePointerClick className="mx-auto h-6 w-6 text-ink-faint" strokeWidth={1.75} />
            <p className="mt-2 body-sm text-ink-soft">
              No clicks yet. Share the short link to start collecting analytics.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 caption text-ink-faint">
        Click counts include bots, link previews, and automated requests — they do not represent unique human
        visitors.
      </p>
    </div>
  );
}

function BarRow({
  label,
  count,
  total,
  tone,
  title,
}: {
  label: string;
  count: number;
  total: number;
  tone: "violet" | "apricot";
  title?: string;
}) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <li>
      <div className="flex items-center justify-between gap-3 body-sm">
        <span className="truncate text-ink" title={title}>
          {label}
        </span>
        <span className="mono shrink-0 tabular-nums text-ink-soft">{intcomma(count)}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-mist">
        <div
          className={`h-full rounded-full ${tone === "violet" ? "bg-violet" : "bg-apricot"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </li>
  );
}

function BreakdownGrid({
  referrers,
  maxReferrer,
  countries,
  devices,
  totalClicks,
  variantB,
  variantACount,
  variantBCount,
}: {
  referrers: Array<{ referrer: string; count: number }>;
  maxReferrer: number;
  countries: Array<{ country: string; count: number }>;
  devices: Array<[string, number]>;
  totalClicks: number;
  variantB: string;
  variantACount: number;
  variantBCount: number;
}) {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="vn-card">
        <h2 className="subheading text-ink">Top referrers</h2>
        {referrers.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {referrers.map((row) => (
              <BarRow
                key={row.referrer}
                label={truncate(cleanReferrer(row.referrer), 40)}
                count={row.count}
                total={maxReferrer}
                tone="violet"
              />
            ))}
          </ul>
        ) : (
          <p className="body-sm text-ink-soft">No referrers recorded yet. Most browsers omit referrer data.</p>
        )}
      </div>

      <div className="vn-card">
        <h2 className="subheading text-ink">Countries</h2>
        {countries.length > 0 ? (
          <>
            <ul className="flex flex-col gap-3">
              {countries.map((row) => (
                <BarRow key={row.country} label={row.country} count={row.count} total={totalClicks} tone="apricot" />
              ))}
            </ul>
            <p className="mt-3 caption text-ink-faint">Resolved without storing any IP address.</p>
          </>
        ) : (
          <p className="body-sm text-ink-soft">
            No country data yet — the operator may not have configured a GeoLite2 country database.
          </p>
        )}
      </div>

      <div className="vn-card">
        <h2 className="subheading text-ink">Devices</h2>
        {devices.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {devices.map(([name, count]) => (
              <BarRow
                key={name}
                label={name.charAt(0).toUpperCase() + name.slice(1)}
                count={count}
                total={totalClicks}
                tone="violet"
              />
            ))}
          </ul>
        ) : (
          <p className="body-sm text-ink-soft">No clicks recorded yet.</p>
        )}
      </div>

      {variantB ? (
        <div className="vn-card">
          <h2 className="subheading text-ink">A/B split test</h2>
          <ul className="flex flex-col gap-3">
            <BarRow label="Variant A (destination)" count={variantACount} total={totalClicks} tone="violet" />
            <BarRow label="Variant B" count={variantBCount} total={totalClicks} tone="apricot" title={variantB} />
          </ul>
          <p className="mt-3 caption text-ink-faint">
            Roughly 50/50 per visit; counts include every valid visitor.
          </p>
        </div>
      ) : null}
    </div>
  );
}
