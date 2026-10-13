"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Keyboard, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Tip, DIALOG_CONTENT } from "../ui";
import { SHORTCUTS, useModKey } from "./toolbar";

const ROWS: { label: string; keys: string }[] = [
  { label: "Bold", keys: SHORTCUTS.bold },
  { label: "Italic", keys: SHORTCUTS.italic },
  { label: "Underline", keys: SHORTCUTS.underline },
  { label: "Strikethrough", keys: SHORTCUTS.strike },
  { label: "Highlight", keys: SHORTCUTS.highlight },
  { label: "Inline code", keys: SHORTCUTS.code },
  { label: "Link", keys: SHORTCUTS.link },
  { label: "Heading 1 / 2 / 3", keys: "Alt+1 / 2 / 3" },
  { label: "Align left / center / right / justify", keys: "Shift+L / E / R / J" },
  { label: "Bullet list", keys: SHORTCUTS.bullet },
  { label: "Numbered list", keys: SHORTCUTS.ordered },
  { label: "Checklist", keys: SHORTCUTS.task },
  { label: "Blockquote", keys: SHORTCUTS.quote },
  { label: "Code block", keys: SHORTCUTS.codeBlock },
  { label: "Undo", keys: SHORTCUTS.undo },
  { label: "Redo", keys: SHORTCUTS.redo },
  { label: "Print", keys: "P" },
  { label: "Show shortcuts", keys: "/" },
];

export function ShortcutsDialog() {
  const mod = useModKey();
  const [open, setOpen] = useState(false);

  // Ctrl+/ (Cmd+/ on Mac) toggles this dialog from anywhere in the editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Tip label="Keyboard shortcuts" shortcut={`${mod}/`}>
        <Dialog.Trigger asChild>
          <Button variant="quiet" size="icon" aria-label="Keyboard shortcuts">
            <Keyboard aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </Button>
        </Dialog.Trigger>
      </Tip>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-scrim" />
        <Dialog.Content className={`${DIALOG_CONTENT} sm:max-w-[400px]`}>
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">Keyboard shortcuts</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="quiet" size="icon" aria-label="Close">
                <X aria-hidden className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Formatting and editing shortcuts for the document editor.</Dialog.Description>
          <dl className="mt-4 max-h-[60dvh] divide-y divide-line overflow-y-auto text-sm">
            {ROWS.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-4 py-2">
                <dt>{s.label}</dt>
                <dd>
                  <kbd className="tabular rounded-sm border border-line bg-canvas px-1.5 py-0.5 font-sans text-xs text-muted">
                    {mod}{s.keys}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
