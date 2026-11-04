import type { Metadata } from "next";

import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { webApiServer } from "@/lib/backend";
import { requireUser } from "@/lib/auth";
import type { DashboardPayload, SitePayload } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // requireUser handles the anonymous → /accounts/login/?next= redirect;
  // its profile payload doubles as the "is signed in" check.
  await requireUser("/dashboard/");
  const [payload, site] = await Promise.all([
    webApiServer<DashboardPayload>("/webapi/dashboard/"),
    webApiServer<SitePayload>("/webapi/site/"),
  ]);

  return (
    <DashboardClient
      initial={payload}
      siteUrl={site.site_url}
      domains={site.extra_domains}
    />
  );
}
