"use client";

/**
 * Theme cycle button: system → light → dark → system. Shows the current
 * preference's glyph (SunMoon / Sun / Moon). Renders after mount from the
 * provider state, which starts at "system" to match the server render.
 */

import { Moon, Sun, SunMoon } from "lucide-react";

import { useTheme, type ThemePreference } from "@/components/theme/ThemeProvider";

const GLYPHS: Record<ThemePreference, typeof Sun> = {
  system: SunMoon,
  light: Sun,
  dark: Moon,
};

export function ThemeToggle({
  iconOnly = false,
  className = "",
}: {
  iconOnly?: boolean;
  className?: string;
}) {
  const { preference, cyclePreference } = useTheme();
  const Glyph = GLYPHS[preference];
  const label = preference.charAt(0).toUpperCase() + preference.slice(1);
  return (
    <button
      type="button"
      onClick={cyclePreference}
      className={`vn-nav-link ${className}`}
      aria-label={`Theme: ${label} — click to change`}
      title={`Theme: ${label}`}
    >
      <Glyph className="h-4 w-4" strokeWidth={1.75} />
      {iconOnly ? null : <span>{label}</span>}
    </button>
  );
}
