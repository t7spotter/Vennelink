"use client";

/**
 * Dashboard orchestrator. Server-fetched /webapi/dashboard/ payload is the
 * initial render; stats + chart + recent activity refetch on the
 * "links-changed" event while LinksSection manages its own table state.
 */

import { useCallback, useState } from "react";

import { ClicksChart } from "@/components/dashboard/ClicksChart";
import { LinksSection, useLinksChanged } from "@/components/dashboard/LinksSection";
import { CreateLinkForm } from "@/components/link/CreateLinkForm";
import { CircleCheck, MousePointerClick, TrendingUp } from "lucide-react";
import { Link2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import { intcomma, naturaltime } from "@/lib/format";
import type { DashboardPayload } from "@/types/api";

const STATS_META = [
  { key: "total_links", label: "Links", Icon: Link2, tone: "text-ink-faint" },
  { key: "active_links", label: "Active", Icon: CircleCheck, tone: "text-success" },
  { key: "total_clicks", label: "Total clicks", Icon: MousePointerClick, tone: "text-ink-faint" },
] as const;

export function DashboardClient({
  initial,
  siteUrl,
  domains,
}: {
  initial: DashboardPayload;
  siteUrl: string;
  domains: string[];
}) {
  const [payload, setPayload] = useState(initial);

  const refreshPayload = useCallback(async () => {
    try {
      setPayload(await apiGet<DashboardPayload>("/webapi/dashboard/"));
    } catch {
      // Table refresh already surfaces failures; keep the stale header.
    }
  }, []);

  useLinksChanged(refreshPayload);

  const lastClick = payload.stats.last_click;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {STATS_META.map(({ key, label, Icon, tone }) => (
          <div key={key} className="vn-card">
            <div className="flex items-center justify-between">
              <p className="caption text-ink-soft">{label}</p>
              <Icon className={`h-4 w-4 ${tone}`} strokeWidth={1.75} />
            </div>
            <p className="mt-1 font-mono text-[26px] font-medium tracking-tight text-ink">
              {intcomma(payload.stats[key])}
            </p>
          </div>
        ))}
        <div className="vn-card">
          <div className="flex items-center justify-between">
            <p className="caption text-ink-soft">Clicks, 14 days</p>
            <TrendingUp className="h-4 w-4 text-ink-faint" strokeWidth={1.75} />
          </div>
          <p className="mt-1 font-mono text-[26px] font-medium tracking-tight text-ink" title={lastClick ? `Last click ${naturaltime(lastClick)}` : undefined}>
            {intcomma(payload.series_total)}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Left column: links table */}
        <LinksSection initial={payload} />

        {/* Right column: chart + create form */}
        <aside className="flex min-w-0 flex-col gap-6">
          <div className="vn-card">
            <h2 className="subheading text-ink">Clicks, last 14 days</h2>
            <div className="mt-4 h-40">
              <ClicksChart series={payload.series} height={160} ariaLabel="Clicks over the last 14 days" />
            </div>
          </div>

          <CreateLinkForm siteUrl={siteUrl} domains={domains} />

          {payload.recent_clicks.length > 0 ? (
            <div className="vn-card">
              <h2 className="subheading text-ink">Recent activity</h2>
              <ul className="mt-2 flex flex-col">
                {payload.recent_clicks.map((click) => (
                  <li key={`${click.code}-${click.created_at}`} className="vn-row">
                    <span className="vn-row-lead text-ink-faint">
                      <MousePointerClick className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="vn-row-main">
                      <span className="vn-row-title truncate">/{click.code}</span>
                    </div>
                    <time className="vn-row-meta" dateTime={click.created_at}>
                      {click.timesince || naturaltime(click.created_at)}
                    </time>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
