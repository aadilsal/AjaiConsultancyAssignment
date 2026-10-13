"use client";

import { clsx } from "clsx";
import { ArrowRight, Check, FileText, Keyboard, Loader2, Moon, MoonStar, RefreshCw, Sun, TriangleAlert, Upload, Users, type LucideIcon } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useInView, useReducedMotionPref, useStepper } from "./hooks";
import { Reveal } from "./reveal";

interface VProps {
  active: boolean;
  replay: number;
}

const ease = "transition-[opacity,transform] duration-300 ease-out";
const shown = (on: boolean, from = "translate-y-1.5") => (on ? "opacity-100 translate-y-0 translate-x-0 scale-100" : `opacity-0 ${from}`);

function Avatar({ letter, tone = "primary" }: { letter: string; tone?: "primary" | "accent" | "neutral" }) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
        tone === "primary" && "bg-primary-soft text-primary",
        tone === "accent" && "bg-accent-soft text-accent-text",
        tone === "neutral" && "border border-line bg-surface text-muted",
      )}
    >
      {letter}
    </span>
  );
}

function Bar({ w, strong = false, className }: { w: string; strong?: boolean; className?: string }) {
  return <span className={clsx("block h-2 rounded-full", strong ? "bg-ink/70" : "bg-ink/15", w, className)} />;
}

/* 1. Autosave */
const AUTOSAVE = [450, 1100, 900, 2400] as const;
function AutosaveV({ active, replay }: VProps) {
  const s = useStepper(AUTOSAVE, active, replay);
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div className="rounded-md border border-line bg-surface p-4">
        <Bar w="w-1/2" strong className="h-2.5" />
        <div className="mt-3 space-y-2">
          <Bar w="w-full" />
          <Bar w="w-11/12" />
          <span className={clsx("block h-2 w-2/3 origin-left rounded-full bg-primary/40 transition-transform duration-[1000ms] ease-out", s === 0 ? "scale-x-0" : "scale-x-100")} />
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span
          className={clsx(
            "inline-flex min-w-[124px] items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 font-medium transition-colors duration-150",
            s === 1 ? "text-warning" : "text-muted",
          )}
        >
          {s <= 1 && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
          {s === 2 && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />}
          {s === 3 && <Check className="h-3 w-3 text-primary" strokeWidth={2.25} />}
          {s <= 1 ? "Unsaved changes" : s === 2 ? "Saving…" : "Saved"}
        </span>
        <span className="text-muted">1 s after you stop typing</span>
      </div>
    </div>
  );
}

/* 2. Import */
const IMPORT = [500, 900, 650, 2600] as const;
function ImportV({ active, replay }: VProps) {
  const s = useStepper(IMPORT, active, replay);
  const converted = s >= 2;
  return (
    <div className="relative flex h-full items-center justify-center">
      <div
        className={clsx(
          "relative h-[150px] w-full max-w-[260px] rounded-md border bg-surface p-4 transition-colors duration-300",
          converted ? "border-line" : "border-dashed border-primary/50",
        )}
      >
        <div className={clsx("space-y-2.5", ease, converted ? "opacity-100" : "opacity-0")}>
          <Bar w="w-2/3" strong className="h-2.5" />
          {[0, 1, 2].map((k) => (
            <div key={k} className={clsx("flex items-center gap-2", ease, shown(converted, "translate-x-2"))} style={{ transitionDelay: `${120 + k * 90}ms` }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink/60" />
              <Bar w={k === 1 ? "w-1/2" : "w-3/4"} strong={k === 1} />
            </div>
          ))}
          <Bar w="w-5/6" className="mt-1" />
        </div>
        <div
          className={clsx(
            "absolute inset-0 flex flex-col items-center justify-center gap-1.5 transition-[opacity,transform] duration-500 ease-out",
            s === 0 && "-translate-y-6 opacity-0",
            s === 1 && "translate-y-0 opacity-100",
            converted && "scale-90 opacity-0",
          )}
        >
          <span className="relative inline-flex h-12 w-10 items-center justify-center rounded-sm border border-line bg-canvas">
            <FileText className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <span className="absolute -bottom-2 rounded-sm bg-primary px-1 text-[9px] font-semibold text-on-primary">DOCX</span>
          </span>
          <span className="mt-2 text-[11px] text-muted">notes.docx</span>
        </div>
      </div>
    </div>
  );
}

/* 3. Sharing */
const SHARING = [600, 900, 900, 2800] as const;
function SharingV({ active, replay }: VProps) {
  const s = useStepper(SHARING, active, replay);
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 text-xs">
      <div className="flex items-center gap-2 rounded-md border border-line bg-surface p-2.5">
        <Avatar letter="A" />
        <span className="font-medium text-ink">Alice</span>
        <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">Owner</span>
        <ArrowRight className={clsx("ml-auto h-3.5 w-3.5 text-muted", ease, shown(s >= 1, "-translate-x-1"))} strokeWidth={1.75} />
      </div>
      <div className={clsx("flex items-center gap-2 rounded-md border border-line bg-surface p-2.5", ease, shown(s >= 1))}>
        <Avatar letter="B" tone="accent" />
        <span className="font-medium text-ink">Bob</span>
        <span className="ml-auto whitespace-nowrap rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-text">Shared by Alice</span>
      </div>
      <div className={clsx("flex items-center gap-2 rounded-md border border-dashed border-line p-2.5", ease, shown(s >= 2))}>
        <Avatar letter="C" tone="neutral" />
        <span className="font-medium text-muted">Carol</span>
        <span className="ml-auto font-mono text-[11px] text-muted">404 · Not found</span>
      </div>
    </div>
  );
}

