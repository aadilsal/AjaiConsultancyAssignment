"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Tip } from "./ui";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}

/** True only after hydration; avoids theme-dependent markup mismatches. */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

const ORDER = ["system", "light", "dark"] as const;
type ThemeChoice = (typeof ORDER)[number];
const LABEL: Record<ThemeChoice, string> = { system: "System", light: "Light", dark: "Dark" };
const ICON = { system: Monitor, light: Sun, dark: Moon } as const;

interface ViewTransitionDoc {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
}

export function ThemeToggle() {
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  const reduce = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!mounted) {
    return <span aria-hidden className="inline-block h-8 w-8" />;
  }

  const current: ThemeChoice = ORDER.includes(theme as ThemeChoice) ? (theme as ThemeChoice) : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICON[current];

  function apply() {
    const doc = document as Document & ViewTransitionDoc;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setTheme(next);
      return;
    }
    if (!doc.startViewTransition) {
      // Fallback: brief colour cross-fade.
      const root = document.documentElement;
      root.classList.add("theme-fade");
      setTheme(next);
      window.setTimeout(() => root.classList.remove("theme-fade"), 220);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 0;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 400, easing: "cubic-bezier(0.2, 0, 0, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => undefined);
  }

  const label = `Theme: ${LABEL[current]}`;
  return (
    <Tip label={`${label} — switch to ${LABEL[next]}`}>
    <button
      ref={buttonRef}
      type="button"
      onClick={apply}
      className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-md text-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
    >
      <span className="sr-only">{label}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={current}
          aria-hidden
          initial={{ opacity: 0, rotate: reduce ? 0 : -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: reduce ? 0 : 90 }}
          transition={{ duration: reduce ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
          className="inline-flex"
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </motion.span>
      </AnimatePresence>
    </button>
    </Tip>
  );
}
