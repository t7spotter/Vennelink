"use client";

/**
 * QR popup, mirroring the old <dialog id="qr-modal">. The image is still
 * served by Django's link_qr at the owner's chosen colors — proxied
 * same-origin. Tapping the image copies the short URL.
 */

import { useEffect, useRef } from "react";

import { useClipboard } from "@/lib/useClipboard";

export function QrModal({
  code,
  url,
  onClose,
}: {
  code: string;
  url: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { copy, copied } = useClipboard();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  // Escape closes natively; backdrop clicks close here.
  useEffect(() => {
    const element = dialog.current;
    const onClick = (event: MouseEvent) => {
      if (event.target === element) onClose();
    };
    element?.addEventListener("click", onClick);
    return () => element?.removeEventListener("click", onClick);
  }, [onClose]);

  return (
    <dialog
      ref={dialog}
      className="fixed inset-0 m-auto h-fit w-72 max-w-[90vw] rounded-lg bg-surface p-0 text-ink shadow-md backdrop:bg-[#100C24]/60"
    >
      <div className="p-6">
        <p className="body-sm mb-4 text-ink-soft">
          QR code — <span className="font-mono text-ink">{code}</span>
        </p>
        <button
          type="button"
          className="mx-auto grid place-items-center rounded-md border border-line bg-mist p-3 transition hover:border-violet"
          onClick={() => void copy(url)}
          aria-label="Tap to copy the short URL"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="QR code for the short URL"
            className="h-44 w-44"
            src={`/${code}.qr.svg`}
            width={176}
            height={176}
          />
        </button>
        <p className="mt-4 truncate text-center mono text-ink-soft">{url}</p>
        <p className="mt-1 text-center caption text-ink-faint">
          {copied ? "Copied to clipboard" : "Tap the code to copy the link"}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <a href={`/${code}.qr.svg`} download className="vn-btn vn-btn-sm vn-btn-secondary">
            Download SVG
          </a>
          <button type="button" className="vn-btn vn-btn-sm vn-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
