import type { Metadata } from "next";

import { LinkAnalyticsClient } from "@/components/link/LinkAnalyticsClient";
import { webApiServer } from "@/lib/backend";
import { requireUser } from "@/lib/auth";
import type { AnalyticsPayload } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Analytics" };

export default async function LinkAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ bots?: string }>;
}) {
  const { code } = await params;
  const { bots } = await searchParams;
  await requireUser(`/dashboard/links/${code}/analytics/`);
  const query = bots === "1" ? "?bots=1" : "";
  const data = await webApiServer<AnalyticsPayload>(`/webapi/analytics/${code}/${query}`);

  return <LinkAnalyticsClient data={data} csvHref={`/dashboard/links/${code}/analytics.csv`} />;
}
