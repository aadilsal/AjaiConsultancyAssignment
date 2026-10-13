import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** Long-form legal layout: header, sticky contents list on desktop, serif body, closing CTA. */
export function LegalPage({
  icon: Icon,
  title,
  updated,
  intro,
  sections,
}: {
  icon: LucideIcon;
  title: string;
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-[1120px] px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <header className="max-w-[70ch]">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: <time dateTime="2026-10-13">{updated}</time>
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">On this page</p>
            <ol className="mt-3 space-y-2 border-l border-line text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-3 text-muted transition-colors duration-150 hover:border-primary hover:text-ink">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="mk-prose max-w-[70ch]">
          <div className="text-[18px] text-ink">{intro}</div>
          {sections.map((s) => (
            <section key={s.id} aria-labelledby={s.id}>
              <h2 id={s.id}>{s.title}</h2>
              {s.body}
            </section>
          ))}

          <div className="mt-14 flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 font-sans sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] text-ink">Seen enough fine print? The demo takes two minutes.</p>
            <Link
              href="/login"
              className="mk-press group inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-on-primary no-underline transition-colors duration-150 hover:bg-primary-hover"
            >
              Try the live demo
              <ArrowRight aria-hidden className="mk-nudge h-4 w-4" strokeWidth={1.75} />
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
