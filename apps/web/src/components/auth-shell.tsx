import { ArrowLeft, FileText, Upload, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme";

const CAPABILITIES = [
  { icon: FileText, text: "Rich-text docs with autosave" },
  { icon: Upload, text: "Import .txt, .md and .docx" },
  { icon: Users, text: "Share with teammates — owner controls access" },
] as const;

/** Two-column frame shared by the sign-in and create-account pages. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex h-14 w-full max-w-[1040px] items-center justify-between px-4">
        <span className="flex items-center gap-2 text-primary">
          <FileText aria-hidden className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Ajaia Docs</span>
        </span>
        <ThemeToggle />
      </div>
      <main className="mx-auto grid w-full max-w-[1040px] gap-10 px-4 pb-16 pt-8 md:grid-cols-[minmax(0,1fr)_440px] md:gap-16 md:pt-20">
        <div className="md:pt-8">
          <h1 className="text-2xl font-semibold tracking-tight">Documents for small teams.</h1>
          <p className="mt-2 max-w-sm text-[15px] text-muted">
            Write, format and share documents in one place. Changes save as you type.
          </p>
          <ul className="mt-8 space-y-4">
            {CAPABILITIES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px]">
                <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-primary">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-[1040px] flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-5 text-sm text-muted">
        <Link href="/welcome" className="group inline-flex items-center gap-1.5 rounded-sm hover:text-ink">
          <ArrowLeft aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" strokeWidth={1.75} />
          About Ajaia Docs
        </Link>
        <nav aria-label="Legal" className="flex gap-4">
          <Link href="/terms" className="rounded-sm underline-offset-4 hover:text-ink hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="rounded-sm underline-offset-4 hover:text-ink hover:underline">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
