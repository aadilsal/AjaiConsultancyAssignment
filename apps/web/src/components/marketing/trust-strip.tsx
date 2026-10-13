import { FlaskConical, GitCompareArrows, ShieldCheck, EyeOff, type LucideIcon } from "lucide-react";
import { CountUp } from "./count-up";
import { Reveal } from "./reveal";

const FACTS: { value: number; title: string; body: string; Icon: LucideIcon }[] = [
  { value: 82, title: "automated API tests", body: "Access rules, sharing, import and saves, run with Jest and Supertest.", Icon: FlaskConical },
  { value: 1, title: "access rule, checked on every request", body: "Every document and share route goes through the same server-side rule.", Icon: ShieldCheck },
  { value: 404, title: "not 403, for documents you can't see", body: "So nobody can probe which document IDs exist.", Icon: EyeOff },
  { value: 409, title: "instead of a silent overwrite", body: "Optimistic locking on every save: stale edits are caught, not lost.", Icon: GitCompareArrows },
];

/** Verifiable engineering facts from the codebase, with counters that tick up once. */
export function TrustStrip() {
  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {FACTS.map(({ value, title, body, Icon }, i) => (
        <li key={title} className="bg-surface">
          <Reveal delay={i * 60} className="h-full p-5 sm:p-6">
            <Icon aria-hidden className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} />
            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                <CountUp value={value} />
              </span>
            </p>
            <p className="mt-1 text-[15px] font-medium text-ink">{title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
