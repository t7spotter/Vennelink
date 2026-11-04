"use client";

/**
 * Minimal toast: ink pill anchored bottom-center, matching `.ds-toast`
 * in the design system. Used for copy confirmations, bulk outcomes,
 * import summaries — anything the old UI signalled inline.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ToastContextValue {
  show: (message: ReactNode) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ReactNode | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: ReactNode) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* role=status so screen readers announce it without stealing focus */}
      {message ? (
        <div role="status" className="ds-toast">
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
