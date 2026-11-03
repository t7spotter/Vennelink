"use client";

/**
 * The three password forms (request reset, set a new password via reset
 * link, change password while signed in). Django's validators answer in
 * field-error maps; the hint text (e.g. password rules) is theirs too.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiMutate, ApiError } from "@/lib/api";
import type { FieldErrors } from "@/types/api";

function ErrorList({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="vn-field-error">{error}</p>;
}

export function ResetRequestForm() {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Django always 200s (never reveals whether the email exists); on
  // success we show the "check your email" page.
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const form = new FormData(event.currentTarget);
    try {
      await apiMutate("/webapi/auth/password/reset/", {
        body: { email: String(form.get("email") || "") },
      });
      window.location.href = "/password/reset/done/";
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.errors);
      setBusy(false);
    }
  }

  return (
    <div className="vn-card is-raised">
      <h1 className="heading text-ink">Reset password</h1>
      <p className="body-sm text-ink-soft">
        Enter your account email and we&apos;ll send you a reset link.
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <div className={`vn-field${errors.email ? " is-invalid" : ""}`}>
          <label htmlFor="id_email" className="vn-field-label">
            <span>Email</span>
          </label>
          <input id="id_email" name="email" type="email" autoComplete="email" required className="vn-input" />
          <ErrorList error={errors.email?.[0]} />
        </div>
        <button type="submit" className="vn-btn vn-btn-primary vn-btn-block" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </div>
  );
}

export function ResetConfirmForm({ uidb64, token }: { uidb64: string; token: string }) {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const form = new FormData(event.currentTarget);
    try {
      await apiMutate(`/webapi/auth/password/reset/confirm/${uidb64}/${token}/`, {
        body: {
          new_password1: String(form.get("new_password1") || ""),
          new_password2: String(form.get("new_password2") || ""),
        },
      });
      window.location.href = "/password/reset/complete/";
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.errors);
      setBusy(false);
    }
  }

  return (
    <div className="vn-card is-raised">
      <h1 className="heading text-ink">Choose a new password</h1>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <div className={`vn-field${errors.new_password1 ? " is-invalid" : ""}`}>
          <label htmlFor="id_new_password1" className="vn-field-label">
            <span>New password</span>
          </label>
          <input id="id_new_password1" name="new_password1" type="password" autoComplete="new-password" required className="vn-input" />
          <ErrorList error={errors.new_password1?.[0]} />
        </div>
        <div className={`vn-field${errors.new_password2 ? " is-invalid" : ""}`}>
          <label htmlFor="id_new_password2" className="vn-field-label">
            <span>New password confirmation</span>
          </label>
          <input id="id_new_password2" name="new_password2" type="password" autoComplete="new-password" required className="vn-input" />
          <ErrorList error={errors.new_password2?.[0]} />
        </div>
        {errors.non_field_errors?.[0] ? <ErrorList error={errors.non_field_errors[0]} /> : null}
        <button type="submit" className="vn-btn vn-btn-primary vn-btn-block" disabled={busy}>
          {busy ? "Saving…" : "Set new password"}
        </button>
      </form>
    </div>
  );
}

export function ChangePasswordForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const form = new FormData(event.currentTarget);
    try {
      await apiMutate("/webapi/auth/password/change/", {
        body: {
          old_password: String(form.get("old_password") || ""),
          new_password1: String(form.get("new_password1") || ""),
          new_password2: String(form.get("new_password2") || ""),
        },
      });
      router.push("/password/change/done/");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors);
        // Wrong current password comes through the form error map.
        if (error.status === 401) {
          window.location.href = "/accounts/login/?next=" + encodeURIComponent("/password/change/");
        }
      }
      setBusy(false);
    }
  }

  return (
    <div className="vn-card">
      <h1 className="heading text-ink">Change password</h1>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <div className={`vn-field${errors.old_password ? " is-invalid" : ""}`}>
          <label htmlFor="id_old_password" className="vn-field-label">
            <span>Current password</span>
          </label>
          <input id="id_old_password" name="old_password" type="password" autoComplete="current-password" required className="vn-input" />
          <ErrorList error={errors.old_password?.[0]} />
        </div>
        <div className={`vn-field${errors.new_password1 ? " is-invalid" : ""}`}>
          <label htmlFor="id_new_password1" className="vn-field-label">
            <span>New password</span>
          </label>
          <input id="id_new_password1" name="new_password1" type="password" autoComplete="new-password" required className="vn-input" />
          <ErrorList error={errors.new_password1?.[0]} />
        </div>
        <div className={`vn-field${errors.new_password2 ? " is-invalid" : ""}`}>
          <label htmlFor="id_new_password2" className="vn-field-label">
            <span>New password confirmation</span>
          </label>
          <input id="id_new_password2" name="new_password2" type="password" autoComplete="new-password" required className="vn-input" />
          <ErrorList error={errors.new_password2?.[0]} />
        </div>
        <button type="submit" className="vn-btn vn-btn-primary vn-btn-block" disabled={busy}>
          {busy ? "Changing…" : "Change password"}
        </button>
      </form>
    </div>
  );
}

export function ResetInvalid() {
  return (
    <div className="vn-card is-raised">
      <h1 className="heading text-ink">Invalid reset link</h1>
      <p className="mt-1.5 body-sm text-ink-soft">This password reset link is invalid or has expired.</p>
      <Link href="/password/reset/" className="vn-btn vn-btn-primary mt-4">
        Request a new one
      </Link>
    </div>
  );
}
