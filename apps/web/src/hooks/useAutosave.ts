"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict" | "too-large";

const DEBOUNCE_MS = 1000;
const RETRY_DELAYS_MS = [1000, 3000, 10000];

interface Options {
  docId: string;
  initialVersion: number;
  initialSavedAt: string;
  editor: Editor | null;
  enabled: boolean;
  /** Called when the user must act: conflict, too large, or retries exhausted. */
  onConflict?: () => void;
  onFailed?: (message: string) => void;
  onTooLarge?: (message: string) => void;
}

/**
 * Debounced content autosave with optimistic concurrency (baseVersion).
 * One request in flight at a time; local content is never discarded on failure.
 */
export function useAutosave({ docId, initialVersion, initialSavedAt, editor, enabled, onConflict, onFailed, onTooLarge }: Options) {
  const [status, setStatusState] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string>(initialSavedAt);
  const [errorText, setErrorText] = useState<string | null>(null);

  const statusRef = useRef<SaveStatus>("saved");
  const versionRef = useRef(initialVersion);
  const editorRef = useRef<Editor | null>(editor);
  const dirtyRef = useRef(false);
  const inFlightRef = useRef(false);
  const flushAfterRef = useRef(false);
  const debounceRef = useRef<number | null>(null);
  const retryRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const saveRef = useRef<() => Promise<void>>(async () => undefined);

  const eventsRef = useRef({ onConflict, onFailed, onTooLarge });

  useEffect(() => {
    editorRef.current = editor;
    eventsRef.current = { onConflict, onFailed, onTooLarge };
  }, [editor, onConflict, onFailed, onTooLarge]);

  const setStatus = useCallback((s: SaveStatus) => {
    statusRef.current = s;
    setStatusState(s);
  }, []);

  const clearTimers = useCallback(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    if (retryRef.current !== null) window.clearTimeout(retryRef.current);
    debounceRef.current = null;
    retryRef.current = null;
  }, []);

  const schedule = useCallback((delay: number) => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      void saveRef.current();
    }, delay);
  }, []);

  const save = useCallback(async () => {
    const ed = editorRef.current;
    if (!enabled || !ed || ed.isDestroyed || !dirtyRef.current) return;
    if (statusRef.current === "conflict") return; // wait for the user to resolve
    if (inFlightRef.current) {
      flushAfterRef.current = true;
      return;
    }
    clearTimers();
    inFlightRef.current = true;
    dirtyRef.current = false;
    setStatus("saving");
    setErrorText(null);

    try {
      const res = await api.updateContent(docId, ed.getJSON(), versionRef.current);
      versionRef.current = res.version;
      setLastSavedAt(res.updatedAt);
      retryCountRef.current = 0;
      setStatus(dirtyRef.current ? "unsaved" : "saved");
    } catch (err) {
      dirtyRef.current = true; // keep local edits pending
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 409) {
        setStatus("conflict");
        eventsRef.current.onConflict?.();
      } else if (apiErr?.status === 413) {
        setStatus("too-large");
        setErrorText(apiErr.message);
        eventsRef.current.onTooLarge?.(apiErr.message);
      } else {
        setStatus("error");
        setErrorText(apiErr?.message ?? "Couldn't save your changes.");
        const transient = !apiErr || apiErr.status === 0 || apiErr.status >= 500 || apiErr.status === 429;
        const delay = RETRY_DELAYS_MS[retryCountRef.current];
        if (transient && delay !== undefined) {
          retryCountRef.current += 1;
          retryRef.current = window.setTimeout(() => {
            retryRef.current = null;
            void saveRef.current();
          }, delay);
        } else if (apiErr?.status !== 401) {
          eventsRef.current.onFailed?.(apiErr?.message ?? "Couldn't save your changes.");
        }
      }
    } finally {
      inFlightRef.current = false;
    }

    // Edits arrived while saving: save again (immediately if a flush was requested).
    const after = statusRef.current as SaveStatus;
    const blocked = after === "conflict" || after === "too-large" || after === "error";
    if (dirtyRef.current && !blocked) {
      if (flushAfterRef.current) {
        flushAfterRef.current = false;
        void saveRef.current();
      } else {
        schedule(DEBOUNCE_MS);
      }
    }
    flushAfterRef.current = false;
  }, [clearTimers, docId, enabled, schedule, setStatus]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  /** Call on every editor update. */
  const markDirty = useCallback(() => {
    if (!enabled) return;
    dirtyRef.current = true;
    if (statusRef.current === "conflict") return;
    if (statusRef.current !== "saving") setStatus("unsaved");
    schedule(DEBOUNCE_MS);
  }, [enabled, schedule, setStatus]);

  /** Save now if there are pending edits (blur, tab hidden). */
  const flush = useCallback(() => {
    if (!dirtyRef.current || statusRef.current === "conflict") return;
    void saveRef.current();
  }, []);

  const retry = useCallback(() => {
    retryCountRef.current = 0;
    clearTimers();
    dirtyRef.current = true;
    void saveRef.current();
  }, [clearTimers]);

  /** Conflict: discard local edits and load the server copy. */
  const reloadLatest = useCallback(async () => {
    const ed = editorRef.current;
    if (!ed) return;
    const doc = await api.getDocument(docId);
    clearTimers();
    ed.commands.setContent(doc.content, { emitUpdate: false });
    versionRef.current = doc.version;
    setLastSavedAt(doc.updatedAt);
    dirtyRef.current = false;
    setErrorText(null);
    setStatus("saved");
  }, [clearTimers, docId, setStatus]);

  /** Conflict: keep local edits and write them over the latest server version. */
  const overwrite = useCallback(async () => {
    const doc = await api.getDocument(docId);
    versionRef.current = doc.version;
    dirtyRef.current = true;
    setStatus("unsaved");
    await saveRef.current();
  }, [docId, setStatus]);

  // Flush when the tab is hidden; warn before leaving with unsaved edits.
  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || inFlightRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [enabled, flush]);

  // Best-effort flush on unmount (in-app navigation), then stop timers.
  useEffect(() => {
    return () => {
      if (dirtyRef.current && statusRef.current !== "conflict") void saveRef.current();
      clearTimers();
    };
  }, [clearTimers]);

  return { status, lastSavedAt, errorText, markDirty, flush, retry, reloadLatest, overwrite };
}
