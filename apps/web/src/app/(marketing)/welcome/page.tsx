import { ArrowRight, ArrowUpRight, FileText, KeyRound, LogIn, Upload, Users, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { EditorMock } from "@/components/marketing/editor-mock";
import { Faq, type FaqItem } from "@/components/marketing/faq";
import { DOCS_URL } from "@/components/marketing/links";
import { Magnetic } from "@/components/marketing/magnetic";
import { Reveal, WordReveal } from "@/components/marketing/reveal";

const DESCRIPTION =
  "A focused document editor with autosave, .docx, .md and .txt import, and owner-controlled sharing. Try it with seeded demo accounts, no sign-up needed.";

export const metadata: Metadata = {
  title: "Write, import and share documents",
  description: DESCRIPTION,
  openGraph: { title: "Ajaia Docs — write, import and share documents", description: DESCRIPTION },
};

const FEATURES: { Icon: LucideIcon; title: string; body: string; detail: string }[] = [
  {
    Icon: FileText,
    title: "Write without a Save button",
    body: "Headings, lists, bold, italic and underline. Every change saves a second after you stop typing.",
    detail: "If someone else saved first, you're asked to reload or overwrite. Nothing is silently replaced.",
  },
  {
    Icon: Upload,
    title: "Import what you already have",
    body: "Turn a .txt, .md or .docx file (up to 5 MB) into a new document you can keep editing.",
    detail: "Headings, lists and emphasis come across. The original file isn't stored.",
  },
  {
    Icon: Users,
    title: "Share with one person at a time",
    body: "The owner shares by email as Editor or Viewer, and can remove access at any time.",
    detail: "Anyone else who opens the link gets Not found, even through the API.",
  },
];

const ACCOUNTS = [
  { name: "Alice", email: "alice@ajaia.test", role: "Owner", tone: "owner", note: "Owns Q4 Planning Notes and a private draft. Try sharing, renaming and deleting." },
  { name: "Bob", email: "bob@ajaia.test", role: "Collaborator", tone: "shared", note: "Finds Alice's document under Shared with me and can edit it, but not share or delete it." },
  { name: "Carol", email: "carol@ajaia.test", role: "Outsider", tone: "neutral", note: "Has no access. Paste one of Alice's document URLs and you'll see Not found." },
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
    a: "No. There's no sign-up. Use one of the three demo accounts (Alice, Bob or Carol), all with the password demo1234. The login page has a one-click button for each.",
  },
  {
    q: "Where is my data stored, and is the demo secure?",
    a: "Documents are stored as validated JSON in a Postgres database on our own server, not with a third party. The live demo runs over plain HTTP on a raw IP address, so don't type anything private into it. Demo data may be reset at any time.",
  },
];

function SectionCta({ href, children, external = false }: { href: string; children: ReactNode; external?: boolean }) {
  const cls =
    "mk-press group inline-flex h-10 items-center gap-1.5 rounded-md border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
        <ArrowUpRight aria-hidden className="h-4 w-4 text-muted" strokeWidth={1.75} />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
      <ArrowRight aria-hidden className="mk-nudge h-4 w-4 text-muted" strokeWidth={1.75} />
    </Link>
  );
}

function SectionHeading({ id, kicker, title, children }: { id: string; kicker: string; title: string; children?: ReactNode }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="text-sm font-medium text-primary">{kicker}</p>
      <h2 id={id} className="mt-2 scroll-mt-24 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
      {children && <p className="mt-3 text-[15px] leading-relaxed text-muted sm:text-base">{children}</p>}
    </Reveal>
  );
}

