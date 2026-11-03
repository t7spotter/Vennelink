"use client";

/**
 * Copy-to-clipboard with a transient "Copied" state for the button label,
 * plus a toast via the design system pill.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useToast } from "@/components/ui/Toast";

export function useClipboard(): {
  copied: boolean;
  copy: (text: string) => Promise<void>;
} {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const show = useToast().show;

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        show("Copied to clipboard");
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard API blocked (permissions/insecure context): fall back to a
        // hidden textarea + execCommand so the button still works on http dev.
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        try {
          document.execCommand("copy");
          setCopied(true);
          show("Copied to clipboard");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 2000);
        } finally {
          area.remove();
        }
      }
    },
    [show],
  );

  return { copied, copy };
}
