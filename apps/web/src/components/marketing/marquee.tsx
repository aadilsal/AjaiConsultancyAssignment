import { Bold, FileCode2, FileText, FileType2, Heading, Italic, List, ListOrdered, Underline, type LucideIcon } from "lucide-react";

const ITEMS: { label: string; Icon: LucideIcon }[] = [
  { label: ".docx", Icon: FileType2 },
  { label: ".md", Icon: FileCode2 },
  { label: ".txt", Icon: FileText },
  { label: "Headings H1–H3", Icon: Heading },
  { label: "Bulleted lists", Icon: List },
  { label: "Numbered lists", Icon: ListOrdered },
  { label: "Bold", Icon: Bold },
  { label: "Italic", Icon: Italic },
  { label: "Underline", Icon: Underline },
];

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} aria-label={hidden ? undefined : "Supported import formats and formatting"} className="flex shrink-0 items-center gap-3 pr-3">
      {ITEMS.map(({ label, Icon }) => (
        <li key={label} className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink">
          <Icon aria-hidden className="h-4 w-4 text-primary" strokeWidth={1.75} />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** Slow, pausable strip of what survives an import. Static (wraps) under reduced motion. */
export function FormatMarquee() {
  return (
    <div className="mk-marquee relative overflow-hidden">
      <div className="mk-marquee-track flex w-max">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
