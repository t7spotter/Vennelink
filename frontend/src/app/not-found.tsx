import Link from "next/link";
import { Bot } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="text-center w-full max-w-sm">
        <span className="vn-avatar mx-auto grid h-14 w-14 place-items-center rounded-full bg-mist text-ink-faint">
          <Bot className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <h1 className="title mt-5 text-ink">Page not found</h1>
        <p className="mt-2 body-sm text-ink-soft">
          This short link doesn&apos;t exist, has been deactivated, or has expired.
        </p>
        <Link href="/dashboard" className="vn-btn vn-btn-primary mt-6">
          Go home
        </Link>
      </div>
    </div>
  );
}
