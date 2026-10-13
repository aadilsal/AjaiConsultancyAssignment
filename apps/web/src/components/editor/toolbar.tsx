"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { useEditorState, type Editor } from "@tiptap/react";
import { clsx } from "clsx";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import { modKeyLabel } from "@/lib/format";
import { Tip } from "../ui";
import { LinkPopover } from "./link-popover";

const subscribeNoop = () => () => undefined;

export function useModKey(): string {
  return useSyncExternalStore(subscribeNoop, modKeyLabel, () => "Ctrl+");
}

/** Editor shortcuts (after the Ctrl/Cmd prefix), shared with the shortcuts dialog. */
export const SHORTCUTS = {
  bold: "B",
  italic: "I",
  underline: "U",
  strike: "Shift+S",
  highlight: "Shift+H",
  code: "E",
  link: "K",
  h1: "Alt+1",
  h2: "Alt+2",
  h3: "Alt+3",
  alignLeft: "Shift+L",
  alignCenter: "Shift+E",
  alignRight: "Shift+R",
  alignJustify: "Shift+J",
  bullet: "Shift+8",
  ordered: "Shift+7",
  task: "Shift+9",
  quote: "Shift+B",
  codeBlock: "Alt+C",
  undo: "Z",
  redo: "Shift+Z",
} as const;

interface ToolButtonProps {
  label: string;
  shortcut?: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

function ToolButton({ label, shortcut, icon: Icon, onClick, active, disabled, className }: ToolButtonProps) {
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
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
          active ? "bg-primary-soft text-primary" : "text-ink hover:bg-canvas",
          className,
        )}
      >
        <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </button>
    </Tip>
  );
}

function Divider({ className }: { className?: string }) {
  return <span aria-hidden className={clsx("mx-1 h-5 w-px shrink-0 bg-line", className)} />;
}

const MENU_ITEM =
  "flex cursor-default select-none items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-canvas data-[disabled]:opacity-40";
const MENU_CONTENT = "z-50 min-w-[200px] rounded-md border border-line bg-surface p-1 text-ink shadow-dialog";

type Align = "left" | "center" | "right" | "justify";

