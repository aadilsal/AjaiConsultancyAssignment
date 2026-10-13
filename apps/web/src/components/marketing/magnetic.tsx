"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

const MAX_PULL = 8;

/** Pulls its child slightly toward the pointer (fine pointers only), then settles back. */
export function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const [fine, setFine] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Critically damped: settles without overshoot.
  const sx = useSpring(x, { stiffness: 300, damping: 30 });
  const sy = useSpring(y, { stiffness: 300, damping: 30 });

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    const update = () => setFine(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const active = fine && !reduce;

  function onMove(e: PointerEvent<HTMLSpanElement>) {
    if (!active || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    x.set(Math.max(-1, Math.min(1, dx)) * MAX_PULL);
    y.set(Math.max(-1, Math.min(1, dy)) * MAX_PULL * 0.6);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={active ? { x: sx, y: sy } : undefined}
      className={className ?? "inline-flex"}
    >
      {children}
    </motion.span>
  );
}
