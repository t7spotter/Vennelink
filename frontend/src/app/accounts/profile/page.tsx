import type { Metadata } from "next";

import { ProfileClient } from "@/components/profile/ProfileClient";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const profile = await requireUser("/accounts/profile/");
  return <ProfileClient profile={profile} />;
}
