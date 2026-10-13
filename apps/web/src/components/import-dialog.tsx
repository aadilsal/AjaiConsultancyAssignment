"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { FileUp, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type DragEvent, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { validateImportFile } from "@/lib/validation";
import { useAlertModal } from "./alert-modal";
import { Button, FieldError, HelpTip, Tip, DIALOG_CONTENT } from "./ui";

const HELP =
  "Supported: .txt, .md, .docx — max 5 MB. Headings, lists, bold, italic and underline are kept; images and tables are dropped.";

export function ImportDialog({ onImported }: { onImported?: () => void }) {
  const router = useRouter();
  const modal = useAlertModal();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  function reset() {
    setFile(null);
    setError(null);
    setDragging(false);
  }

  // Validate on every selection (real-time, zod schema shared with the rules in lib/validation).
  function pick(next: File | null) {
    setFile(next);
    setError(next ? validateImportFile(next) : null);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files.item(0));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    const clientError = validateImportFile(file);
    if (clientError) {
      setError(clientError);
      return;
    }
    setUploading(true);
    try {
      const doc = await api.importDocument(file);
      setUploading(false);
      setOpen(false);
      reset();
      onImported?.();
      const choice = await modal.show({
        tone: "success",
        title: `Imported ${doc.title}`,
        message: "Your file was converted into a new document.",
        actions: [
          { label: "OK", value: "ok", variant: "ghost" },
          { label: "Open document", value: "open", variant: "primary" },
        ],
      });
      if (choice === "open") router.push(`/docs/${doc.id}`);
    } catch (err) {
      setUploading(false);
      void modal.error({ title: "Import failed", message: errorMessage(err) });
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (uploading) return;
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant="ghost">
          <Upload aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Import file
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-scrim" />
        <Dialog.Content className={`${DIALOG_CONTENT} sm:max-w-[440px]`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-1">
              <Dialog.Title className="text-lg font-semibold">Import file</Dialog.Title>
              <HelpTip label="About importing">{HELP}</HelpTip>
            </div>
            <Tip label="Close">
              <Dialog.Close asChild>
                <Button variant="quiet" size="icon" aria-label="Close" disabled={uploading}>
                  <X aria-hidden className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </Tip>
          </div>
          <Dialog.Description className="mt-1 text-sm text-muted">Supported: .txt, .md, .docx — max 5 MB</Dialog.Description>

          <form onSubmit={onSubmit} className="mt-5" noValidate>
            <input
              id="import-file"
              type="file"
              accept=".txt,.md,.docx"
              className="peer sr-only"
              aria-label="Choose file"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "import-error" : undefined}
              onChange={(e) => pick(e.target.files?.item(0) ?? null)}
            />
            <label
              htmlFor="import-file"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={clsx(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
                dragging ? "border-primary bg-primary-soft" : error ? "border-danger bg-canvas" : "border-line bg-canvas hover:border-primary",
              )}
            >
              <FileUp aria-hidden className="h-5 w-5 text-muted" strokeWidth={1.75} />
              {file ? (
                <span className="max-w-full truncate text-sm font-medium text-ink">{file.name}</span>
              ) : (
                <span className="text-sm font-medium">Choose file</span>
              )}
              <span className="text-xs text-muted">{file ? "Click to choose a different file" : "or drag it here"}</span>
            </label>
            {error && <FieldError id="import-error">{error}</FieldError>}
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost" disabled={uploading}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" variant="primary" loading={uploading} disabled={!file || Boolean(error)}>
                Import
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
