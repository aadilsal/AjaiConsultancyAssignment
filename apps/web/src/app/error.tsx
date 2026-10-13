"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log only the digest/name; never user content.
    console.error("Route error", error.digest ?? error.name);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-warning">
        <AlertTriangle aria-hidden className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-[15px] text-muted">An unexpected error stopped this page from loading. Saved work is not affected.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary-hover active:scale-[0.98]"
        >
          <RotateCw aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Retry
        </button>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md border border-line bg-surface px-3.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas active:scale-[0.98]"
        >
          Go to documents
        </Link>
      </div>
    </main>
  );
}
