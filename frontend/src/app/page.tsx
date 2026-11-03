import Link from "next/link";
import { redirect } from "next/navigation";
import { Rocket } from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { featureIcon } from "@/components/ui/icons";
import { webApiServer } from "@/lib/backend";
import type { SitePayload } from "@/types/api";

// <!-- The old page is templates/pages/landing.html; layout parity here. -->

const TAGLINE =
  "Vennelink is a privacy-conscious URL shortener you run on your own server — own domain, own database, own analytics. Simple, fast, and fully under your control.";

export const dynamic = "force-dynamic";

/** Lockup artwork swaps with the theme, like the old dark:hidden pair. */
function Lockup({ className = "" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/vennelink-lockup.svg"
        alt="Vennelink"
        width={170}
        height={51}
        className={`h-7 w-auto dark:hidden ${className}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/vennelink-lockup-reversed.svg"
        alt="Vennelink"
        width={170}
        height={51}
        className={`hidden h-7 w-auto dark:block ${className}`}
      />
    </>
  );
}

function Header() {
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center font-bold tracking-tight text-ink">
          <Lockup />
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:flex" />
          <Link href="/docs/api" className="vn-nav-link hidden sm:inline-block">
            API
          </Link>
          <Link href="/docs/mcp" className="vn-nav-link hidden sm:inline-block">
            MCP
          </Link>
          <Link href="/accounts/login/" className="vn-nav-link">
            Log in
          </Link>
          <Link href="/accounts/register/" className="vn-btn vn-btn-sm vn-btn-primary">
            Create account
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default async function LandingPage() {
  const site = await webApiServer<SitePayload>("/webapi/site/");
  if (!site.landing_enabled) {
    redirect("/accounts/login/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-8 flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/img/vennelink-lockup.svg"
                  alt="Vennelink"
                  width={510}
                  height={154}
                  className="block h-16 w-auto dark:hidden sm:h-20"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/img/vennelink-lockup-reversed.svg"
                  alt="Vennelink"
                  width={510}
                  height={154}
                  className="hidden h-16 w-auto dark:block sm:h-20"
                />
              </div>
              <p className="vn-tag vn-tag-violet mb-4 h-7 px-3">
                <span className="vn-tag-dot" /> Self-hosted, your data, your domain
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
                Own your short links.
              </h1>
              <p className="body-lg mt-6 max-w-lg text-ink-soft">{TAGLINE}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/accounts/register/" className="vn-btn vn-btn-lg vn-btn-primary">
                  <Rocket className="h-4 w-4" strokeWidth={1.75} /> Get started free
                </Link>
                <Link href="/accounts/login/" className="vn-btn vn-btn-lg vn-btn-secondary">
                  Log in
                </Link>
              </div>
            </div>

            {/* Product preview: a still of the dashboard, kept intentionally static */}
            <div className="relative">
              <div
                className="pointer-events-none absolute -inset-6 bg-mist opacity-60"
                style={{ borderRadius: "var(--radius-md)" }}
                aria-hidden="true"
              />
              <div
                className="vn-card is-raised relative overflow-hidden"
                style={{ padding: 0, borderRadius: "var(--radius-md)" }}
              >
                <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                  ))}
                  <div className="mono-sm ml-3 flex-1 truncate bg-mist px-3 py-1 text-center text-ink-soft" style={{ borderRadius: "var(--radius-full)" }}>
                    {site.site_url}
                  </div>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-3">
                  {[
                    ["Links", "24"],
                    ["Clicks", "1,205"],
                    ["Active", "21"],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="p-3 border border-line"
                      style={{ borderRadius: "var(--radius-sm)" }}
                    >
                      <p className="caption text-ink-faint">{label}</p>
                      <p className="mono mt-1 text-lg font-medium text-ink">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 px-4 pb-5">
                  {site.preview_items.map((item) => {
                    const Icon = featureIcon(item.icon);
                    return (
                      <div
                        key={item.code}
                        className="vn-row border border-line px-2"
                        style={{ borderRadius: "var(--radius-sm)" }}
                      >
                        <span className="vn-avatar vn-avatar-violet h-7 w-7 text-xs">
                          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </span>
                        <div className="vn-row-main">
                          <span className="vn-row-title">{item.title}</span>
                          <span className="mono-sm truncate text-ink-faint">
                            {site.site_url}/{item.code}
                          </span>
                        </div>
                        <span className="vn-tag vn-tag-success">
                          <span className="vn-tag-dot" />
                          active
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="title text-center text-ink">Everything you need, nothing you don&apos;t</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {site.features.map((feature) => {
              const Icon = featureIcon(feature.icon);
              return (
                <div key={feature.title} className="vn-card">
                  <span className="vn-avatar vn-avatar-violet h-10 w-10" style={{ borderRadius: "var(--radius-sm)" }}>
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="label mt-2 text-ink">{feature.title}</h3>
                  <p className="body-sm mt-1.5 text-ink-soft">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5 font-bold text-ink">
            <Lockup />
          </div>
          <p className="body-sm text-center text-ink-soft">
            Self-hosted analytics may include bots. Click counts are not unique visitors.
          </p>
          <div className="flex items-center gap-4 body-sm text-ink-soft">
            <Link href="/docs/api" className="hover:underline">
              API
            </Link>
            <Link href="/docs/mcp" className="hover:underline">
              MCP
            </Link>
            <Link href="/accounts/login/" className="hover:underline">
              Log in
            </Link>
            <Link href="/accounts/register/" className="hover:underline">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
