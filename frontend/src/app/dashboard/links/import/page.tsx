import type { Metadata } from "next";
import Link from "next/link";

import { ImportForm } from "@/components/link/ImportForm";
import { webApiServer } from "@/lib/backend";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Import links" };

export default async function LinkImportPage() {
  await requireUser("/dashboard/links/import/");
  const site = await webApiServer<{ max_import_rows: number }>("/webapi/site/");
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="title text-ink">Import links</h1>
        <a href="/dashboard/links/export.csv" className="caption font-semibold text-violet-ink hover:underline">
          Export your links as CSV
        </a>
      </div>
      <ImportForm maxRows={site.max_import_rows} />
      <Link href="/dashboard" className="vn-btn vn-btn-quiet mt-8 -ml-3">
        <span aria-hidden="true">←</span> Back to dashboard
      </Link>
    </main>
  );
}
