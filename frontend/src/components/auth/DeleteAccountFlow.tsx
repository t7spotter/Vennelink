"use client";

/**
 * Delete-account plumbing: page load POSTs without confirm_deletion so
 * Django returns {stage: "confirm", link_count}; the confirm button then
 * hard-deletes the account and signs the browser out. Django's response
 * is the authority — this component only renders what it returns.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleAlert } from "lucide-react";

import { Notice } from "@/components/ui";
import { apiMutate, ApiError } from "@/lib/api";
import { intcomma } from "@/lib/format";

const AlertGlyph = CircleAlert;

interface ConfirmPayload {
  link_count: number;
  stage: string;
}

interface DeletedPayload {
  deleted: string;
  message: string;
}

export function DeleteAccountFlow({ username }: { username: string }) {
  const [linkCount, setLinkCount] = useState<number | null>(null);
  const [deleted, setDeleted] = useState<DeletedPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiMutate<ConfirmPayload>("/webapi/me/delete/", { body: {} })
      .then((data) => {
        if (cancelled) return;
        setLinkCount(data.link_count);
      })
      .catch((err) => {
        // 401 means not signed in; the server page will have redirected.
        if (!cancelled && err instanceof ApiError && err.status !== 401) {
          setError(err.errors.detail?.[0] || "Could not load the confirmation state.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmDelete() {
    setError("");
    try {
      const data = await apiMutate<DeletedPayload>("/webapi/me/delete/", {
        body: { confirm_deletion: true },
      });
      // Cookies were cleared server-side; show the notice and stop.
      setDeleted(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.errors.detail?.[0] || "Could not delete the account."
          : "Could not delete the account.",
      );
    }
  }

  if (deleted) {
    return (
      <div className="vn-card is-raised text-center">
        <h1 className="heading text-ink">Account deleted</h1>
        <p className="mt-2 body-sm text-ink-soft">{deleted.message}</p>
        <Link href="/" className="vn-btn vn-btn-primary mt-6">
          Back to the front page
        </Link>
      </div>
    );
  }

  return (
    <div className="vn-card">
      <h1 className="heading text-ink">Delete your account?</h1>
      <p className="body-sm text-ink">
        This permanently removes <span className="font-semibold">{username}</span> and everything under it:
      </p>
      <ul className="flex flex-col gap-1 body-sm text-ink-soft">
        {linkCount === null ? (
          <li>all links and their settings</li>
        ) : (
          <li>
            {intcomma(linkCount)} link{linkCount === 1 ? "" : "s"} and their settings
          </li>
        )}
        <li>all click history and analytics</li>
        <li>API keys, webhooks, digest settings, and active sessions</li>
      </ul>
      <p className="body-sm text-ink-soft">
        Short codes are freed immediately; anyone could register them again. There is no undo.
      </p>

      <div role="alert">
        <Notice tone="danger" icon={AlertGlyph}>
          This action cannot be undone.
        </Notice>
      </div>

      {error ? (
        <div role="alert">
          <Notice tone="danger" icon={AlertGlyph}>
            {error}
          </Notice>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link href="/accounts/profile" className="vn-btn vn-btn-secondary">
          Keep everything
        </Link>
        <button type="button" className="vn-btn vn-btn-danger" onClick={() => void confirmDelete()}>
          Delete account permanently
        </button>
      </div>
    </div>
  );
}
