import type { Metadata } from "next";

import { TransferLink } from "@/components/link/TransferLink";
import { webApiServer } from "@/lib/backend";
import { requireUser } from "@/lib/auth";
import type { LinkDetail } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Transfer link" };

export default async function LinkTransferPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  await requireUser(`/dashboard/links/${code}/transfer/`);
  const { link } = await webApiServer<{ link: LinkDetail }>(`/webapi/links/${code}/`);

  return (
    <div className="mx-auto max-w-xl px-4 pb-16 py-10 sm:px-6">
      <a href={`/dashboard/links/${code}/edit`} className="vn-btn vn-btn-quiet -ml-3 mb-6">
        <span aria-hidden="true">←</span> Back to editing
      </a>
      <TransferLink link={link} />
    </div>
  );
}
