import { FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for doesn't exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-muted">
        <FileQuestion aria-hidden className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <p className="tabular mt-4 text-xs font-medium uppercase tracking-wide text-muted">Error 404</p>
      <h1 className="mt-1 text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-[15px] text-muted">The link may be broken, or the page may have moved.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary-hover active:scale-[0.98]"
        >
          Go to documents
        </Link>
        <Link
          href="/welcome"
          className="inline-flex h-9 items-center rounded-md border border-line bg-surface px-3.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas active:scale-[0.98]"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
