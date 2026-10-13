import { ArrowLeft, Bold, Check, Heading1, Heading2, Italic, List, ListOrdered, Redo2, Share2, Underline, Undo2 } from "lucide-react";

const TOOLS = [
  { Icon: Bold, active: true },
  { Icon: Italic },
  { Icon: Underline },
  { Icon: Heading1 },
  { Icon: Heading2 },
  { Icon: List, active: true },
  { Icon: ListOrdered },
  { Icon: Undo2 },
  { Icon: Redo2 },
] as const;

/** Static, token-coloured picture of the editor as Bob sees Alice's shared document. */
export function EditorMock() {
  return (
    <div
      role="img"
      aria-label="The Ajaia Docs editor showing Q4 Planning Notes, marked Shared by Alice and Saved, with a formatting toolbar and a page containing a heading, a paragraph and a bulleted list."
      className="w-full select-none overflow-hidden rounded-lg border border-line bg-canvas shadow-page"
    >
      <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
        <ArrowLeft className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
        <span className="truncate text-sm font-semibold text-ink">Q4 Planning Notes</span>
        <span className="hidden whitespace-nowrap rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-text min-[400px]:inline-flex">
          Shared by Alice
        </span>
        <span className="ml-auto inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-canvas px-2.5 py-0.5 text-[11px] font-medium text-muted">
          <Check className="h-3 w-3 text-primary" strokeWidth={2.25} />
          Saved
        </span>
        <span className="hidden items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-on-primary sm:inline-flex">
          <Share2 className="h-3 w-3" strokeWidth={2} />
          Share
        </span>
      </div>

      <div className="flex items-center gap-0.5 overflow-hidden border-b border-line bg-surface px-2 py-1.5 sm:px-3">
        {TOOLS.map(({ Icon, ...t }, i) => (
          <span
            key={i}
            className={
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm " +
              ("active" in t && t.active ? "bg-primary-soft text-primary" : "text-ink") +
              (i === 2 || i === 4 || i === 6 ? " mr-1.5" : "")
            }
          >
            <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
          </span>
        ))}
      </div>

      <div className="px-3 pt-4 sm:px-6 sm:pt-6">
        <div className="rounded-t-lg border border-b-0 border-line bg-surface px-5 pb-8 pt-6 font-serif text-ink sm:px-9 sm:pt-8">
          <p className="text-[22px] font-bold leading-tight sm:text-[26px]">Q4 Planning Notes</p>
          <p className="mt-3 text-[14px] leading-relaxed text-ink sm:text-[15px]">
            Goals for the quarter, owners and the <strong>one decision</strong> we need from leadership by Friday.
          </p>
          <p className="mt-4 text-[16px] font-semibold sm:text-[18px]">This quarter</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-relaxed sm:text-[15px]">
            <li>Ship the import flow for .docx files</li>
            <li>
              Review sharing rules with <em>Bob</em>
            </li>
            <li>Draft the hiring plan</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