export default function WelcomePage() {
  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="mx-auto max-w-[1120px] px-4 pb-16 pt-28 sm:px-6 sm:pt-36 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          <div>
            <p className="mk-fade-up inline-flex items-center gap-2 text-sm text-muted">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
              Live demo · no sign-up
            </p>
            <h1 id="hero-title" className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              <WordReveal text="Write it, import it, hand it to a teammate." startDelay={80} />
            </h1>
            <p className="mk-fade-up mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg" style={{ animationDelay: "380ms" }}>
              A focused document editor with autosave, .docx, .md and .txt import, and owner-controlled sharing.
            </p>
            <div className="mk-fade-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "480ms" }}>
              <Magnetic>
                <Link
                  href="/login"
                  className="mk-press group inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-[15px] font-medium text-on-primary transition-colors duration-150 hover:bg-primary-hover"
                >
                  Try the live demo
                  <ArrowRight aria-hidden className="mk-nudge h-4 w-4" strokeWidth={1.75} />
                </Link>
              </Magnetic>
              <a
                href="#accounts"
                className="mk-press inline-flex h-11 items-center rounded-md border border-line bg-surface px-5 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-canvas"
              >
                See the demo accounts
              </a>
            </div>
            <p className="mk-fade-up mt-4 inline-flex items-center gap-1.5 text-sm text-muted" style={{ animationDelay: "560ms" }}>
              <KeyRound aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Three seeded accounts, password <code className="font-mono text-ink">demo1234</code>
            </p>
          </div>
          <div className="mk-fade-up" style={{ animationDelay: "260ms" }}>
            <EditorMock />
          </div>
        </div>
      </section>

      {/* Features */}
      <section aria-labelledby="features" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-24">
          <SectionHeading id="features" kicker="What you can do" title="Three things, done properly">
            Editing, importing and sharing, with the details that stop work from getting lost. Everything else was cut on
            purpose.
          </SectionHeading>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ Icon, title, body, detail }, i) => (
              <Reveal as="li" key={title} delay={i * 60} className="h-full">
                <div className="mk-card group h-full rounded-lg border border-line bg-canvas p-5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink/90">{body}</p>
                  <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-muted">{detail}</p>
                </div>
              </Reveal>
            ))}
          </ul>
          <Reveal className="mt-10 flex flex-wrap items-center gap-3">
            <SectionCta href="/login">Import a file</SectionCta>
            <span className="text-sm text-muted">Log in, then choose Import file on the dashboard.</span>
          </Reveal>
        </div>
      </section>

      {/* Demo accounts */}
      <section aria-labelledby="accounts" className="border-t border-line">
        <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-24">
          <SectionHeading id="accounts" kicker="Demo accounts" title="Log in as someone, then switch">
            Each account shows a different side of sharing. All three use the password{" "}
            <code className="font-mono text-ink">demo1234</code>, and the login page has a one-click button for each.
          </SectionHeading>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {ACCOUNTS.map((a, i) => (
              <Reveal as="li" key={a.name} delay={i * 60} className="h-full">
                <div className="mk-card flex h-full flex-col rounded-lg border border-line bg-surface p-5">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
                    >
                      {a.name[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                        {a.name}
                        <span
                          className={
                            "rounded-full px-2 py-0.5 text-xs font-semibold " +
                            (a.tone === "owner"
                              ? "bg-primary-soft text-primary"
                              : a.tone === "shared"
                                ? "bg-accent-soft text-accent-text"
                                : "border border-line bg-canvas text-muted")
                          }
                        >
                          {a.role}
                        </span>
                      </p>
                      <p className="truncate text-sm text-muted">{a.email}</p>
                    </div>
                  </div>
                  <p className="mt-4 flex-1 text-[15px] leading-relaxed text-ink/90">{a.note}</p>
                  <Link
                    href="/login"
                    className="mk-press group mt-5 inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-line bg-canvas px-4 text-sm font-medium text-ink transition-colors duration-150 hover:border-primary hover:text-primary"
                  >
                    <LogIn aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                    Log in as {a.name}
                  </Link>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <SectionHeading id="faq" kicker="FAQ" title="Questions a reviewer usually asks">
              Short, honest answers. The architecture notes on GitHub go deeper.
            </SectionHeading>
            <Reveal className="mt-8">
              <SectionCta href={`${DOCS_URL}/ARCHITECTURE.md`} external>
                Read the architecture
              </SectionCta>
            </Reveal>
          </div>
          <Reveal>
            <Faq items={FAQ} />
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta-title" className="border-t border-line">
        <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="flex flex-col items-start justify-between gap-6 rounded-lg bg-primary p-6 text-on-primary sm:p-10 md:flex-row md:items-center">
            <div>
              <h2 id="cta-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                See it working in two minutes.
              </h2>
              <p className="mt-2 max-w-xl text-[15px] opacity-90 sm:text-base">
                Log in as Alice, share a document with Bob, then try opening it as Carol.
              </p>
            </div>
            <Magnetic>
              <Link
                href="/login"
                className="mk-press group inline-flex h-11 items-center gap-2 rounded-md bg-surface px-5 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-canvas"
              >
                Try the live demo
                <ArrowRight aria-hidden className="mk-nudge h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Magnetic>
          </Reveal>
        </div>
      </section>
    </>
  );
}
