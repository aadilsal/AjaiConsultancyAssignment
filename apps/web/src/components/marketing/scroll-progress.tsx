"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

/** 2px reading-progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 260, damping: 40, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-primary"
      style={{ scaleX: reduce ? scrollYProgress : smooth }}
    />
  );
}
