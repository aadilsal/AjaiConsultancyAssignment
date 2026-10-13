"use client";

import { clsx } from "clsx";
import * as Tooltip from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";
import { initials } from "@/lib/format";
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger" | "quiet";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary shadow-raised hover:-translate-y-px hover:bg-primary-hover",
  ghost: "border border-line bg-surface text-ink hover:bg-canvas",
  danger: "bg-danger text-on-danger hover:brightness-95",
  quiet: "text-muted hover:bg-canvas hover:text-ink",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  size?: "md" | "sm" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "ghost", loading = false, size = "md", className, children, disabled, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-[color,background-color,border-color,transform,box-shadow] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        size === "md" && "h-9 px-3.5",
        size === "sm" && "h-8 px-2.5",
        size === "icon" && "h-8 w-8",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size="sm" decorative />}
      {children}
    </button>
  );
});

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function TextInput({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={clsx(
          "h-10 w-full rounded-md border bg-surface px-3 text-[15px] text-ink placeholder:text-muted/70 transition-colors duration-150 focus:border-primary",
          invalid ? "border-danger" : "border-line",
          className,
        )}
        {...rest}
      />
    );
  },
);

export function Badge({ tone, children }: { tone: "owner" | "shared" | "neutral"; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold",
        tone === "owner" && "bg-primary-soft text-primary",
        tone === "shared" && "bg-accent-soft text-accent-text",
        tone === "neutral" && "border border-line bg-canvas text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-danger">
      {children}
    </p>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-primary-soft font-semibold text-primary",
        size === "sm" ? "h-6 w-6 text-[11px]" : "h-8 w-8 text-xs",
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Radix tooltip; the trigger must already have an accessible name. */
export function Tip({ label, shortcut, children, side = "bottom" }: {
  label: ReactNode;
  shortcut?: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="tooltip-content z-[70] max-w-[280px] rounded-sm bg-ink px-2 py-1 text-xs leading-snug text-canvas shadow-dialog"
        >
          {label}
          {shortcut && <kbd className="ml-2 font-sans text-[11px] opacity-70">{shortcut}</kbd>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Small "?" help affordance with an explanatory tooltip (also reachable by keyboard). */
export function HelpTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tip label={children}>
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:text-ink"
      >
        <HelpCircle aria-hidden className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </Tip>
  );
}

/** SVG spinner; announces itself unless used decoratively inside a labelled control. */
export function Spinner({ size = "md", label = "Loading", decorative = false }: { size?: "sm" | "md"; label?: string; decorative?: boolean }) {
  const px = size === "sm" ? 16 : 24;
  const svg = (
    <svg aria-hidden width={px} height={px} viewBox="0 0 24 24" fill="none" className="animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
  if (decorative) return svg;
  return (
    <span role="status" className="inline-flex">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Shared classes: centred dialog on desktop, bottom sheet on small screens. */
export const DIALOG_CONTENT =
  "dialog-content fixed z-50 border border-line bg-surface p-6 shadow-dialog max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[85dvh] max-sm:overflow-y-auto max-sm:rounded-t-lg max-sm:pb-[max(24px,env(safe-area-inset-bottom))] sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-32px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg";
