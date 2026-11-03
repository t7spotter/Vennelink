import type { Metadata, Viewport } from "next";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vennelink — self-hosted link shortening",
    template: "%s · Vennelink",
  },
  description: "Self-hosted link shortening with analytics.",
  icons: [{ url: "/favicon.svg", type: "image/svg+xml" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * Resolves the stored system/light/dark preference before first paint, so
 * there is no flash of the wrong theme and the hydrated DOM agrees with
 * what is on screen (ThemeProvider starts from "system" and syncs after
 * mount). Same script as the design system / old Django base.html.
 */
const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("vennelink-theme")||localStorage.getItem("theme")||"system";if(p!=="light"&&p!=="dark"){p=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",p);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
