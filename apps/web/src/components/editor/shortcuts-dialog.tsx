"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Keyboard, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Tip, DIALOG_CONTENT } from "../ui";
import { useModKey } from "./toolbar";

const SHORTCUTS: { label: string; keys: (mod: string) => string }[] = [
  { label: "Bold", keys: (m) => `${m}B` },
  { label: "Italic", keys: (m) => `${m}I` },
  { label: "Underline", keys: (m) => `${m}U` },
  { label: "Heading 1 / 2 / 3", keys: (m) => `${m}Alt+1 / 2 / 3` },
  { label: "Bullet list", keys: (m) => `${m}Shift+8` },
  { label: "Numbered list", keys: (m) => `${m}Shift+7` },
  { label: "Undo", keys: (m) => `${m}Z` },
  { label: "Redo", keys: (m) => `${m}Shift+Z` },
  { label: "Show shortcuts", keys: (m) => `${m}/` },
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
          <dl className="mt-4 divide-y divide-line text-sm">
            {SHORTCUTS.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-4 py-2">
                <dt>{s.label}</dt>
                <dd>
                  <kbd className="tabular rounded-sm border border-line bg-canvas px-1.5 py-0.5 font-sans text-xs text-muted">
                    {s.keys(mod)}
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
