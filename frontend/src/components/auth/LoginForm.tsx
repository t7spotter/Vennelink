"use client";

/**
 * Login form: posts to Django's /webapi/auth/login/ and follows the
 * three outcomes the backend can return:
 *   {status: "redirect"}     → session established, navigate
 *   {status: "two-factor"}   → TOTP pending, go to the 2FA page
 *   400 {field: [msg], ...}  → inline errors
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleAlert } from "lucide-react";

import { Notice } from "@/components/ui";
import { apiMutate, ApiError } from "@/lib/api";
import type { FieldErrors } from "@/types/api";

const ErrorIcon = CircleAlert;

interface LoginResponse {
  status: "redirect" | "two-factor";
  path: string;
}

export function LoginForm({ next, googleOauth }: { next: string; googleOauth: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const form = new FormData(event.currentTarget);
    try {
      const data = await apiMutate<LoginResponse>("/webapi/auth/login/", {
        body: {
          username: String(form.get("username") || ""),
          password: String(form.get("password") || ""),
          next,
        },
      });
      if (data.status === "two-factor") {
        router.push(
          next ? `/accounts/two-factor/?next=${encodeURIComponent(next)}` : "/accounts/two-factor/",
        );
      } else {
        router.push(data.path || "/dashboard/");
      }
      // Cookies were set; a full refresh guarantees Django sees the session.
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.errors);
      setBusy(false);
    }
  }

  const fieldError = (name: string) => errors[name]?.[0];
  const formError = errors.non_field_errors?.[0] || errors.detail?.[0];

  return (
    <div className="vn-card is-raised">
      <h1 className="heading text-ink">Log in</h1>
      <p className="body-sm text-ink-soft">Welcome back.</p>

      {formError ? (
        <div role="alert">
          <Notice tone="danger" icon={ErrorIcon}>
            {formError}
          </Notice>
        </div>
      ) : null}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className={`vn-field${fieldError("username") ? " is-invalid" : ""}`}>
          <label htmlFor="id_username" className="vn-field-label">
            <span>Username</span>
          </label>
          <input
            id="id_username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            className="vn-input"
            required
          />
          {fieldError("username") ? (
            <p className="vn-field-error">{fieldError("username")}</p>
          ) : null}
        </div>
        <div className={`vn-field${fieldError("password") ? " is-invalid" : ""}`}>
          <label htmlFor="id_password" className="vn-field-label">
            <span>Password</span>
          </label>
          <input
            id="id_password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="vn-input"
            required
          />
          {fieldError("password") ? (
            <p className="vn-field-error">{fieldError("password")}</p>
          ) : null}
        </div>
        <button type="submit" className="vn-btn vn-btn-primary vn-btn-block" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-center body-sm text-ink-soft">
        <Link href="/password/reset/" className="font-semibold hover:underline">
          Forgot your password?
        </Link>
      </p>

      {googleOauth ? (
        <>
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="caption text-ink-faint">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <a href="/accounts/login/google/" className="vn-btn vn-btn-secondary vn-btn-block">
            <GoogleGlyph />
            Continue with Google
          </a>
        </>
      ) : null}
    </div>
  );
}

export function GoogleGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 2.024C14.427 12.086 18.902 9 24 9c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.618-3.317-11.277-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
