"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Re-mounts per navigation: subtle fade + 6px slide between app routes.
export default function AppTemplate({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.1 : 0.18, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}