/* 4. Conflict detection */
const CONFLICT = [800, 900, 800, 2800] as const;
function ConflictV({ active, replay }: VProps) {
  const s = useStepper(CONFLICT, active, replay);
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 text-xs">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-md border border-line bg-surface p-3">
          <div className="flex items-center gap-1.5 text-muted">
            <Avatar letter="B" tone="accent" /> Bob
          </div>
          <p className={clsx("mt-2 text-ink", ease, shown(s >= 1))}>
            Saved <span className="font-mono text-muted">v8</span>
          </p>
        </div>
        <div className="rounded-md border border-line bg-surface p-3">
          <div className="flex items-center gap-1.5 text-muted">
            <Avatar letter="Y" /> You
          </div>
          <p className={clsx("mt-2 text-ink", ease, shown(s >= 0))}>
            Editing <span className="font-mono text-muted">from v7</span>
          </p>
        </div>
      </div>
      <div
        className={clsx(
          "flex flex-wrap items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-warning",
          ease,
          shown(s >= 2),
        )}
      >
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span className="font-medium">This document changed elsewhere</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-sm bg-primary px-1.5 py-0.5 text-[10px] font-medium text-on-primary">
          <RefreshCw className="h-2.5 w-2.5" strokeWidth={2} /> Reload latest
        </span>
      </div>
    </div>
  );
}

/* 5. Keyboard-first */
const KEYS = [700, 450, 550, 450, 2000] as const;
function Keycap({ children, down }: { children: ReactNode; down: boolean }) {
  return (
    <kbd
      className={clsx(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-line px-2 font-sans text-xs font-medium text-ink transition-[transform,background-color,box-shadow] duration-100",
        down ? "translate-y-[2px] bg-primary-soft shadow-none" : "bg-surface shadow-[0_2px_0_var(--line)]",
      )}
    >
      {children}
    </kbd>
  );
}
function KeyboardV({ active, replay }: VProps) {
  const s = useStepper(KEYS, active, replay);
  const bold = s >= 1;
  const italic = s >= 3;
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <p className="font-serif text-[17px] text-ink">
        Ship it <span className={clsx("transition-[font-weight] duration-100", bold && "font-bold")}>today</span>,{" "}
        <span className={clsx(italic && "italic")}>carefully</span>.
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Keycap down={s === 1 || s === 3}>Ctrl</Keycap>
        <span className="text-xs text-muted">+</span>
        <Keycap down={s === 1}>B</Keycap>
        <span className="mx-1 text-line">|</span>
        <Keycap down={s === 3}>I</Keycap>
        <Keycap down={false}>U</Keycap>
      </div>
    </div>
  );
}

