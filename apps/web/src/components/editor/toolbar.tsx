"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { clsx } from "clsx";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import { modKeyLabel } from "@/lib/format";
import { Tip } from "../ui";

const subscribeNoop = () => () => undefined;

export function useModKey(): string {
  return useSyncExternalStore(subscribeNoop, modKeyLabel, () => "Ctrl+");
}

interface ToolButtonProps {
  label: string;
  shortcut: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

function ToolButton({ label, shortcut, icon: Icon, onClick, active, disabled }: ToolButtonProps) {
  return (
    <Tip label={label} shortcut={shortcut}>
    <button
      type="button"
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      // Keep the editor selection when clicking toolbar buttons.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        active ? "bg-primary-soft text-primary" : "text-ink hover:bg-canvas",
      )}
    >
      <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </button>
    </Tip>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-line" />;
}

export function Toolbar({ editor }: { editor: Editor }) {
  const mod = useModKey();
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      aria-orientation="horizontal"
      className="flex flex-wrap items-center gap-0.5"
    >
      <ToolButton label="Bold" shortcut={`${mod}B`} icon={Bold} active={s.bold} onClick={() => chain().toggleBold().run()} />
      <ToolButton label="Italic" shortcut={`${mod}I`} icon={Italic} active={s.italic} onClick={() => chain().toggleItalic().run()} />
      <ToolButton label="Underline" shortcut={`${mod}U`} icon={Underline} active={s.underline} onClick={() => chain().toggleUnderline().run()} />
      <Divider />
      <ToolButton label="Heading 1" shortcut={`${mod}Alt+1`} icon={Heading1} active={s.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()} />
      <ToolButton label="Heading 2" shortcut={`${mod}Alt+2`} icon={Heading2} active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <ToolButton label="Heading 3" shortcut={`${mod}Alt+3`} icon={Heading3} active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
      <Divider />
      <ToolButton label="Bullet list" shortcut={`${mod}Shift+8`} icon={List} active={s.bullet} onClick={() => chain().toggleBulletList().run()} />
      <ToolButton label="Numbered list" shortcut={`${mod}Shift+7`} icon={ListOrdered} active={s.ordered} onClick={() => chain().toggleOrderedList().run()} />
      <Divider />
      <ToolButton label="Undo" shortcut={`${mod}Z`} icon={Undo2} disabled={!s.canUndo} onClick={() => chain().undo().run()} />
      <ToolButton label="Redo" shortcut={`${mod}Shift+Z`} icon={Redo2} disabled={!s.canRedo} onClick={() => chain().redo().run()} />
    </div>
  );
}
