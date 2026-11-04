import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/* Shared Vennelink primitives. Styling comes from the ported vn-* component
 * classes in globals.css so every page renders with the design system,
 * not bespoke per-page styles. */

export function Card({
  className = "",
  raised = false,
  children,
}: {
  className?: string;
  raised?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`vn-card${raised ? " is-raised" : ""} ${className}`}>{children}</div>
  );
}

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  size?: "sm" | "md" | "lg";
  block?: boolean;
  href?: string;
  external?: boolean;
}

/** Design-system button; renders an <a> when href is given. */
export function Button({
  variant = "primary",
  size = "md",
  block = false,
  href,
  external,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const classes = `vn-btn vn-btn-${variant}${size !== "md" ? ` vn-btn-${size}` : ""}${block ? " vn-btn-block" : ""} ${className}`;
  if (href) {
    return (
      <a
        href={href}
        className={classes}
        {...(external ? { target: "_blank", rel: "noopener" } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}

interface FieldProps {
  id: string;
  label: ReactNode;
  optional?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

/** Label + control + hint/error, the vn-field shape shared by every form. */
export function Field({ id, label, optional, hint, error, children }: FieldProps) {
  return (
    <div className={`vn-field${error ? " is-invalid" : ""}`}>
      <label htmlFor={id} className="vn-field-label">
        <span>{label}</span>
        {optional ? <span className="vn-field-opt">{optional}</span> : null}
      </label>
      {children}
      {hint ? <div className="vn-field-hint">{hint}</div> : null}
      {error ? <p className="vn-field-error">{error}</p> : null}
    </div>
  );
}

export function Notice({
  tone = "info",
  icon: Icon,
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  icon: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={`vn-notice vn-notice-${tone}`}>
      <Icon className="vn-notice-icon h-5 w-5" strokeWidth={1.75} />
      <div className="vn-notice-body">
        {title ? <p className="vn-notice-title">{title}</p> : null}
        {children ? <div className="vn-notice-text">{children}</div> : null}
      </div>
    </div>
  );
}

export { useToast } from "@/components/ui/Toast";

export function Tag({
  tone,
  dot = false,
  className = "",
  title,
  children,
}: {
  tone?: "violet" | "coral" | "apricot" | "success" | "warning" | "danger" | "solid";
  dot?: boolean;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={`vn-tag${tone ? ` vn-tag-${tone}` : ""} ${className}`}
    >
      {dot ? <span className="vn-tag-dot" /> : null}
      {children}
    </span>
  );
}

export function StatusTag({ status, goesLiveAt }: { status: string; goesLiveAt?: string | null }) {
  const tone = status === "active" ? "success" : status === "expired" ? "warning" : undefined;
  return (
    <Tag tone={tone} dot={tone === "success" || status === "expired"} title={goesLiveAt || undefined}>
      {status === "active"
        ? "Active"
        : status === "scheduled"
          ? "Scheduled"
          : status === "expired"
            ? "Expired"
            : "Inactive"}
    </Tag>
  );
}

/** Quick theme cycler lives in components/theme/ThemeToggle.tsx (client). */

export function Tabs({
  children,
  className = "",
  role = "group",
  label,
}: {
  children: ReactNode;
  className?: string;
  role?: string;
  label: string;
}) {
  return (
    <div role={role} aria-label={label} className={`vn-tabs ${className}`}>
      {children}
    </div>
  );
}

/** Pagination pair matching the old table footer. */
export function Pager({
  page,
  numPages,
  onPrevious,
  onNext,
}: {
  page: number;
  numPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (numPages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between" aria-label="Pagination">
      <p className="mono-sm text-ink-soft">
        Page {page} of {numPages}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={onPrevious}>
          Previous
        </Button>
        <Button size="sm" variant="secondary" disabled={page >= numPages} onClick={onNext}>
          Next
        </Button>
      </div>
    </nav>
  );
}

/** Centered auth card wrapper (login/register/2FA/reset pages). */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