/* 6. Light and dark */
const THEME = [1800, 1800] as const;
function MiniPage() {
  return (
    <div className="h-full rounded-md border border-line bg-canvas p-2.5">
      <div className="h-full rounded-sm border border-line bg-surface p-3">
        <span className="block h-2 w-2/3 rounded-full bg-ink/70" />
        <span className="mt-2.5 block h-1.5 w-full rounded-full bg-ink/15" />
        <span className="mt-1.5 block h-1.5 w-5/6 rounded-full bg-ink/15" />
        <span className="mt-2.5 inline-block rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] font-semibold text-accent-text">Shared</span>
        <span className="ml-1 inline-block rounded-sm bg-primary px-1.5 py-0.5 text-[9px] font-medium text-on-primary">Share</span>
      </div>
    </div>
  );
}
function ThemeV({ active, replay }: VProps) {
  const s = useStepper(THEME, active, replay);
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="grid h-[118px] grid-cols-2 gap-2.5">
        <div className={clsx("mk-light-scope rounded-lg transition-opacity duration-300", s === 0 ? "opacity-100" : "opacity-60")}>
          <MiniPage />
        </div>
        <div className={clsx("dark rounded-lg transition-opacity duration-300", s === 1 ? "opacity-100" : "opacity-60")}>
          <MiniPage />
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="relative inline-flex h-6 w-11 items-center rounded-full border border-line bg-surface">
          <span className={clsx("absolute left-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary transition-transform duration-300 ease-out", s === 1 && "translate-x-5")}>
            {s === 0 ? <Sun className="h-3 w-3" strokeWidth={2} /> : <Moon className="h-3 w-3" strokeWidth={2} />}
          </span>
        </span>
        Follows your system, or pick one
      </div>
    </div>
  );
}

const CARDS: {
  title: string;
  body: string;
  Icon: LucideIcon;
  span: string;
  V: (p: VProps) => ReactNode;
}[] = [
  { title: "Autosave you can see", body: "Every change saves a second after you stop typing. The status is always on screen, never a toast.", Icon: Check, span: "lg:col-span-2", V: AutosaveV },
  { title: "Import .docx, .md, .txt", body: "Drop in a file up to 5 MB. Headings, lists and emphasis come across.", Icon: Upload, span: "", V: ImportV },
  { title: "Owner-controlled sharing", body: "Share by email as Editor or Viewer. Everyone else gets Not found.", Icon: Users, span: "", V: SharingV },
  { title: "No silent overwrites", body: "Each save carries the version it started from. If someone saved first, you choose: reload or overwrite.", Icon: TriangleAlert, span: "lg:col-span-2", V: ConflictV },
  { title: "Keyboard-first", body: "Every toolbar action has a shortcut, and the toolbar shows what's active.", Icon: Keyboard, span: "lg:col-span-2", V: KeyboardV },
  { title: "Light and dark", body: "Both themes are designed, not inverted.", Icon: MoonStar, span: "", V: ThemeV },
];

function BentoCard({ card, index }: { card: (typeof CARDS)[number]; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotionPref();
  const inView = useInView(ref, { margin: "0px 0px -15% 0px" });
  const [replay, setReplay] = useState(0);
  const { V, Icon } = card;
  return (
    <li ref={ref} onPointerEnter={() => setReplay((r) => r + 1)} className={card.span}>
      <Reveal delay={(index % 3) * 60} className="h-full">
        <div className="mk-card flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface">
          <div aria-hidden className="mk-dots h-[200px] border-b border-line bg-canvas px-5 py-4 sm:px-6">
            <V active={inView && !reduce} replay={replay} />
          </div>
          <div className="p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
              <Icon aria-hidden className="h-4 w-4 text-primary" strokeWidth={1.75} />
              {card.title}
            </h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{card.body}</p>
          </div>
        </div>
      </Reveal>
    </li>
  );
}

/** Asymmetric feature grid; each card plays a small product vignette when visible and replays on hover. */
export function Bento() {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {CARDS.map((card, i) => (
        <BentoCard key={card.title} card={card} index={i} />
      ))}
    </ul>
  );
}
