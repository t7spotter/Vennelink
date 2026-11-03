import Link from "next/link";

/** Centered lockup stacked above the auth cards, like the old templates. */
export function AuthLockup({ size = "h-12" }: { size?: string }) {
  return (
    <Link
      href="/"
      className="mb-8 flex justify-center font-bold tracking-tight text-ink"
    >
      {/* Lockup artwork swaps with the theme, like the old dark:hidden pair. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/vennelink-lockup.svg"
        alt="Vennelink"
        width={170}
        height={51}
        className={`w-auto dark:hidden ${size}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/vennelink-lockup-reversed.svg"
        alt="Vennelink"
        width={170}
        height={51}
        className={`hidden w-auto dark:block ${size}`}
      />
    </Link>
  );
}
