"use client";

/**
 * Standalone transfer page (the edit page also offers transfer via its
 * bottom section; this is the deep-link equivalent of link_transfer.html
 * with the same two-step confirm contract).
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleAlert as AlertGlyph } from "lucide-react";

import { Notice } from "@/components/ui";
import { apiMutate, ApiError } from "@/lib/api";
import type { LinkDetail } from "@/types/api";

export function TransferLink({ link }: { link: LinkDetail }) {
  const router = useRouter();
  const [ownerInput, setOwnerInput] = useState("");
  const [owner, setOwner] = useState("");
  const [stage, setStage] = useState<"lookup" | "confirm">("lookup");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function proceed(nextOwner: string, confirm: boolean) {
    setBusy(true);
    setError("");
    try {
      const data = await apiMutate<{ stage: "confirm" | "done"; new_owner: string }>(
        `/webapi/links/${link.code}/transfer/`,
        { body: { new_owner: nextOwner, confirm } },
      );
      if (data.stage === "done") {
        router.push("/dashboard");
        return;
      }
      setOwner(data.new_owner);
      setStage("confirm");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.errors.detail?.[0] || "That transfer could not happen."
          : "That transfer could not happen.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vn-card">
      <h1 className="heading text-ink">Transfer ownership</h1>

      {error ? (
        <div role="alert" className="border-t border-line pt-6">
          <Notice tone="danger" icon={AlertGlyph}>
            {error}
          </Notice>
        </div>
      ) : null}

      {stage === "confirm" ? (
        <>
          <p className="body-sm mt-1 text-ink-soft">
            Hand <span className="font-medium text-violet-ink">{link.short_url}</span> over to{" "}
            <span className="font-semibold text-ink">{owner}</span>?
          </p>
          <ul className="mt-2 flex flex-col gap-1 body-sm text-ink-soft">
            <li>Click history moves with the link</li>
            <li>Tags are re-created under their account if needed</li>
            <li>You lose access until they transfer it back</li>
          </ul>
          <div className="mt-6 flex gap-3 border-t border-line pt-6">
            <button type="button" className="vn-btn vn-btn-secondary" onClick={() => setStage("lookup")}>
              Cancel
            </button>
            <button
              type="button"
              className="vn-btn vn-btn-primary"
              disabled={busy}
              onClick={() => void proceed(owner, true)}
            >
              {busy ? "Transferring…" : `Transfer to ${owner}`}
            </button>
          </div>
        </>
      ) : (
        <form
          className="flex flex-col gap-4 border-t border-line pt-6"
          onSubmit={(event) => {
            event.preventDefault();
            void proceed(ownerInput, false);
          }}
        >
          <div className="vn-field">
            <input
              type="text"
              value={ownerInput}
              onChange={(event) => setOwnerInput(event.target.value)}
              placeholder="username or email"
              className="vn-input"
              aria-label="Username or email"
            />
          </div>
          <button type="submit" className="vn-btn vn-btn-primary" disabled={busy}>
            {busy ? "Looking up…" : "Look up recipient"}
          </button>
        </form>
      )}
    </div>
  );
}
