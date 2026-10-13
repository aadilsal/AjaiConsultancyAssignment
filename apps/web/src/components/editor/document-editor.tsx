"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { AlertTriangle, ArrowLeft, FileQuestion } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useAutosave } from "@/hooks/useAutosave";
import { api, ApiError, errorMessage } from "@/lib/api";
import { editorExtensions } from "@/lib/editor-extensions";
import type { DocDetail } from "@/lib/types";
import { useAlertModal } from "../alert-modal";
import { ThemeToggle } from "../theme";
import { Badge, HelpTip, Tip } from "../ui";
import { SaveStatusChip } from "./save-status";
import { ShareDialog } from "./share-dialog";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { StatusBar } from "./status-bar";
import { TitleInput } from "./title-input";
import { Toolbar } from "./toolbar";

type LoadState =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "error"; message: string }
  | { kind: "ready"; doc: DocDetail };

const EASE = [0.2, 0, 0, 1] as const;

export function DocumentEditor({ id }: { id: string }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    api
      .getDocument(id)
      .then((doc) => {
        if (!active) return;
        setState({ kind: "ready", doc });
        document.title = `${doc.title} · Ajaia Docs`;
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) setState({ kind: "not-found" });
        else setState({ kind: "error", message: errorMessage(err) });
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (state.kind === "loading") return <EditorSkeleton />;
  if (state.kind === "not-found") return <NotFoundState />;
  if (state.kind === "error") {
    return (
      <CenteredMessage icon={<AlertTriangle aria-hidden className="h-6 w-6 text-warning" />} title="Couldn't open this document">
        <p role="alert">{state.message}</p>
      </CenteredMessage>
    );
  }
  return <EditorView doc={state.doc} />;
}

interface AutosaveActions {
  reloadLatest: () => Promise<void>;
  overwrite: () => Promise<void>;
  retry: () => void;
}

function EditorView({ doc }: { doc: DocDetail }) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const modal = useAlertModal();
  const canEdit = doc.access !== "viewer";
  const [scrolled, setScrolled] = useState(false);
  // Autosave callbacks fire before the hook's actions are in scope; bridge through a ref.
  const actionsRef = useRef<AutosaveActions | null>(null);

  const editor = useEditor({
    extensions: editorExtensions,
    content: doc.content,
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Document body",
        "aria-multiline": "true",
        ...(canEdit ? {} : { "aria-readonly": "true" }),
      },
    },
  });

  const onConflict = useCallback(() => {
    void modal
      .show({
        tone: "warning",
        title: "This document changed elsewhere.",
        message:
          "Someone saved a newer version. Reload it (your unsaved edits are discarded) or overwrite it with your copy.",
        dismissible: false,
        actions: [
          { label: "Reload latest", value: "reload", variant: "ghost" },
          { label: "Overwrite", value: "overwrite", variant: "primary" },
        ],
      })
      .then(async (choice) => {
        try {
          if (choice === "reload") await actionsRef.current?.reloadLatest();
          else if (choice === "overwrite") await actionsRef.current?.overwrite();
        } catch (err) {
          void modal.error({ title: "Couldn't resolve the conflict", message: errorMessage(err) });
        }
      });
  }, [modal]);

  const onFailed = useCallback(
    (message: string) => {
      void modal.error({
        title: "Changes not saved",
        message: `${message} Your edits are kept in this tab.`,
        retry: () => actionsRef.current?.retry(),
      });
    },
    [modal],
  );

  const onTooLarge = useCallback(
    (message: string) => {
      void modal.error({ title: "Document is too large to save", message });
    },
    [modal],
  );

  const autosave = useAutosave({
    docId: doc.id,
    initialVersion: doc.version,
    initialSavedAt: doc.updatedAt,
    editor,
    enabled: canEdit,
    onConflict,
    onFailed,
    onTooLarge,
  });
  const { markDirty, flush, reloadLatest, overwrite, retry } = autosave;

  useEffect(() => {
    actionsRef.current = { reloadLatest, overwrite, retry };
  }, [reloadLatest, overwrite, retry]);

  useEffect(() => {
    if (!editor) return;
    editor.on("update", markDirty);
    editor.on("blur", flush);
    return () => {
      editor.off("update", markDirty);
      editor.off("blur", flush);
    };
  }, [editor, markDirty, flush]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function onBack(e: MouseEvent<HTMLAnchorElement>) {
    if (!canEdit || autosave.status === "saved") return;
    e.preventDefault();
    const leave = await modal.confirm({
      title: "Leave without saving?",
      message: "Some changes haven't been saved yet. If you leave now they may be lost.",
      confirmLabel: "Leave",
      cancelLabel: "Stay",
      tone: "danger",
    });
    if (leave) router.push("/");
  }

  return (
    <div className="min-h-dvh">
      <div
        className={`sticky top-0 z-30 border-b bg-canvas transition-shadow duration-150 ${scrolled ? "border-line shadow-raised" : "border-transparent"}`}
      >
        <header className="mx-auto flex h-14 w-full max-w-[1040px] items-center gap-2 px-4">
          <Tip label="Back to documents">
            <Link
              href="/"
              onClick={(e) => void onBack(e)}
              aria-label="Back to documents"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
            >
              <ArrowLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </Link>
          </Tip>
          <div className="min-w-0 flex-1">
            <TitleInput docId={doc.id} initialTitle={doc.title} readOnly={!canEdit} />
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            {doc.access === "owner" ? (
              <Badge tone="owner">Owner</Badge>
            ) : (
              <Badge tone="shared">Shared by {doc.owner.name}</Badge>
            )}
            {!canEdit && <Badge tone="neutral">View only</Badge>}
          </div>
          {canEdit && (
            <div className="flex shrink-0 items-center">
              <SaveStatusChip status={autosave.status} onRetry={autosave.retry} />
              <HelpTip label="About saving">
                Changes save automatically about a second after you stop typing. If someone else saves a newer version
                first, you choose whether to reload theirs or overwrite it with yours.
              </HelpTip>
            </div>
          )}
          <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-line sm:block" />
          <ShortcutsDialog />
          <ThemeToggle />
          {doc.access === "owner" && <ShareDialog docId={doc.id} />}
        </header>
        {canEdit && editor && (
          <div className="mx-auto w-full max-w-[1040px] px-4 pb-2">
            <div className="w-full rounded-md border border-line bg-surface px-1.5 py-1">
              <Toolbar editor={editor} />
            </div>
          </div>
        )}
      </div>

      <motion.main
        initial={{ opacity: 0, y: reduce ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
        className="px-0 pb-24 pt-6 sm:px-4 sm:pt-8"
      >
        <article className="print-page mx-auto min-h-[70vh] w-full max-w-[816px] border-line bg-surface px-4 py-8 shadow-page sm:rounded-lg sm:border sm:px-[72px] sm:py-16">
          {editor ? <EditorContent editor={editor} /> : <PageSkeleton />}
        </article>
        {editor && (
          <StatusBar editor={editor} lastSavedAt={autosave.lastSavedAt} access={doc.access} ownerName={doc.owner.name} />
        )}
      </motion.main>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-7 w-1/2 animate-pulse rounded bg-line" />
      <div className="h-4 w-full animate-pulse rounded bg-line" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-line" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading document">
      <div className="mx-auto flex h-14 max-w-[1040px] items-center gap-3 px-4">
        <div className="h-8 w-8 animate-pulse rounded-md bg-line" />
        <div className="h-6 w-56 animate-pulse rounded bg-line" />
      </div>
      <div className="px-4 pt-14">
        <div className="mx-auto max-w-[816px] rounded-lg border border-line bg-surface px-4 py-16 sm:px-[72px]">
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}

function CenteredMessage({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface">{icon}</span>
      <h1 className="mt-4 text-xl font-semibold">{title}</h1>
      <div className="mt-2 text-[15px] text-muted">{children}</div>
      <Link
        href="/"
        className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary-hover"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Back to documents
      </Link>
    </main>
  );
}

function NotFoundState() {
  return (
    <CenteredMessage icon={<FileQuestion aria-hidden className="h-6 w-6 text-muted" />} title="Not found">
      <p>This document doesn&apos;t exist or you don&apos;t have access.</p>
    </CenteredMessage>
  );
}
