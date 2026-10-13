"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setUnauthorizedHandler } from "@/lib/api";
import { Button } from "./ui";

type Tone = "success" | "error" | "warning" | "danger" | "primary";

export interface ModalAction {
  label: string;
  value: string;
  variant?: "primary" | "ghost" | "danger";
}

export interface ModalOptions {
  tone: Tone;
  title: string;
  message: ReactNode;
  actions: ModalAction[];
  /** Esc / overlay can dismiss (resolves null). Default true. */
  dismissible?: boolean;
  autoCloseMs?: number;
}

interface AlertModalApi {
  show: (opts: ModalOptions) => Promise<string | null>;
  success: (opts: { title: string; message?: ReactNode; autoClose?: boolean }) => Promise<void>;
  error: (opts: { title: string; message: ReactNode; retry?: () => void }) => Promise<void>;
  confirm: (opts: {
    title: string;
    message: ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    tone?: "danger" | "primary";
  }) => Promise<boolean>;
}

const AlertModalContext = createContext<AlertModalApi | null>(null);

export function useAlertModal(): AlertModalApi {
  const ctx = useContext(AlertModalContext);
  if (!ctx) throw new Error("useAlertModal must be used inside AlertModalProvider");
  return ctx;
}

interface Current extends ModalOptions {
  id: number;
  resolve: (value: string | null) => void;
}

const ICONS: Record<Tone, { Icon: typeof Info; className: string }> = {
  success: { Icon: CheckCircle2, className: "text-primary bg-primary-soft" },
  error: { Icon: XCircle, className: "text-danger bg-canvas" },
  danger: { Icon: AlertTriangle, className: "text-danger bg-canvas" },
  warning: { Icon: AlertTriangle, className: "text-warning bg-canvas" },
  primary: { Icon: Info, className: "text-primary bg-primary-soft" },
};

export function AlertModalProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState<Current | null>(null);
  const idRef = useRef(0);
  const currentRef = useRef<Current | null>(null);

  const close = useCallback((value: string | null) => {
    const c = currentRef.current;
    if (!c) return;
    currentRef.current = null;
    setCurrent(null);
    c.resolve(value);
  }, []);

  const show = useCallback((opts: ModalOptions) => {
    // A newer modal replaces an open one (the old one resolves as dismissed).
    currentRef.current?.resolve(null);
    return new Promise<string | null>((resolve) => {
      idRef.current += 1;
      const next: Current = { ...opts, id: idRef.current, resolve };
      currentRef.current = next;
      setCurrent(next);
    });
  }, []);

  const apiValue = useMemo<AlertModalApi>(
    () => ({
      show,
      success: async ({ title, message, autoClose = true }) => {
        await show({
          tone: "success",
          title,
          message: message ?? null,
          actions: [{ label: "OK", value: "ok", variant: "primary" }],
          autoCloseMs: autoClose ? 2500 : undefined,
        });
      },
      error: async ({ title, message, retry }) => {
        const result = await show({
          tone: "error",
          title,
          message,
          actions: retry
            ? [
                { label: "Close", value: "close", variant: "ghost" },
                { label: "Retry", value: "retry", variant: "primary" },
              ]
            : [{ label: "OK", value: "ok", variant: "primary" }],
        });
        if (result === "retry") retry?.();
      },
      confirm: async ({ title, message, confirmLabel, cancelLabel = "Cancel", tone = "primary" }) => {
        const result = await show({
          tone: tone === "danger" ? "danger" : "primary",
          title,
          message,
          actions: [
            { label: cancelLabel, value: "cancel", variant: "ghost" },
            { label: confirmLabel, value: "confirm", variant: tone === "danger" ? "danger" : "primary" },
          ],
        });
        return result === "confirm";
      },
    }),
    [show],
  );

  // Auto-close (success confirmations).
  useEffect(() => {
    if (!current?.autoCloseMs) return;
    const id = current.id;
    const t = window.setTimeout(() => {
      if (currentRef.current?.id === id) close("auto");
    }, current.autoCloseMs);
    return () => window.clearTimeout(t);
  }, [current, close]);

  // Session expiry from any API call shows one modal, then goes to /login.
  useEffect(() => {
    let shown = false;
    setUnauthorizedHandler(() => {
      if (shown) return;
      shown = true;
      void show({
        tone: "warning",
        title: "Session expired",
        message: "Please log in again to continue.",
        actions: [{ label: "OK", value: "ok", variant: "primary" }],
        dismissible: false,
      }).then(() => {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      });
    });
    return () => setUnauthorizedHandler(null);
  }, [show]);

  const dismissible = current?.dismissible !== false;
  const icon = current ? ICONS[current.tone] : null;

  return (
    <AlertModalContext.Provider value={apiValue}>
      {children}
      <AlertDialog.Root
        open={current !== null}
        onOpenChange={(open) => {
          if (!open && dismissible) close(null);
        }}
      >
        <AnimatePresence>
          {current && icon && (
            <AlertDialog.Portal forceMount key={current.id}>
              <AlertDialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-[60] bg-scrim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                />
              </AlertDialog.Overlay>
              <AlertDialog.Content
                asChild
                forceMount
                onEscapeKeyDown={(e) => {
                  if (!dismissible) e.preventDefault();
                }}
              >
                <motion.div
                  className="fixed left-1/2 top-1/2 z-[61] w-[calc(100vw-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-surface p-6 shadow-dialog"
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
                  transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                >
                  <div className="flex gap-4">
                    <span
                      aria-hidden
                      className={clsx("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full", icon.className)}
                    >
                      <icon.Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1 pt-1.5">
                      <AlertDialog.Title className="text-base font-semibold">{current.title}</AlertDialog.Title>
                      <AlertDialog.Description asChild>
                        <div className={clsx("text-sm text-muted", current.message ? "mt-1.5" : "sr-only")}>
                          {current.message || current.title}
                        </div>
                      </AlertDialog.Description>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap justify-end gap-2">
                    {current.actions.map((a) =>
                      a.variant === "ghost" ? (
                        <AlertDialog.Cancel asChild key={a.value}>
                          <Button variant="ghost" onClick={() => close(a.value)}>
                            {a.label}
                          </Button>
                        </AlertDialog.Cancel>
                      ) : (
                        <AlertDialog.Action asChild key={a.value}>
                          <Button variant={a.variant ?? "primary"} onClick={() => close(a.value)}>
                            {a.label}
                          </Button>
                        </AlertDialog.Action>
                      ),
                    )}
                  </div>
                </motion.div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          )}
        </AnimatePresence>
      </AlertDialog.Root>
    </AlertModalContext.Provider>
  );
}