export function Toolbar({ editor }: { editor: Editor }) {
  const mod = useModKey();
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      highlight: e.isActive("highlight"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      align: ((["center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left") as Align,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      canInlineMark: !e.isActive("codeBlock"),
    }),
  });
  const chain = () => editor.chain().focus();
  const k = (key: keyof typeof SHORTCUTS) => `${mod}${SHORTCUTS[key]}`;
  const textStyle = s.h1 ? "Heading 1" : s.h2 ? "Heading 2" : s.h3 ? "Heading 3" : "Normal text";

  const blockTools = [
    { label: "Checklist", key: "task", icon: ListChecks, active: s.task, run: () => chain().toggleTaskList().run() },
    { label: "Blockquote", key: "quote", icon: Quote, active: s.quote, run: () => chain().toggleBlockquote().run() },
    { label: "Code block", key: "codeBlock", icon: Code2, active: s.codeBlock, run: () => chain().toggleCodeBlock().run() },
  ] as const;

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      aria-orientation="horizontal"
      className="scroll-fade-x flex flex-nowrap items-center gap-0.5"
    >
      <ToolButton label="Undo" shortcut={k("undo")} icon={Undo2} disabled={!s.canUndo} onClick={() => chain().undo().run()} />
      <ToolButton label="Redo" shortcut={k("redo")} icon={Redo2} disabled={!s.canRedo} onClick={() => chain().redo().run()} />
      <Divider />

      <DropdownMenu.Root modal={false}>
        <Tip label="Text style">
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Text style"
              onMouseDown={(e) => e.preventDefault()}
              className="inline-flex h-8 w-[124px] shrink-0 items-center justify-between gap-1 rounded-sm px-2 text-sm text-ink transition-colors duration-150 hover:bg-canvas data-[state=open]:bg-canvas"
            >
              <span className="truncate">{textStyle}</span>
              <ChevronDown aria-hidden className="h-4 w-4 text-muted" strokeWidth={1.75} />
            </button>
          </DropdownMenu.Trigger>
        </Tip>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={6} className={MENU_CONTENT} onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenu.RadioGroup value={textStyle}>
              {[
                { label: "Normal text", run: () => chain().setParagraph().run(), cls: "text-[15px]" },
                { label: "Heading 1", run: () => chain().setHeading({ level: 1 }).run(), cls: "text-lg font-bold" },
                { label: "Heading 2", run: () => chain().setHeading({ level: 2 }).run(), cls: "text-base font-semibold" },
                { label: "Heading 3", run: () => chain().setHeading({ level: 3 }).run(), cls: "text-[15px] font-semibold" },
              ].map((o) => (
                <DropdownMenu.RadioItem key={o.label} value={o.label} onSelect={o.run} className={MENU_ITEM}>
                  <span className="inline-flex w-4 justify-center">
                    <DropdownMenu.ItemIndicator>
                      <Check aria-hidden className="h-4 w-4 text-primary" />
                    </DropdownMenu.ItemIndicator>
                  </span>
                  <span className={clsx("font-serif", o.cls)}>{o.label}</span>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <ToolButton label="Heading 1" shortcut={k("h1")} icon={Heading1} active={s.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()} />
      <ToolButton label="Heading 2" shortcut={k("h2")} icon={Heading2} active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <ToolButton label="Heading 3" shortcut={k("h3")} icon={Heading3} active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
      <Divider />

      <ToolButton label="Bold" shortcut={k("bold")} icon={Bold} active={s.bold} disabled={!s.canInlineMark} onClick={() => chain().toggleBold().run()} />
      <ToolButton label="Italic" shortcut={k("italic")} icon={Italic} active={s.italic} disabled={!s.canInlineMark} onClick={() => chain().toggleItalic().run()} />
      <ToolButton label="Underline" shortcut={k("underline")} icon={Underline} active={s.underline} disabled={!s.canInlineMark} onClick={() => chain().toggleUnderline().run()} />
      <ToolButton label="Strikethrough" shortcut={k("strike")} icon={Strikethrough} active={s.strike} disabled={!s.canInlineMark} onClick={() => chain().toggleStrike().run()} />
      <ToolButton label="Highlight" shortcut={k("highlight")} icon={Highlighter} active={s.highlight} disabled={!s.canInlineMark} onClick={() => chain().toggleHighlight().run()} />
      <ToolButton label="Inline code" shortcut={k("code")} icon={Code} active={s.code} disabled={!s.canInlineMark} onClick={() => chain().toggleCode().run()} />
      <LinkPopover editor={editor} active={s.link} shortcut={k("link")} />
      <Divider />

      <ToggleGroup.Root
        type="single"
        aria-label="Text alignment"
        value={s.align}
        onValueChange={(v) => {
          if (v) chain().setTextAlign(v).run();
        }}
        className="flex shrink-0 items-center gap-0.5"
      >
        {(
          [
            { v: "left", label: "Align left", icon: AlignLeft, key: "alignLeft" },
            { v: "center", label: "Align center", icon: AlignCenter, key: "alignCenter" },
            { v: "right", label: "Align right", icon: AlignRight, key: "alignRight" },
            { v: "justify", label: "Justify", icon: AlignJustify, key: "alignJustify" },
          ] as const
        ).map(({ v, label, icon: Icon, key }) => (
          <Tip key={v} label={label} shortcut={k(key)}>
            <ToggleGroup.Item
              value={v}
              aria-label={label}
              onMouseDown={(e) => e.preventDefault()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink transition-colors duration-150 hover:bg-canvas active:scale-95 data-[state=on]:bg-primary-soft data-[state=on]:text-primary"
            >
              <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </ToggleGroup.Item>
          </Tip>
        ))}
      </ToggleGroup.Root>
      <Divider />

      <ToolButton label="Bullet list" shortcut={k("bullet")} icon={List} active={s.bullet} onClick={() => chain().toggleBulletList().run()} />
      <ToolButton label="Numbered list" shortcut={k("ordered")} icon={ListOrdered} active={s.ordered} onClick={() => chain().toggleOrderedList().run()} />
      {/* Wide screens show block tools inline; narrow screens collapse them into "More". */}
      {blockTools.map((t) => (
        <ToolButton key={t.label} label={t.label} shortcut={k(t.key)} icon={t.icon} active={t.active} onClick={t.run} className="hidden xl:inline-flex" />
      ))}
      <ToolButton label="Horizontal rule" icon={Minus} onClick={() => chain().setHorizontalRule().run()} className="hidden xl:inline-flex" />
      <Divider className="hidden xl:block" />
      <ToolButton label="Clear formatting" icon={RemoveFormatting} onClick={() => chain().unsetAllMarks().clearNodes().run()} className="hidden xl:inline-flex" />

      <DropdownMenu.Root modal={false}>
        <Tip label="More formatting">
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="More formatting"
              onMouseDown={(e) => e.preventDefault()}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-ink transition-colors duration-150 hover:bg-canvas data-[state=open]:bg-canvas xl:hidden"
            >
              <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          </DropdownMenu.Trigger>
        </Tip>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={6} className={MENU_CONTENT} onCloseAutoFocus={(e) => e.preventDefault()}>
            {blockTools.map((t) => (
              <DropdownMenu.CheckboxItem key={t.label} checked={t.active} onSelect={t.run} className={MENU_ITEM}>
                <t.icon aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                <span className="flex-1">{t.label}</span>
                <kbd className="font-sans text-xs text-muted">{k(t.key)}</kbd>
              </DropdownMenu.CheckboxItem>
            ))}
            <DropdownMenu.Item onSelect={() => chain().setHorizontalRule().run()} className={MENU_ITEM}>
              <Minus aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Horizontal rule
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item onSelect={() => chain().unsetAllMarks().clearNodes().run()} className={MENU_ITEM}>
              <RemoveFormatting aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Clear formatting
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
