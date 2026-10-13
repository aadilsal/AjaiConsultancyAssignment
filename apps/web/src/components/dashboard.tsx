"use client";

import { FilePlus2, FileText, Plus, Trash2, Users } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, errorMessage } from "@/lib/api";
import { absoluteTime, relativeTime } from "@/lib/format";
import type { DocList, DocSummary } from "@/lib/types";
import { useAlertModal } from "./alert-modal";
import { ImportDialog } from "./import-dialog";
import { Avatar, Badge, Button, Tip } from "./ui";

const EASE = [0.2, 0, 0, 1] as const;
const COLS = "grid grid-cols-[minmax(0,1fr)_40px] sm:grid-cols-[minmax(0,1fr)_170px_150px_40px] items-center";

export function Dashboard() {
  const router = useRouter();
  const modal = useAlertModal();
  const [docs, setDocs] = useState<DocList | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setDocs(await api.listDocuments());
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createDoc() {
    setCreating(true);
    try {
      const doc = await api.createDocument();
      router.push(`/docs/${doc.id}`);
    } catch (err) {
      setCreating(false);
      void modal.error({ title: "Couldn't create document", message: errorMessage(err), retry: () => void createDoc() });
    }
  }

  async function deleteDoc(doc: DocSummary) {
    const ok = await modal.confirm({
      title: "Delete document?",
      message: `“${doc.title}” will be deleted for you and everyone it's shared with. This can't be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.deleteDocument(doc.id);
      setDocs((d) => (d ? { ...d, owned: d.owned.filter((x) => x.id !== doc.id) } : d));
      void modal.success({ title: "Document deleted", message: `“${doc.title}” was deleted.` });
    } catch (err) {
      void modal.error({ title: "Couldn't delete document", message: errorMessage(err) });
    }
  }

  const newDocButton = (
    <Button variant="primary" onClick={() => void createDoc()} loading={creating}>
      {!creating && <Plus aria-hidden className="h-4 w-4" strokeWidth={2} />}
      New document
    </Button>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted">Your documents and the ones shared with you.</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportDialog onImported={() => void load()} />
          {newDocButton}
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm text-danger">
          <span>{loadError}</span>
          <Button size="sm" variant="ghost" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      )}

      <DocSection
        title="My documents"
        docs={docs?.owned}
        onDelete={deleteDoc}
        empty={
          <EmptyState icon={<FilePlus2 aria-hidden className="h-5 w-5" strokeWidth={1.75} />} text="No documents yet — create one or import a file">
            <Button variant="ghost" size="sm" onClick={() => void createDoc()} disabled={creating}>
              <Plus aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Create a document
            </Button>
          </EmptyState>
        }
      />
      <DocSection
        title="Shared with me"
        docs={docs?.shared}
        empty={
          <EmptyState icon={<Users aria-hidden className="h-5 w-5" strokeWidth={1.75} />} text="Nothing shared with you yet">
            <p className="text-xs text-muted">When someone shares a document with you, it appears here.</p>
          </EmptyState>
        }
      />
    </div>
  );
}

function EmptyState({ icon, text, children }: { icon: ReactNode; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line px-4 py-10 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted">{icon}</span>
      <p className="text-sm font-medium">{text}</p>
      {children}
    </div>
  );
}

interface SectionProps {
  title: string;
  docs: DocSummary[] | undefined;
  empty: ReactNode;
  onDelete?: (doc: DocSummary) => Promise<void>;
}

function DocSection({ title, docs, empty, onDelete }: SectionProps) {
  const reduce = useReducedMotion();
  const headingId = `section-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-2 flex items-baseline gap-2 text-[15px] font-semibold">
        {title}
        {docs && <span className="tabular text-sm font-normal text-muted">{docs.length}</span>}
      </h2>

      {!docs ? (
        <div aria-busy="true" aria-label={`Loading ${title}`} className="overflow-hidden rounded-md border border-line bg-surface">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${COLS} gap-3 border-b border-line px-4 py-3 last:border-b-0`}>
              <div className="h-4 w-1/2 animate-pulse rounded bg-line" />
              <div className="hidden h-4 w-24 animate-pulse rounded bg-line sm:block" />
              <div className="hidden h-4 w-20 animate-pulse rounded bg-line sm:block" />
              <span />
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        empty
      ) : (
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div aria-hidden className={`${COLS} border-b border-line px-4 py-2 text-xs font-medium text-muted`}>
            <span>Title</span>
            <span className="hidden sm:block">Owner</span>
            <span className="hidden sm:block">Last edited</span>
            <span />
          </div>
          <ul>
            <AnimatePresence initial={true}>
              {docs.map((doc, i) => (
                <motion.li
                  key={doc.id}
                  layout={!reduce}
                  initial={{ opacity: 0, y: reduce ? 0 : 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: EASE, delay: reduce ? 0 : Math.min(i, 8) * 0.03 }}
                  className="relative border-b border-line transition-colors duration-150 last:border-b-0 hover:bg-canvas"
                >
                  <div className={`${COLS} gap-3 px-4 py-2.5`}>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileText aria-hidden className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                      {/* Stretched link: the whole row is clickable, name = title. */}
                      <Link
                        href={`/docs/${doc.id}`}
                        className="min-w-0 truncate text-[15px] font-medium after:absolute after:inset-0 after:content-['']"
                      >
                        {doc.title}
                      </Link>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <DocBadges doc={doc} />
                      </span>
                    </div>
                    <div className="hidden min-w-0 items-center gap-2 text-sm text-muted sm:flex">
                      <Avatar name={doc.owner.name} size="sm" />
                      <span className="truncate">{doc.access === "owner" ? "You" : doc.owner.name}</span>
                    </div>
                    <time
                      dateTime={doc.updatedAt}
                      title={absoluteTime(doc.updatedAt)}
                      className="tabular hidden text-sm text-muted sm:block"
                    >
                      Edited {relativeTime(doc.updatedAt)}
                    </time>
                    <div className="relative z-10 flex justify-end">
                      {onDelete && doc.access === "owner" && (
                        <Tip label="Delete document">
                          <Button variant="quiet" size="icon" aria-label={`Delete ${doc.title}`} onClick={() => void onDelete(doc)}>
                            <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                          </Button>
                        </Tip>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </section>
  );
}

function DocBadges({ doc }: { doc: DocSummary }) {
  if (doc.access === "owner") return <Badge tone="owner">Owner</Badge>;
  return (
    <>
      <Badge tone="shared">Shared by {doc.owner.name}</Badge>
      {doc.access === "viewer" && <Badge tone="neutral">View only</Badge>}
    </>
  );
}
