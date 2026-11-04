"use client";

/**
 * Registration form: posts username/email/password1/password2 (the
 * UserCreationForm field names the backend webapi expects) and navigates
 * to the dashboard once Django logs the new user in. Field errors and the
 * password-strength hints come straight from Django's validators.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleAlert } from "lucide-react";

import { GoogleGlyph } from "@/components/auth/LoginForm";
import { Notice } from "@/components/ui";
import { apiMutate, ApiError } from "@/lib/api";
import type { FieldErrors } from "@/types/api";

const CircleGlyph = CircleAlert;

interface RegisterResponse {
  status: "redirect";
  path: string;
}

export function RegisterForm({ googleOauth }: { googleOauth: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const form = new FormData(event.currentTarget);
    try {
      const data = await apiMutate<RegisterResponse>("/webapi/auth/register/", {
        body: {
          username: String(form.get("username") || ""),
          email: String(form.get("email") || ""),
          password1: String(form.get("password1") || ""),
          password2: String(form.get("password2") || ""),
        },
      });
      router.push(data.path || "/dashboard/");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.errors);
      setBusy(false);
    }
  }

  const field = (name: string, label: string, opts: React.InputHTMLAttributes<HTMLInputElement> & { minLength?: number }) => {
    const error = errors[name]?.[0];
    return (
      <div className={`vn-field${error ? " is-invalid" : ""}`}>
        <label htmlFor={`id_${name}`} className="vn-field-label">
          <span>{label}</span>
        </label>
        <input id={`id_${name}`} name={name} className="vn-input" {...opts} />
        {error ? <p className="vn-field-error">{error}</p> : null}
      </div>
    );
  };

  const formError = errors.non_field_errors?.[0];

  return (
    <div className="vn-card is-raised">
      <h1 className="heading text-ink">Create account</h1>
      <p className="body-sm text-ink-soft">Start shortening links on your own domain.</p>

      {formError ? (
        <div role="alert">
          <Notice tone="danger" icon={CircleGlyph}>
            {formError}
          </Notice>
        </div>
      ) : null}

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {field("username", "Username", {
          type: "text",
          autoComplete: "username",
          autoCapitalize: "none",
          required: true,
        })}
        {field("email", "Email", {
          type: "email",
          autoComplete: "email",
          required: true,
        })}
        {field("password1", "Password", {
          type: "password",
          autoComplete: "new-password",
          required: true,
        })}
        {field("password2", "Password confirmation", {
          type: "password",
          autoComplete: "new-password",
          required: true,
        })}
        <button type="submit" className="vn-btn vn-btn-primary vn-btn-block" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

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
