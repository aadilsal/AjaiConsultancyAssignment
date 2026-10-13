import { FileText } from "lucide-react";

/** Branded first-load screen: wordmark + indeterminate progress line. */
export function BrandLoader() {
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <span className="flex items-center gap-2 text-primary">
        <FileText aria-hidden className="h-5 w-5" strokeWidth={1.75} />
        <span className="text-[15px] font-semibold tracking-tight text-ink">Ajaia Docs</span>
      </span>
      <span aria-hidden className="relative h-0.5 w-32 overflow-hidden rounded-full bg-line">
        <span className="progress-line absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary" />
      </span>
      <span className="sr-only">Loading</span>
    </div>
  );
}
