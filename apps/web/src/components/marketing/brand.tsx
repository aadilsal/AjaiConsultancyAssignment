import Link from "next/link";

/** Ajaia Docs wordmark: page glyph + name, links home. */
export function Brand({ href = "/welcome" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-md" aria-label="Ajaia Docs home">
      <svg aria-hidden viewBox="0 0 32 32" className="h-7 w-7 shrink-0">
        <rect width="32" height="32" rx="7" className="fill-primary" />
        <path d="M10 7h8.5L23 11.5V25H10z" className="fill-canvas" />
        <path d="M18.5 7v4.5H23" fill="none" className="stroke-primary" strokeWidth="1.5" />
        <path d="M13 16h7M13 19h7M13 22h4.5" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-ink">Ajaia Docs</span>
    </Link>
  );
}
