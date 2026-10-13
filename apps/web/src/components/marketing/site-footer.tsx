import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Brand } from "./brand";
import { REPO_URL } from "./links";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-sm">
          <Brand />
          <p className="mt-3 text-sm text-muted">
            A demo document editor built for a take-home assignment. Demo data may be reset at any time.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            <li>
              <Link href="/login" className="mk-link text-ink">Open the app</Link>
            </li>
            <li>
              <Link href="/terms" className="mk-link text-muted hover:text-ink">Terms</Link>
            </li>
            <li>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1 text-muted hover:text-ink">
                <span className="mk-link">GitHub</span>
                <ArrowUpRight aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
            <li>
              <Link href="/privacy" className="mk-link text-muted hover:text-ink">Privacy</Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-[1120px] px-4 py-4 text-xs text-muted sm:px-6">
          Ajaia Docs is a demo project. No analytics, no third-party trackers.
        </p>
      </div>
    </footer>
  );
}
