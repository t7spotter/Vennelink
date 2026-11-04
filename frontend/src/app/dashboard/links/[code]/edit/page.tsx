import type { Metadata } from "next";

import { LinkEditForm } from "@/components/link/LinkEditForm";
import { webApiServer } from "@/lib/backend";
import { requireUser } from "@/lib/auth";
import type { LinkDetail, SitePayload } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit link" };

export default async function LinkEditPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  await requireUser(`/dashboard/links/${code}/edit/`);
  const [{ link }, site] = await Promise.all([
    webApiServer<{ link: LinkDetail }>(`/webapi/links/${code}/`),
    webApiServer<SitePayload>("/webapi/site/"),
  ]);

  return (
    <div className="mx-auto max-w-xl px-4 pb-16 py-10 sm:px-6">
      <a href="/dashboard" className="vn-btn vn-btn-quiet -ml-3 mb-6">
        <span aria-hidden="true">←</span> Back to dashboard
      </a>
      <LinkEditForm link={link} siteUrl={site.site_url} />
    </div>
  );
}
