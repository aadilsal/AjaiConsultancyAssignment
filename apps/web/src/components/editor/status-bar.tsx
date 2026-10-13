"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { absoluteTime, relativeTime } from "@/lib/format";
import type { Access } from "@/lib/types";
import { Button, Tip } from "../ui";
import { useModKey } from "./toolbar";

interface Props {
  editor: Editor;
  lastSavedAt: string;
  access: Access;
  ownerName: string;
}

/** Re-render periodically so relative timestamps stay fresh. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function StatusBar({ editor, lastSavedAt, access, ownerName }: Props) {
  const mod = useModKey();
  const now = useNow(30_000);
  const counts = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      words: e.storage.characterCount.words(),
      characters: e.storage.characterCount.characters(),
    }),
  });

  return (
    <div className="sticky bottom-0 z-20 mx-auto w-full max-w-[816px] print:hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-canvas/95 px-4 py-2 text-xs text-muted backdrop-blur-none sm:px-1">
        <span className="tabular">
          {counts.words.toLocaleString()} {counts.words === 1 ? "word" : "words"}
        </span>
        <span aria-hidden>·</span>
        <span className="tabular">
          {counts.characters.toLocaleString()} {counts.characters === 1 ? "character" : "characters"}
        </span>
        <span aria-hidden>·</span>
        <time dateTime={lastSavedAt} title={absoluteTime(lastSavedAt)} className="tabular">
          Last saved {relativeTime(lastSavedAt, now)}
        </time>
        <span className="ml-auto flex items-center gap-2">
          <span>{access === "owner" ? "You own this document" : access === "editor" ? `Editing ${ownerName}’s document` : "Read-only access"}</span>
          <Tip label="Print" shortcut={`${mod}P`}>
            <Button variant="quiet" size="icon" aria-label="Print" onClick={() => window.print()}>
              <Printer aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </Tip>
        </span>
      </div>
    </div>
  );
}
