import { ArrowRight, ArrowUpRight, CircleCheck, KeyRound, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Bento } from "@/components/marketing/bento";
import { Faq, type FaqItem } from "@/components/marketing/faq";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { DOCS_URL } from "@/components/marketing/links";
import { LiveEditorDemo } from "@/components/marketing/live-editor-demo";
import { Magnetic } from "@/components/marketing/magnetic";
import { FormatMarquee } from "@/components/marketing/marquee";
import { QuickLoginButton } from "@/components/marketing/quick-login-button";
import { Reveal, WordReveal } from "@/components/marketing/reveal";
import { TrustStrip } from "@/components/marketing/trust-strip";

const DESCRIPTION =
  "A focused document editor with autosave, .docx, .md and .txt import, and owner-controlled sharing. Try it with seeded demo accounts, no sign-up needed.";

export const metadata: Metadata = {
  title: "Write, import and share documents",
  description: DESCRIPTION,
  openGraph: { title: "Ajaia Docs — write, import and share documents", description: DESCRIPTION },
};

const ACCOUNTS = [
  {
    id: "alice",
    name: "Alice",
    email: "alice@ajaia.test",
    role: "Owner",
    badge: "bg-primary-soft text-primary",
    tries: ["Format and rename Q4 Planning Notes", "Share a document with Bob", "Remove access, then delete"],
  },
  {
    id: "bob",
    name: "Bob",
    email: "bob@ajaia.test",
    role: "Collaborator",
    badge: "bg-accent-soft text-accent-text",
    tries: ["Find Alice's doc under Shared with me", "Edit it and watch it autosave", "Notice there's no Share or Delete"],
  },
  {
    id: "carol",
    name: "Carol",
    email: "carol@ajaia.test",
    role: "Outsider",
    badge: "border border-line bg-canvas text-muted",
    tries: ["Paste one of Alice's document URLs", "Get Not found, not Forbidden", "Same answer from the API"],
  },
] as const;

const FAQ: FaqItem[] = [
  {
    q: "Is this real-time collaborative, like Google Docs?",
    a: "No, and that's deliberate. Sharing is asynchronous: two people can edit the same document, and every save carries the version it was based on. If the document changed in the meantime, the second save is rejected and you choose to reload or overwrite. Live cursors and merging would have taken days to do properly.",
  },
  {
    q: "What files can I import, and what gets lost?",
    a: "Plain text (.txt), Markdown (.md) and Word (.docx), up to 5 MB. Headings, bulleted and numbered lists, bold, italic and underline are kept. The editor has no images, tables or colours, so those don't come across as they were.",
  },
  {
    q: "Who can see my document?",
    a: "Only you and the people you share it with. Editors can change the text and title; Viewers can only read. Only the owner can share, remove access or delete. Access is checked on the server for every request, and anyone without access gets Not found.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. The quickest way in is one of the three demo accounts (Alice, Bob or Carol): one click on this page or the login page, password demo1234. If you'd rather test with your own name, you can create an account.",
  },
  {
    q: "Where is my data stored, and is the demo secure?",
    a: "Documents are stored as validated JSON in a Postgres database on our own server, not with a third party. The live demo runs over plain HTTP on a raw IP address, so don't type anything private into it. Demo data may be reset at any time.",
  },
];

const btnPrimary =
  "mk-press group inline-flex items-center gap-2 rounded-md bg-primary font-medium text-on-primary transition-colors duration-150 hover:bg-primary-hover";
const btnSecondary =
  "mk-press group inline-flex h-10 items-center gap-1.5 rounded-md border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas";

function SectionCta({ href, children, note, external = false }: { href: string; children: ReactNode; note?: string; external?: boolean }) {
  return (
    <Reveal className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2">
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
          {children}
          <ArrowUpRight aria-hidden className="h-4 w-4 text-muted" strokeWidth={1.75} />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : (
        <Link href={href} className={btnSecondary}>
          {children}
          <ArrowRight aria-hidden className="mk-nudge h-4 w-4 text-muted" strokeWidth={1.75} />
        </Link>
      )}
      {note && <span className="text-sm text-muted">{note}</span>}
    </Reveal>
  );
}

function SectionHeading({ id, kicker, title, children }: { id: string; kicker: string; title: string; children?: ReactNode }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="text-sm font-medium text-primary">{kicker}</p>
      <h2 id={id} className="mt-2 scroll-mt-24 text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {children && <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-[17px]">{children}</p>}
    </Reveal>
  );
}

