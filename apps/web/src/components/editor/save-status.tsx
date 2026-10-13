"use client";

import { clsx } from "clsx";
import { AlertTriangle, Check, CircleDot, Loader2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { SaveStatus } from "@/hooks/useAutosave";

interface Props {
  status: SaveStatus;
  onRetry: () => void;
}

export function SaveStatusChip({ status, onRetry }: Props) {
  const reduce = useReducedMotion();
  const failed = status === "error" || status === "too-large";

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="save-status"
      className={clsx(
        "inline-flex h-7 items-center overflow-hidden whitespace-nowrap rounded-full border px-2.5 text-[13px] font-medium",
        failed || status === "conflict" ? "border-line bg-surface" : "border-transparent bg-canvas",
        failed || status === "conflict" ? "text-warning" : "text-muted",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={failed ? "failed" : status}
          initial={{ opacity: 0, y: reduce ? 0 : 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -3 }}
          transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
          className="inline-flex items-center gap-1.5"
        >
          {status === "saved" && (
            <>
              <Check aria-hidden className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />
              Saved
            </>
          )}
          {status === "saving" && (
            <>
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          )}
          {status === "unsaved" && (
            <>
              <CircleDot aria-hidden className="h-3.5 w-3.5" />
              Unsaved changes
            </>
          )}
          {failed && (
            <>
              <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
              <span>Not saved — </span>
              <button type="button" onClick={onRetry} className="rounded-sm underline underline-offset-2 hover:text-ink">
                Retry
              </button>
            </>
          )}
          {status === "conflict" && (
            <>
              <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
              Conflict
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
