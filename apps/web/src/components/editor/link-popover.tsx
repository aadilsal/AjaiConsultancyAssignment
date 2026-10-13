"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Popover from "@radix-ui/react-popover";
import type { Editor } from "@tiptap/react";
import { clsx } from "clsx";
import { Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { linkSchema, type LinkInput, type LinkValues } from "@/lib/validation";
import { Button, FieldError, TextInput, Tip } from "../ui";

interface Props {
  editor: Editor;
  active: boolean;
  shortcut: string;
}

export function LinkPopover({ editor, active, shortcut }: Props) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<LinkInput, unknown, LinkValues>({
    resolver: zodResolver(linkSchema),
    mode: "onChange",
    defaultValues: { url: "" },
  });

  // Ctrl/Cmd+K inside the page opens the link editor.
  useEffect(() => {
    const dom = editor.view.dom;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    dom.addEventListener("keydown", onKey);
    return () => dom.removeEventListener("keydown", onKey);
  }, [editor]);

  useEffect(() => {
    if (open) {
      const href = editor.getAttributes("link").href as string | undefined;
      reset({ url: href ?? "" });
    }
  }, [open, editor, reset]);

  function apply({ url }: LinkValues) {
    const { empty } = editor.state.selection;
    if (empty && !editor.isActive("link")) {
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setOpen(false);
  }

  function removeLink() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip label="Link" shortcut={shortcut}>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label="Link"
            aria-pressed={active}
            onMouseDown={(e) => e.preventDefault()}
            className={clsx(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors duration-150 active:scale-95",
              active ? "bg-primary-soft text-primary" : "text-ink hover:bg-canvas",
            )}
          >
            <Link2 aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="start"
          collisionPadding={12}
          className="tooltip-content z-50 w-[min(340px,calc(100vw-24px))] rounded-md border border-line bg-surface p-3 shadow-dialog"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            editor.commands.focus();
          }}
        >
          <form onSubmit={handleSubmit(apply)} noValidate>
            <label htmlFor="link-url" className="mb-1.5 block text-sm font-medium">
              URL
            </label>
            <TextInput
              id="link-url"
              placeholder="https://example.com"
              autoComplete="off"
              invalid={Boolean(errors.url)}
              aria-describedby={errors.url ? "link-error" : undefined}
              {...register("url")}
            />
            {errors.url?.message && <FieldError id="link-error">{errors.url.message}</FieldError>}
            <div className="mt-3 flex justify-end gap-2">
              {active && (
                <Button size="sm" variant="ghost" onClick={removeLink}>
                  Remove link
                </Button>
              )}
              <Button size="sm" type="submit" variant="primary" disabled={!isValid}>
                Apply
              </Button>
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
