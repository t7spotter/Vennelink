"use client";

/**
 * Render-time error boundary. The restore/403/404 soft pages stay in
 * Django; this only covers crashed React subtrees.
 */

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <span className="vn-avatar mx-auto grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger">
          <CircleAlert className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <h1 className="title mt-5 text-ink">Something went wrong</h1>
        <p className="mt-2 body-sm text-ink-soft">
          The page hit an error while loading. The backend may be restarting.
        </p>
        <button type="button" onClick={reset} className="vn-btn vn-btn-primary mt-6">
          Try again
        </button>
      </div>
    </div>
  );
}
