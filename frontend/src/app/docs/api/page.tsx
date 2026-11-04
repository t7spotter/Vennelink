import Link from "next/link";
import type { Metadata } from "next";

import { webApiServer } from "@/lib/backend";
import type { SitePayload } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "API reference" };

const ENDPOINTS: Array<[string, string, string]> = [
  ["GET", "/api/v1/me/", "Your profile."],
  ["GET", "/api/v1/links/", "List your links. Paginated with ?page=."],
  ["POST", "/api/v1/links/", "Create a short link."],
  ["GET", "/api/v1/links/{code}/", "Retrieve one link by short code."],
  ["PATCH", "/api/v1/links/{code}/", "Partially update a link."],
  ["DELETE", "/api/v1/links/{code}/", "Delete it — click history goes with it."],
  ["POST", "/api/v1/links/{code}/activate/", "Start redirecting again."],
  ["POST", "/api/v1/links/{code}/deactivate/", "Stop redirecting."],
  ["GET", "/api/v1/links/{code}/analytics/", "Per-link analytics. Bots excluded unless ?bots=1."],
  ["GET", "/api/v1/stats/", "Dashboard totals for the current user."],
];

export default async function DocsApiPage() {
  const site = await webApiServer<SitePayload>("/webapi/site/");
  const base = site.site_url;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="vn-btn vn-btn-quiet -ml-3 mb-6">
        <span aria-hidden="true">←</span> Back to landing
      </Link>

      <div className="vn-card is-raised">
        <div className="flex items-start justify-between gap-4">
          <h1 className="heading text-ink">API reference</h1>
          <span className="vn-tag vn-tag-violet">v1</span>
        </div>
        <p className="body-sm mt-2 text-ink-soft">
          A small REST API over everything the dashboard can do. Every endpoint needs an API key; every
          response is JSON.
        </p>

        <h2 className="subheading mt-8 text-ink">Base URL</h2>
        <p className="body-sm mt-2 text-ink-soft">All endpoints below are relative to this installation:</p>
        <pre className="vn-code mt-3">{base}/api/v1/…</pre>

        <h2 className="subheading mt-8 text-ink">Get an API key</h2>
        <p className="body-sm mt-2 text-ink-soft">
          Exchange your username and password for a key. The response is the only time the key is readable —
          store it somewhere safe. It can be re-issued by calling again, and revoked with an authenticated{" "}
          <code className="mono">DELETE</code> (or from the profile page).
        </p>
        <pre className="vn-code mt-3"><code>{`curl -X POST ${base}/api/v1/token/ \\
  -H "Content-Type: application/json" \\
  -d '{"username": "you", "password": "••••••"}'

# → 201
# {"token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"}`}</code></pre>

        <h2 className="subheading mt-8 text-ink">Authentication</h2>
        <p className="body-sm mt-2 text-ink-soft">Send the key on every request. Both header spellings are accepted:</p>
        <pre className="vn-code mt-3"><code>{`Authorization: Bearer <api key>
Authorization: Token <api key>`}</code></pre>

        <h2 className="subheading mt-8 text-ink">Endpoints</h2>
        <p className="body-sm mt-2 text-ink-soft">
          Links are looked up by short code, and every query is scoped to the key&apos;s owner — deleting a link
          removes its click history with it.
        </p>
        <div className="vn-code mt-3">
          <table className="w-full text-left" style={{ whiteSpace: "normal" }}>
            <thead>
              <tr className="caption text-ink-faint">
                <th className="pb-2 pr-3 font-medium">Method</th>
                <th className="pb-2 pr-3 font-medium">Path</th>
                <th className="pb-2 font-medium">What it does</th>
              </tr>
            </thead>
            <tbody className="mono">
              {ENDPOINTS.map(([method, path, description]) => (
                <tr key={`${method}-${path}`} className="border-t border-line/60">
                  <td className="label py-2 pr-3">{method}</td>
                  <td className="py-2 pr-3">{path}</td>
                  <td className="body-sm pr-3">{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="subheading mt-8 text-ink">Create a link</h2>
        <pre className="vn-code mt-3"><code>{`curl -X POST ${base}/api/v1/links/ \\
  -H "Authorization: Bearer ${"$"}VENNELINK_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"destination": "https://example.com/article", "title": "Article"}'

# → 201
# {"code": "k3mQx9", "short_url": "${base}/k3mQx9", …}`}</code></pre>

        <h2 className="subheading mt-8 text-ink">Machine-readable reference</h2>
        <p className="body-sm mt-2 text-ink-soft">Prefer a full OpenAPI portal? The same facts, live and generated:</p>
        <ul className="body-sm mt-3 flex flex-col gap-1.5 text-ink-soft">
          <li>
            <a className="text-violet-ink hover:underline" href="/api/docs/">
              {base}/api/docs/
            </a>{" "}
            — browsable docs with <span className="mono-sm">llms.txt</span> and TypeScript types for agents
          </li>
          <li>
            <a className="text-violet-ink hover:underline" href="/api/schema/">
              {base}/api/schema/
            </a>{" "}
            — the raw OpenAPI 3.0 document
          </li>
        </ul>
        <p className="body-sm mt-4 text-ink-soft">
          Rather let an agent drive than write curl?{" "}
          <Link className="text-violet-ink hover:underline" href="/docs/mcp">
            See the MCP server →
          </Link>
        </p>
      </div>
    </div>
  );
}
