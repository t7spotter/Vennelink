import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/AppShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Vennelink" };

/**
 * App chrome shared by every signed-in page (sidebar, mobile bar, theme
 * cycler, logout). The shell renders no data; each page authenticates
 * itself via requireUser before fetching its payload.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
