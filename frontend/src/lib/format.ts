/**
 * Formatting helpers matching the Django template filters the old UI used
 * (`naturaltime`, `intcomma`, referrer cleanups) so the retina of the
 * interface — numbers, dates, relative times — looks identical.
 */

const INT = new Intl.NumberFormat("en-US");

export function intcomma(n: number): string {
  return INT.format(n);
}

/** Approximation of Django's `naturaltime` for recent timestamps. */
export function naturaltime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return days === 1 ? "1 day ago" : `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 9) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.round(days / 30.4);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.round(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function formatDate(iso: string, style: "long" | "medium" = "long"): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    ...(style === "long" ? { month: "long", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" }),
    ...(style === "medium" ? { year: "numeric" } : {}),
  });
}

export function formatDayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Referrers render without the scheme, truncated. */
export function cleanReferrer(referrer: string): string {
  return referrer.replace(/^https?:\/\//, "");
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Dashboard status chip label (matches Link.status). */
export function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "scheduled":
      return "Scheduled";
    case "expired":
      return "Expired";
    default:
      return "Inactive";
  }
}
