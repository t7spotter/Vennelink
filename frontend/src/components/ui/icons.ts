import {
  BarChart3,
  Calendar,
  CalendarClock,
  Github,
  Link2,
  Moon,
  Server,
  ShieldCheck,
  Video,
  type LucideIcon,
} from "lucide-react";

/**
 * The backend sends icon names for feature/preview cards (FEATURES and
 * PREVIEW_ITEMS in links/views.py). Only those names are allowed here so
 * the bundle stays static; unknown names fall back to the link glyph.
 */
const ICONS: Record<string, LucideIcon> = {
  link: Link2,
  "bar-chart-3": BarChart3,
  "shield-check": ShieldCheck,
  "calendar-clock": CalendarClock,
  moon: Moon,
  server: Server,
  github: Github,
  video: Video,
  calendar: Calendar,
};

export function featureIcon(name: string): LucideIcon {
  return ICONS[name] || Link2;
}
