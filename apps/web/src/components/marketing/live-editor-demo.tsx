"use client";

import { clsx } from "clsx";
import { ArrowLeft, Bold, Check, Heading2, Italic, List, ListOrdered, Loader2, Redo2, Share2, Underline, Undo2 } from "lucide-react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useFinePointer, useInView, useMedia, useReducedMotionPref } from "./hooks";

type Save = "saved" | "unsaved" | "saving";
interface Frame {
  n: number;
  sel: boolean;
  bold: boolean;
  save: Save;
  shared: boolean;
  fading: boolean;
  d: number;
}

const HEADING = "Launch plan";
const ITEMS = ["Import last quarter's notes", "Share the draft with Bob", "Ship it on Friday"];
const BOLD_WORD = "Friday";
const LINES = [HEADING, ...ITEMS];
const TOTAL = LINES.reduce((sum, l) => sum + l.length, 0);

// Pre-computed animation script: one frame per typed character plus the editing beats.
const FRAMES: Frame[] = (() => {
  const out: Frame[] = [];
  let cur: Frame = { n: 0, sel: false, bold: false, save: "saved", shared: false, fading: false, d: 600 };
  const push = (patch: Partial<Frame>) => {
    cur = { ...cur, ...patch };
    out.push(cur);
  };
  push({});
  let n = 0;
  for (const line of LINES) {
    for (let i = 0; i < line.length; i++) {
      n += 1;
      const last = i === line.length - 1;
      push({ n, save: "unsaved", d: last ? 320 : line[i] === " " ? 75 : 34 + ((n * 13) % 22) });
    }
  }
  push({ sel: true, d: 520 });
  push({ bold: true, d: 520 });
  push({ sel: false, d: 380 });
  push({ save: "saving", d: 850 });
  push({ save: "saved", d: 650 });
  push({ shared: true, d: 3400 });
  push({ fading: true, d: 380 });
  return out;
})();
const HOLD = FRAMES.length - 2;

function lineText(index: number, n: number): string {
  let before = 0;
  for (let i = 0; i < index; i++) before += LINES[i].length;
  return LINES[index].slice(0, Math.max(0, Math.min(LINES[index].length, n - before)));
}

function caretLine(n: number): number {
  let acc = 0;
  for (let i = 0; i < LINES.length; i++) {
    acc += LINES[i].length;
    if (n < acc) return i;
  }
  return LINES.length - 1;
}

const TOOLS = [Bold, Italic, Underline, Heading2, List, ListOrdered, Undo2, Redo2] as const;

