"use client";

import { animate } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";

/** Renders the final number (SSR, no JS, reduced motion); ticks up once if it starts below the fold. */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const armed = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.textContent = "0";
    armed.current = true;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !armed.current) return;
    let stop: (() => void) | undefined;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const c = animate(0, value, {
        duration: 1.1,
        ease: [0.2, 0, 0, 1],
        onUpdate: (v) => {
          el.textContent = String(Math.round(v));
        },
      });
      stop = () => c.stop();
    });
    io.observe(el);
    return () => {
      io.disconnect();
      stop?.();
      el.textContent = String(value);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular">
      {value}
    </span>
  );
}
