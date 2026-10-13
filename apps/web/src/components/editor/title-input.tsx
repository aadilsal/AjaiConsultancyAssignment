"use client";

import { clsx } from "clsx";
import { useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { TITLE_MAX, titleSchema } from "@/lib/validation";
import { useAlertModal } from "../alert-modal";

interface Props {
  docId: string;
  initialTitle: string;
  readOnly: boolean;
}

const COUNTER_FROM = TITLE_MAX - 40;

export function TitleInput({ docId, initialTitle, readOnly }: Props) {
  const modal = useAlertModal();
  const [value, setValue] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(v: string): string | null {
    const r = titleSchema.safeParse(v);
    return r.success ? null : (r.error.issues[0]?.message ?? "Invalid title");
  }

  async function commit() {
    const parsed = titleSchema.safeParse(value);
    if (!parsed.success) {
      // Revert to the last saved title; the inline message explains why.
      setValue(savedRef.current);
      window.setTimeout(() => setError(null), 2500);
      return;
    }
    const next = parsed.data;
    setError(null);
    setValue(next);
    if (next === savedRef.current) return;
    const previous = savedRef.current;
    savedRef.current = next;
    try {
      const res = await api.updateTitle(docId, next);
      savedRef.current = res.title;
      document.title = `${res.title} · Ajaia Docs`;
    } catch (err) {
      savedRef.current = previous;
      setValue(previous);
      void modal.error({ title: "Couldn't rename document", message: errorMessage(err) });
    }
  }

  const showCounter = !readOnly && value.length >= COUNTER_FROM;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        aria-label="Document title"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "title-error" : undefined}
        value={value}
        readOnly={readOnly}
        maxLength={TITLE_MAX}
        spellCheck={false}
        onChange={(e) => {
          setValue(e.target.value);
          setError(validate(e.target.value));
        }}
        onBlur={() => {
          if (!readOnly) void commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.blur();
          } else if (e.key === "Escape") {
            setValue(savedRef.current);
            setError(null);
            requestAnimationFrame(() => inputRef.current?.blur());
          }
        }}
        className={clsx(
          "h-9 w-full min-w-0 truncate rounded-md border bg-transparent px-2 text-[17px] font-semibold text-ink transition-colors duration-150 focus:bg-surface read-only:hover:border-transparent",
          error ? "border-danger" : "border-transparent hover:border-line focus:border-primary",
          showCounter && "pr-16",
        )}
      />
      {showCounter && (
        <span aria-live="polite" className={clsx("tabular pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs", value.length >= TITLE_MAX ? "text-danger" : "text-muted")}>
          {value.length}/{TITLE_MAX}
        </span>
      )}
      {error && (
        <p id="title-error" role="alert" className="absolute left-2 top-full z-10 mt-1 rounded-sm border border-line bg-surface px-2 py-1 text-xs text-danger shadow-raised">
          {error}
        </p>
      )}
    </div>
  );
}
