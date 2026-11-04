"use client";

/**
 * Dashboard chrome: fixed sidebar on desktop, top bar + drawer on mobile,
 * theme cycler, and logout (POST to the Django webapi endpoint with CSRF,
 * like every other mutation).
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  Upload,
  User,
  X,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { apiMutate } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts/profile", label: "Profile", icon: User },
  { href: "/dashboard/links/import", label: "Import CSV", icon: Upload },
] as const;

// Export is a file download from Django; a plain anchor is correct there.
const EXPORT_HREF = "/dashboard/links/export.csv";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`vn-nav-link${active ? " is-active" : ""}`}
            onClick={onNavigate}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
      <a href={EXPORT_HREF} className="vn-nav-link">
        <Download className="h-4 w-4" strokeWidth={1.75} />
        Export CSV
      </a>
      <div className="mt-2 border-t border-line pt-3">
        <ThemeToggle />
      </div>
    </nav>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={`flex items-center gap-2 font-bold tracking-tight text-ink ${compact ? "px-2 text-[15px]" : "mb-6 px-2"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/vennelink-app-icon.svg"
        alt=""
        className={compact ? "h-7 w-7 rounded-lg" : "h-8 w-8 rounded-lg"}
      />
      Vennelink
    </Link>
  );
}

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await apiMutate("/webapi/auth/logout/");
    } catch {
      // Even on failure the next navigation re-checks the session.
    }
    router.replace("/accounts/login/");
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className={`vn-nav-link text-left ${className}`}
    >
      <LogOut className="h-4 w-4" strokeWidth={1.75} />
      Log out
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface p-4 lg:flex">
        <Logo />
        <NavLinks />
        <div className="mt-auto">
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <Logo compact />
        <button
          type="button"
          className="vn-nav-link"
          aria-label="Toggle menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((open) => !open)}
        >
          {drawerOpen ? (
            <X className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-20 bg-[#100C24]/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-line bg-surface p-4 lg:hidden ${
          drawerOpen ? "" : "hidden"
        }`}
      >
        <Logo />
        <NavLinks onNavigate={() => setDrawerOpen(false)} />
        <div className="mt-auto">
          <LogoutButton />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 pt-14 lg:pl-64 lg:pt-0">
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
