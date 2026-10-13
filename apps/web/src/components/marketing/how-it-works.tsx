"use client";

import { clsx } from "clsx";
import { Check, ChevronDown, FileText, PenLine, Share2, Upload, UserMinus, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* Static product states, one per step. */

function Window({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-line bg-surface shadow-page">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <X aria-hidden className="h-4 w-4 text-muted" strokeWidth={1.75} />
      </div>
      <div className="p-4 text-sm">{children}</div>
    </div>
  );
}

function WriteState() {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-line bg-canvas shadow-page">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
        <span className="text-sm font-semibold text-ink">Untitled document</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-0.5 text-[11px] font-medium text-muted">
          <Check aria-hidden className="h-3 w-3 text-primary" strokeWidth={2.25} /> Saved
        </span>
      </div>
      <div className="p-4">
        <div className="rounded-md border border-line bg-surface p-5 font-serif text-ink">
          <p className="text-xl font-bold">Weekly update</p>
          <p className="mt-2 text-[15px] leading-relaxed">
            Shipped the <strong>import flow</strong>. Next week: <em>sharing polish</em>.
          </p>
          <ol className="mt-2 list-decimal pl-5 text-[15px] leading-relaxed">
            <li>Fix the empty-title edge case</li>
            <li>Write the README</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function ImportState() {
  return (
    <Window title="Import file">
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-primary/50 bg-canvas px-4 py-6 text-center">
        <Upload aria-hidden className="h-5 w-5 text-primary" strokeWidth={1.75} />
        <p className="text-ink">Drop a file or choose one</p>
        <p className="text-xs text-muted">.txt, .md or .docx · up to 5 MB</p>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-md border border-line px-3 py-2.5">
        <FileText aria-hidden className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
        <span className="truncate text-ink">meeting-notes.docx</span>
        <span className="ml-auto text-xs text-muted">48 KB</span>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <Check aria-hidden className="h-3.5 w-3.5 text-primary" strokeWidth={2} /> Opens as a new document you own
      </p>
    </Window>
  );
}

function ShareState() {
  return (
    <Window title="Share “Weekly update”">
      <div className="flex gap-2">
        <span className="flex h-9 min-w-0 flex-1 items-center rounded-md border border-primary px-3 text-ink">bob@ajaia.test</span>
        <span className="flex h-9 items-center gap-1 rounded-md border border-line px-2.5 text-ink">
          Editor <ChevronDown aria-hidden className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">People with access</p>
      <ul className="mt-2 divide-y divide-line">
        {[
          { l: "A", n: "Alice", r: "Owner" },
          { l: "B", n: "Bob", r: "Editor" },
        ].map((p) => (
          <li key={p.n} className="flex items-center gap-2.5 py-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">{p.l}</span>
            <span className="text-ink">{p.n}</span>
            <span className="ml-auto text-xs text-muted">{p.r}</span>
          </li>
        ))}
      </ul>
    </Window>
  );
}

function RevokeState() {
  return (
    <div className="w-full space-y-3">
      <Window title="People with access">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-text">B</span>
          <span className="text-muted line-through">Bob</span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-danger">
            <UserMinus aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /> Access removed
          </span>
        </div>
      </Window>
      <div className="rounded-lg border border-dashed border-line bg-canvas px-4 py-5 text-center">
        <p className="font-mono text-2xl font-semibold text-ink">404</p>
        <p className="mt-1 text-sm text-muted">What Bob sees on his next request</p>
      </div>
    </div>
  );
}

const STEPS: { title: string; body: string; Icon: LucideIcon; Visual: () => ReactNode }[] = [
  { title: "Write", body: "Create a document and start typing. Formatting comes from the toolbar or the keyboard, and every change saves itself.", Icon: PenLine, Visual: WriteState },
  { title: "Import", body: "Already have notes? Import a .txt, .md or .docx file and it opens as a new document you can keep editing.", Icon: Upload, Visual: ImportState },
  { title: "Share", body: "Add a teammate by email as Editor or Viewer. It shows up for them under Shared with me straight away.", Icon: Share2, Visual: ShareState },
  { title: "Revoke", body: "Remove someone and their access ends on their very next request, checked on the server, not just hidden.", Icon: UserMinus, Visual: RevokeState },
];

/** Steps on the left highlight as they cross the middle of the viewport; the product state on the right follows. */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <ol className="relative">
        {/* Progress rail */}
        <span aria-hidden className="absolute bottom-6 left-[15px] top-6 hidden w-px bg-line lg:block" />
        <span
          aria-hidden
          className="absolute left-[15px] top-6 hidden h-[calc(100%-3rem)] w-px origin-top bg-primary transition-transform duration-500 ease-out lg:block"
          style={{ transform: `scaleY(${active / (STEPS.length - 1)})` }}
        />
        {STEPS.map(({ title, body, Icon, Visual }, i) => (
          <li
            key={title}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-step={i}
            className="relative py-6 lg:flex lg:min-h-[56vh] lg:items-center"
          >
            <div className="flex gap-4">
              <span
                className={clsx(
                  "relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-300",
                  active === i ? "border-primary bg-primary text-on-primary" : "border-line bg-surface text-muted",
                )}
              >
                {i + 1}
              </span>
              <div className={clsx("transition-opacity duration-300 lg:max-w-md", active === i ? "lg:opacity-100" : "lg:opacity-50")}>
                <h3 className="flex items-center gap-2 text-xl font-semibold text-ink">
                  <Icon aria-hidden className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} />
                  {title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted sm:text-base">{body}</p>
                <div aria-hidden className="mt-6 lg:hidden">
                  <Visual />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div aria-hidden className="hidden lg:block">
        <div className="sticky top-[18vh] grid h-[64vh] place-items-center">
          {STEPS.map(({ title, Visual }, i) => (
            <div
              key={title}
              className={clsx(
                "col-start-1 row-start-1 w-full max-w-[460px] transition-[opacity,transform] duration-500 ease-out",
                active === i ? "translate-y-0 opacity-100" : active > i ? "-translate-y-3 opacity-0" : "translate-y-3 opacity-0",
              )}
            >
              <Visual />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
