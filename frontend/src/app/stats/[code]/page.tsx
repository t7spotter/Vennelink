import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicStatsBody } from "@/components/link/PublicStatsBody";
import { ApiError, apiServer } from "@/lib/api";
import { outgoingCookies } from "@/lib/auth";
import type { PublicStatsPayload } from "@/types/api";

export const dynamic = "force-dynamic";

interface PublicStatsResult {
  title: string;
  payload: PublicStatsPayload;
}

async function load(code: string): Promise<PublicStatsResult | null> {
  try {
    const payload = await apiServer<PublicStatsPayload>(`/webapi/public/${code}/`, {
      cookie: await outgoingCookies(),
    });
    return { title: payload.title || `/${payload.code}`, payload };
  } catch (error) {
    // The Django view 403s on expired links; 404 for missing/private ones.
    if (error instanceof ApiError && (error.status === 404 || error.status === 403 || error.status === 429)) {
      return null;
    }
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const result = await load(code);
  return { title: result ? `Stats — ${result.title}` : "Stats" };
}

export default async function PublicStatsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const result = await load(code);
  if (!result) notFound();

  return <PublicStatsBody data={result.payload} />;
}
