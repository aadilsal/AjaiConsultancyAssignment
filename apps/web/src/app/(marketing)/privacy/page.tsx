import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";
import { REPO_URL } from "@/components/marketing/links";

const DESCRIPTION =
  "What the Ajaia Docs demo stores (account name and email, your documents and one httpOnly session cookie) and what it doesn't: no analytics or trackers.";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: DESCRIPTION,
  openGraph: { title: "Privacy Policy · Ajaia Docs", description: DESCRIPTION },
  robots: { index: true, follow: true },
};

const SECTIONS: LegalSection[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <p>
        Ajaia Docs is a demo project built for an assignment. There is no company behind it and nothing here is sold.
        This page describes what the demo stores and why.
      </p>
    ),
  },
  {
    id: "what",
    title: "What we store",
    body: (
      <ul>
        <li>
          <strong>Account details</strong>: a name, an email address and a hashed password. For the three demo accounts
          these are made up. If you create an account, we store the name and email you enter; using a demo account
          means we never see yours.
        </li>
        <li>
          <strong>Documents</strong>: the title and content of documents you create or import, stored as JSON, plus who
          they are shared with and when they were last edited.
        </li>
        <li>
          <strong>Imported files</strong>: read in memory, converted, then discarded. Only the resulting document is
          kept.
        </li>
      </ul>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        The app sets one cookie, <code>ajaia_session</code>, when you log in. It is httpOnly (scripts can&apos;t read
        it), lasts up to seven days and only keeps you signed in. Your light or dark theme choice is saved in your
        browser&apos;s local storage and never leaves your device.
      </p>
    ),
  },
  {
    id: "not-collected",
    title: "What we don't do",
    body: (
      <ul>
        <li>No analytics, advertising or third-party trackers.</li>
        <li>No third-party fonts or scripts loaded at runtime.</li>
        <li>No selling or sharing of data with anyone.</li>
      </ul>
    ),
  },
  {
    id: "where",
    title: "Where data lives and for how long",
    body: (
      <p>
        Everything is kept in a Postgres database on our own server. The demo may be reset to its seed data at any time,
        which deletes every document created since. The live demo is served over plain HTTP, so don&apos;t enter
        anything private.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Questions",
    body: (
      <p>
        Open an issue on the{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          GitHub repository
        </a>
        . See also the <Link href="/terms">Terms &amp; Conditions</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      icon={Lock}
      title="Privacy Policy"
      updated="October 13, 2026"
      intro={
        <p>
          The demo stores as little as it can: your account details, the documents you write and one session cookie.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
