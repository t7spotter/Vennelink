"use client";

/**
 * Theme control: system | light | dark, stored in "vennelink-theme" like the
 * design system (legacy "theme" migrated once). The system preference
 * resolves to an explicit data-theme attribute so token styles and the
 * Tailwind dark: variant always agree.
 *
 * layout.tsx runs a pre-paint script that applies the resolved theme, so
 * there is no flash of the wrong theme and no hydration mismatch: this
 * provider only attaches listeners and starts off agreeing with the DOM.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_KEY = "vennelink-theme";
export const THEME_CYCLES: ThemePreference[] = ["system", "light", "dark"];

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY) || localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // private mode: no persistence, default below
  }
  return "system";
}

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  /** system → light → dark → system */
  cyclePreference: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  setPreference: () => {},
  cyclePreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always start at "system" so the first client render matches the server
  // render (no hydration mismatch). The stored preference is read after
  // mount; the <html data-theme> attribute itself was already resolved
  // pre-paint by the inline script in layout.tsx.
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    setPreferenceState(readPreference());
  }, []);

  const applyTheme = useCallback((pref: ThemePreference) => {
    const resolved =
      pref === "system" && typeof window !== "undefined"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : pref;
    document.documentElement.setAttribute("data-theme", resolved);
    try {
      localStorage.setItem(THEME_KEY, pref);
      localStorage.removeItem("theme"); // pre-rename key; migrate once
    } catch {
      /* private mode: theme won't persist */
    }
    setPreferenceState(pref);
  }, []);

  // Chosen "system" tracks OS changes live.
  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () =>
      document.documentElement.setAttribute(
        "data-theme",
        media.matches ? "dark" : "light",
      );
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const value: ThemeContextValue = {
    preference,
    setPreference: applyTheme,
    cyclePreference: () => {
      const current = preference;
      const next = THEME_CYCLES[(THEME_CYCLES.indexOf(current) + 1) % THEME_CYCLES.length];
      applyTheme(next);
    },
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export const themeIcon = {
  system: "sun-moon",
  light: "sun",
  dark: "moon",
} as const;
