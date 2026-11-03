import type { NextConfig } from "next";

/**
 * Development integration: every request the browser sends lands on this
 * server; Next.js pages answer directly, and anything else (Django's
 * redirect catch-all, QR SVGs, CSV downloads, /admin, /api, /webapi,
 * /mcp, unlock page) is transparently proxied to the Django backend.
 *
 * Same-origin requests mean session cookies and CSRF just work, with the
 * browser origin configured in Django's CSRF_TRUSTED_ORIGINS.
 */
const DJANGO = process.env.DJANGO_BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // The repo root has its own package-lock.json for the legacy Tailwind
  // CLI; lock workspace tracing to this directory so Next uses the
  // frontend lockfile.
  outputFileTracingRoot: __dirname,
  // Don't canonicalize trailing slashes with 308 redirects: Django must
  // receive URLs exactly as the browser sent them. Without this, Next
  // strips the slash (e.g. /admin/login/ -> /admin/login), Django's admin
  // catch-all + admin_view then re-redirects with a double-escaped `next=`
  // query and the two layers loop forever on the admin login chain.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return {
      // Fallback: only paths no Next.js page or asset handles reach Django.
      afterFiles: [
        {
          source: "/:path*",
          destination: `${DJANGO}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
