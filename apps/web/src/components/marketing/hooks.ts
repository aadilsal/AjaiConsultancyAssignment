"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type RefObject } from "react";

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    const m = window.matchMedia(query);
    m.addEventListener("change", cb);
    return () => m.removeEventListener("change", cb);
  };
}

/** Live media-query match; false during SSR. */
export function useMedia(query: string): boolean {
  const subscribe = useMemo(() => subscribeMedia(query), [query]);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useReducedMotionPref = () => useMedia("(prefers-reduced-motion: reduce)");
export const useFinePointer = () => useMedia("(pointer: fine)");

/** True while the element intersects the viewport (or once, if `once`). */
export function useInView(ref: RefObject<Element | null>, { once = false, margin = "0px" } = {}): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, once, margin]);
  return inView;
}

/**
 * Steps through `durations` while `active`; loops after the last step.
 * Starts on the final frame (what SSR and reduced motion show) until first activated.
 * Bump `replay` to restart from step 0.
 */
export function useStepper(durations: readonly number[], active: boolean, replay = 0): number {
  const last = durations.length - 1;
  const [state, setState] = useState({ step: last, started: false, replay });

  // Restart from the first step when activated for the first time or replayed.
  if (active && (!state.started || state.replay !== replay)) {
    setState({ step: 0, started: true, replay });
  }

  useEffect(() => {
    if (!active || !state.started) return;
    const t = window.setTimeout(
      () => setState((s) => ({ ...s, step: s.step >= last ? 0 : s.step + 1 })),
      durations[state.step],
    );
    return () => window.clearTimeout(t);
  }, [active, state.started, state.step, durations, last]);

  return state.step;
}