export default function WelcomePage() {
  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div aria-hidden className="mk-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-[1120px] px-4 pb-20 pt-28 sm:px-6 sm:pt-36 lg:pb-28">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
            <div>
              <p className="mk-fade-up inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-muted">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
                Live demo · one-click demo accounts
              </p>
              <h1 id="hero-title" className="mt-5 text-[38px] font-semibold leading-[1.06] tracking-[-0.02em] text-ink sm:text-[56px]">
                <WordReveal text="Write it, import it, hand it to a teammate." startDelay={80} emphasis="teammate" />
              </h1>
              <p className="mk-fade-up mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg" style={{ animationDelay: "420ms" }}>
                A focused document editor with autosave, .docx, .md and .txt import, and owner-controlled sharing.
              </p>
              <div className="mk-fade-up mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "520ms" }}>
                <Magnetic>
                  <Link href="/login" className={`${btnPrimary} h-12 px-6 text-[15px]`}>
                    Try the live demo
                    <ArrowRight aria-hidden className="mk-nudge h-4 w-4" strokeWidth={1.75} />
                  </Link>
                </Magnetic>
                <Link
                  href="/register"
                  className="mk-press inline-flex h-12 items-center gap-2 rounded-md border border-line bg-surface px-5 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-canvas"
                >
                  <UserPlus aria-hidden className="h-4 w-4 text-muted" strokeWidth={1.75} />
                  Create an account
                </Link>
              </div>
              <p className="mk-fade-up mt-5 inline-flex items-center gap-1.5 text-sm text-muted" style={{ animationDelay: "600ms" }}>
                <KeyRound aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                Password for every demo account: <code className="font-mono text-ink">demo1234</code>
              </p>
            </div>
            <div className="mk-fade-up pb-6 lg:pb-0" style={{ animationDelay: "240ms" }}>
              <LiveEditorDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Formats marquee */}
      <section aria-label="What an import keeps" className="border-y border-line bg-canvas py-5">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
          <p className="shrink-0 text-sm font-medium text-muted">Import keeps</p>
          <div className="min-w-0 flex-1">
            <FormatMarquee />
          </div>
        </div>
      </section>

      {/* Features */}
      <section aria-labelledby="features" className="bg-surface">
        <div className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading id="features" kicker="What you can do" title="The essentials, done properly.">
            Editing, importing and sharing, with the details that stop work from getting lost. Everything else was cut on
            purpose. Hover a card to replay it.
          </SectionHeading>
          <div className="mt-12">
            <Bento />
          </div>
          <SectionCta href="/login" note="Log in, then choose Import file on the dashboard.">
            Import a file
          </SectionCta>
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how" className="border-t border-line">
        <div className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading id="how" kicker="How it works" title="From blank page to shared, and back.">
            Four steps cover the whole product. Scroll through them.
          </SectionHeading>
          <div className="mt-8 lg:mt-4">
            <HowItWorks />
          </div>
          <SectionCta href="/login" note="Takes about two minutes with the demo accounts.">
            Try the live demo
          </SectionCta>
        </div>
      </section>

      {/* Trust */}
      <section aria-labelledby="trust" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading id="trust" kicker="Built to be trusted" title="The boring parts, done carefully.">
            Every number below comes straight from the codebase. The security notes explain each decision.
          </SectionHeading>
          <div className="mt-12">
            <TrustStrip />
          </div>
          <SectionCta href={`${DOCS_URL}/SECURITY-ESSENTIALS.md`} external>
            Read the security notes
          </SectionCta>
        </div>
      </section>

      {/* Demo accounts */}
      <section aria-labelledby="accounts" className="border-t border-line">
        <div className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading id="accounts" kicker="Demo accounts" title="Log in as someone, then switch.">
            Each account shows a different side of sharing. One click signs you in and opens the dashboard. Prefer
            typing? The password is <code className="font-mono text-ink">demo1234</code>.
          </SectionHeading>
          <ul className="mt-12 grid gap-4 md:grid-cols-3">
            {ACCOUNTS.map((a, i) => (
              <li key={a.id}>
                <Reveal delay={i * 60} className="h-full">
                  <div className="mk-card mk-account flex h-full flex-col rounded-lg border border-line bg-surface p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="mk-account-avatar inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-base font-semibold text-primary"
                      >
                        {a.name[0]}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[16px] font-semibold text-ink">
                          {a.name}
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.badge}`}>{a.role}</span>
                        </p>
                        <p className="truncate text-sm text-muted">{a.email}</p>
                      </div>
                    </div>
                    <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">Try this</p>
                    <ul className="mt-2 flex-1 space-y-2">
                      {a.tries.map((t) => (
                        <li key={t} className="mk-try flex items-start gap-2 text-[15px] leading-snug text-muted">
                          <CircleCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
                          {t}
                        </li>
                      ))}
                    </ul>
                    <QuickLoginButton id={a.id} name={a.name} />
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <SectionHeading id="faq" kicker="FAQ" title="Questions a reviewer usually asks.">
              Short, honest answers. The architecture notes on GitHub go deeper.
            </SectionHeading>
            <SectionCta href={`${DOCS_URL}/ARCHITECTURE.md`} external>
              Read the architecture
            </SectionCta>
          </div>
          <Reveal>
            <Faq items={FAQ} />
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta-title" className="border-t border-line">
        <div className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-24">
          <Reveal>
            <div className="mk-sweep flex flex-col items-start justify-between gap-8 rounded-lg bg-primary p-7 text-on-primary sm:p-12 md:flex-row md:items-center">
              <div>
                <h2 id="cta-title" className="text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">
                  See it working in two minutes.
                </h2>
                <p className="mt-3 max-w-xl text-[15px] opacity-90 sm:text-[17px]">
                  Log in as Alice, share a document with Bob, then try opening it as Carol.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Magnetic>
                  <Link
                    href="/login"
                    className="mk-press group inline-flex h-14 items-center gap-2 rounded-md bg-surface px-7 text-base font-semibold text-ink transition-colors duration-150 hover:bg-canvas"
                  >
                    Try the live demo
                    <ArrowRight aria-hidden className="mk-nudge h-5 w-5" strokeWidth={1.75} />
                  </Link>
                </Magnetic>
                <Link
                  href="/register"
                  className="mk-press inline-flex h-14 items-center rounded-md border border-on-primary/40 px-6 text-base font-medium text-on-primary transition-colors duration-150 hover:bg-on-primary/10"
                >
                  Create an account
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