/** Self-typing editor: heading, list, bold, autosave, then a share. Pauses offscreen. */
export function LiveEditorDemo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotionPref();
  const fine = useFinePointer();
  const wide = useMedia("(min-width: 768px)");
  const inView = useInView(wrapRef);
  const [visible, setVisible] = useState(true);
  const [i, setI] = useState(HOLD);

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const running = inView && visible && !reduce;
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setI((x) => (x + 1) % FRAMES.length), FRAMES[i].d);
    return () => window.clearTimeout(t);
  }, [running, i]);

  const f = reduce ? FRAMES[HOLD] : FRAMES[i];
  const typing = !reduce && f.n < TOTAL && i > 0;

  // Two-layer parallax on scroll (shorter on small screens, none under reduced motion).
  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start end", "end start"] });
  const k = reduce ? 0 : wide ? 1 : 0.4;
  const pageY = useTransform(scrollYProgress, [0, 1], [18 * k, -18 * k]);
  const chipY = useTransform(scrollYProgress, [0, 1], [48 * k, -48 * k]);

  // Pointer tilt, max 4deg, fine pointers only.
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 150, damping: 20 });
  const sry = useSpring(ry, { stiffness: 150, damping: 20 });
  const tilt = fine && !reduce;
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!tilt || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 8);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 8);
  }
  function onLeave() {
    rx.set(0);
    ry.set(0);
  }

  const last = ITEMS[ITEMS.length - 1];
  const lastTyped = lineText(LINES.length - 1, f.n);
  const boldStart = last.indexOf(BOLD_WORD);

  return (
    <div
      ref={wrapRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative mx-auto w-full max-w-[600px] [perspective:1200px]"
      role="img"
      aria-label="Animated demo of the Ajaia Docs editor: a heading and a bulleted list are typed, the word Friday is made bold, the save status goes from Unsaved changes to Saving to Saved, and the document is shared with Bob."
    >
      <motion.div style={{ rotateX: tilt ? srx : 0, rotateY: tilt ? sry : 0 }} className="relative [transform-style:preserve-3d]">
        <motion.div style={{ y: pageY }} className="overflow-hidden rounded-lg border border-line bg-canvas shadow-[0_1px_2px_rgb(28_31_35/0.06),0_24px_48px_-12px_rgb(28_31_35/0.18)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.4),0_24px_48px_-12px_rgb(0_0_0/0.6)]">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
            <ArrowLeft aria-hidden className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
            <span className="truncate text-sm font-semibold text-ink">Launch plan</span>
            <span className="hidden rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary min-[420px]:inline">Owner</span>
            <SaveChip state={f.save} />
            <span className="hidden items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-on-primary sm:inline-flex">
              <Share2 aria-hidden className="h-3 w-3" strokeWidth={2} />
              Share
            </span>
          </div>
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 overflow-hidden border-b border-line bg-surface px-2 py-1.5 sm:px-3">
            {TOOLS.map((Icon, t) => {
              const on = (t === 0 && f.sel && f.bold) || (t === 3 && caretLine(f.n) === 0 && typing) || (t === 4 && caretLine(f.n) > 0 && typing);
              return (
                <span
                  key={t}
                  className={clsx(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors duration-150",
                    on ? "bg-primary-soft text-primary" : "text-ink",
                    (t === 2 || t === 5) && "mr-1.5",
                  )}
                >
                  <Icon aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </span>
              );
            })}
          </div>
          {/* Page */}
          <div className="px-3 pt-4 sm:px-6 sm:pt-6">
            <div
              className={clsx(
                "min-h-[232px] rounded-t-lg border border-b-0 border-line bg-surface px-5 pb-8 pt-6 font-serif text-ink transition-opacity duration-300 sm:min-h-[256px] sm:px-9 sm:pt-8",
                f.fading && "opacity-0",
              )}
            >
              <p className="min-h-[1.25em] text-[22px] font-bold leading-tight sm:text-[26px]">
                {lineText(0, f.n)}
                {typing && caretLine(f.n) === 0 && <Caret />}
              </p>
              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed sm:text-[15px]">
                {ITEMS.map((item, idx) => {
                  const text = lineText(idx + 1, f.n);
                  if (!text && caretLine(f.n) !== idx + 1) return null;
                  const isLast = idx === ITEMS.length - 1;
                  return (
                    <li key={item}>
                      {isLast && lastTyped.length > boldStart ? (
                        <>
                          {lastTyped.slice(0, boldStart)}
                          <span
                            className={clsx(
                              "rounded-[3px] transition-colors duration-150",
                              f.sel && "bg-primary-soft",
                              f.bold && "font-bold",
                            )}
                          >
                            {lastTyped.slice(boldStart)}
                          </span>
                        </>
                      ) : (
                        text
                      )}
                      {typing && caretLine(f.n) === idx + 1 && <Caret />}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Floating layer: moves faster than the page on scroll. */}
        <motion.div style={{ y: chipY }} className="pointer-events-none absolute -bottom-5 left-3 sm:-left-6">
          <div
            className={clsx(
              "flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 shadow-dialog transition-[opacity,transform] duration-300 ease-out",
              f.shared ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            )}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-text">B</span>
            <span className="text-xs font-medium text-ink">
              Shared with Bob <span className="text-muted">· Editor</span>
            </span>
          </div>
        </motion.div>
        <motion.div style={{ y: chipY }} className="pointer-events-none absolute -top-4 right-4 sm:-right-5">
          <div
            className={clsx(
              "flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 font-mono text-[11px] text-ink shadow-dialog transition-[opacity,transform] duration-200 ease-out",
              f.sel && f.bold ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
            )}
          >
            <kbd className="rounded-sm border border-line bg-canvas px-1">Ctrl</kbd>
            <kbd className="rounded-sm border border-line bg-canvas px-1">B</kbd>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function Caret() {
  return <span aria-hidden className="mk-caret ml-px inline-block h-[1em] w-px translate-y-[0.15em] bg-primary" />;
}

function SaveChip({ state }: { state: Save }) {
  return (
    <span
      className={clsx(
        "ml-auto inline-flex min-w-[112px] items-center justify-center gap-1 whitespace-nowrap rounded-full bg-canvas px-2.5 py-0.5 text-[11px] font-medium transition-colors duration-150",
        state === "unsaved" ? "text-warning" : "text-muted",
      )}
    >
      {state === "saving" && <Loader2 aria-hidden className="h-3 w-3 animate-spin" strokeWidth={2} />}
      {state === "saved" && <Check aria-hidden className="h-3 w-3 text-primary" strokeWidth={2.25} />}
      {state === "unsaved" && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />}
      {state === "saved" ? "Saved" : state === "saving" ? "Saving…" : "Unsaved changes"}
    </span>
  );
}
