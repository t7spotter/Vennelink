import Link from "next/link";
import type { Metadata } from "next";
import { Info } from "lucide-react";

import { webApiServer } from "@/lib/backend";
import type { SitePayload } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "MCP server" };

export default async function DocsMcpPage() {
  // Tools come from Django's docs endpoint (mirrors the old context).
  const [site, mcp] = await Promise.all([
    webApiServer<SitePayload>("/webapi/site/"),
    webApiServer<{ tools: Array<{ name: string; description: string; args: string }> }>(
      "/webapi/mcp-docs/",
    ),
  ]);
  const base = site.site_url;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="vn-btn vn-btn-quiet -ml-3 mb-6">
        <span aria-hidden="true">←</span> Back to landing
      </Link>

      <div className="vn-card is-raised">
        <div className="flex items-start justify-between gap-4">
          <h1 className="heading text-ink">MCP server</h1>
          <span className="vn-tag vn-tag-violet">tools</span>
        </div>
        <p className="body-sm mt-2 text-ink-soft">
          Agents (Claude Desktop, Claude Code, Cursor, OpenCode, …) can manage your links over the{" "}
          <a className="text-violet-ink hover:underline" href="https://modelcontextprotocol.io" rel="noopener">
            Model Context Protocol
          </a>
          . One endpoint speaks JSON-RPC 2.0 over HTTP — no stdio process, no extra dependencies. It reuses the
          REST API&apos;s keys, so an agent acts as exactly one user and can be cut off instantly by revoking its
          key.
        </p>

        <h2 className="subheading mt-8 text-ink">Endpoint</h2>
        <pre className="vn-code mt-3">{base}/mcp/</pre>
        <p className="body-sm mt-2 text-ink-soft">
          Stateless Streamable HTTP: send every JSON-RPC message as a <code className="mono">POST</code>; there
          is no session to open and no SSE stream. Requests without a valid key answer{" "}
          <code className="mono">401</code>.
        </p>

        <h2 className="subheading mt-8 text-ink">Authentication</h2>
        <p className="body-sm mt-2 text-ink-soft">
          Same keys as the REST API — exchange your password once (<code className="mono">POST /api/v1/token/</code>
          ), then send the key as a header. Revoke it on the profile page and every MCP session goes dark with it.
        </p>
        <pre className="vn-code mt-3"><code>{`Authorization: Bearer <api key>`}</code></pre>

        <h2 className="subheading mt-8 text-ink">Connect a client</h2>
        <p className="body-sm mt-2 text-ink-soft">
          Add this server to your client&apos;s config (the shape below works for Claude Desktop/Claude Code,
          Cursor and OpenCode):
        </p>
        <pre className="vn-code mt-3"><code>{`{
  "mcpServers": {
    "vennelink": {
      "url": "${base}/mcp/",
      "headers": {
        "Authorization": "Bearer <api key>"
      }
    }
  }
}`}</code></pre>

        <h2 className="subheading mt-8 text-ink">Tools</h2>
        <p className="body-sm mt-2 text-ink-soft">
          Seven tools cover everything the dashboard can do; each one returns JSON text. Ask for{" "}
          <code className="mono">tools/list</code> to get the full input schemas.
        </p>
        <div className="mt-3 flex flex-col">
          {mcp.tools.map((tool) => (
            <div key={tool.name} className="border-b border-line/60 py-2 last:border-0">
              <div className="flex items-baseline gap-2">
                <span className="mono-sm text-violet-ink">{tool.name}</span>
                <span className="body-sm text-ink-soft">{tool.description}</span>
              </div>
              {tool.args ? <p className="mono-sm mt-0.5 text-ink-faint">{tool.args}</p> : null}
            </div>
          ))}
        </div>

        <h2 className="subheading mt-8 text-ink">Try it by hand</h2>
        <p className="body-sm mt-2 text-ink-soft">
          Any MCP client bootstraps with <code className="mono">initialize</code>, then calls tools. The same
          works from curl:
        </p>
        <pre className="vn-code mt-3"><code>{`curl -X POST ${base}/mcp/ \\
  -H "Authorization: Bearer ${"$"}VENNELINK_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call",
       "params": {"name": "create_link",
                  "arguments": {"destination": "https://example.com/article"}}}'

# → {"jsonrpc": "2.0", "id": 1,
#    "result": {"content": [{"type": "text",
#      "text": "{\\"code\\": \\"k3mQx9\\", \\"short_url\\": \\"…/k3mQx9\\", …}"}]}}`}</code></pre>

        <div className="vn-notice vn-notice-info mt-8">
          <Info className="vn-notice-icon h-4 w-4" strokeWidth={1.75} />
          <div className="vn-notice-body">
            <p className="vn-notice-title">Bad input is not a crash</p>
            <p className="vn-notice-text">
              Validation problems come back as an <code className="mono">isError</code> tool result with a
              readable message — only an unknown method or malformed JSON is a JSON-RPC protocol error. Link
              analytics go back at most 90 days per call.
            </p>
          </div>
        </div>

        <p className="body-sm mt-6 text-ink-soft">
          Building your own client instead? The underlying{" "}
          <Link className="text-violet-ink hover:underline" href="/docs/api">
            REST API reference →
          </Link>
        </p>
      </div>
    </div>
  );
}
