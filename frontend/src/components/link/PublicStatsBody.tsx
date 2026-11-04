"use client";

/**
 * Aggregate, anonymous stats body for /stats/<code>/ (analytics/public.html).
 */

import {
  CircleCheck,
  MousePointerClick,
} from "lucide-react";

import { ClicksChart } from "@/components/dashboard/ClicksChart";
import { intcomma } from "@/lib/format";
import type { PublicStatsPayload } from "@/types/api";

export function PublicStatsBody({ data }: { data: PublicStatsPayload }) {
  const deviceEntries = Object.entries(data.devices);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="vn-card is-raised">
        <p className="mono-sm text-ink-soft">Public link statistics</p>
        <h1 className="heading mt-1 text-ink">{data.title || `/${data.code}`}</h1>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="font-mono text-2xl font-medium tabular-nums text-ink">{intcomma(data.total_clicks)}</p>
            <p className="caption text-ink-soft">Total clicks</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-medium tabular-nums text-ink">
              {intcomma(data.total_clicks_30)}
            </p>
            <p className="caption text-ink-soft">Last 30 days</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-medium text-ink">{data.tracking_since}</p>
            <p className="caption text-ink-soft">Tracking since</p>
          </div>
        </div>
        <p className="mt-3 caption text-ink-faint">Aggregate counts only — updated live, no personal data.</p>
      </header>

      <div className="vn-card mt-6">
        <h2 className="subheading text-ink">Clicks over the last 30 days</h2>
        <div className="mt-4 h-56">
          <ClicksChart series={data.series} height={224} ariaLabel="Clicks per day over the last 30 days" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="vn-card">
          <h2 className="subheading text-ink">Devices</h2>
          <ul className="flex flex-col gap-2">
            {deviceEntries.length === 0 ? (
              <li className="px-3 py-2 body-sm text-ink-soft">No clicks recorded yet.</li>
            ) : (
              deviceEntries.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between rounded-sm bg-mist px-3 py-2">
                  <span className="body-sm capitalize text-ink">{name}</span>
                  <span className="mono-sm tabular-nums text-ink-soft">{intcomma(count)}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {data.show_countries ? (
          <div className="vn-card">
            <h2 className="subheading text-ink">Countries</h2>
            <ul className="flex flex-col gap-2">
              {data.countries.length === 0 ? (
                <li className="px-3 py-2 body-sm text-ink-soft">No country data recorded yet.</li>
              ) : (
                data.countries.map((row) => (
                  <li key={row.country} className="flex items-center justify-between rounded-sm bg-mist px-3 py-2">
                    <span className="body-sm text-ink">{row.country}</span>
                    <span className="mono-sm tabular-nums text-ink-soft">{intcomma(row.count)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : (
          <div className="vn-card">
            <h2 className="subheading text-ink">Countries</h2>
            <p className="body-sm flex items-center gap-2 text-ink-soft">
              <CircleCheck className="h-4 w-4 text-success" strokeWidth={1.75} />
              Hidden by the owner.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 caption flex items-center gap-2 text-ink-faint">
        <MousePointerClick className="h-3.5 w-3.5" strokeWidth={1.75} />
        Non-bot clicks; link previews and automated requests are not counted here.
      </p>
    </div>
  );
}
