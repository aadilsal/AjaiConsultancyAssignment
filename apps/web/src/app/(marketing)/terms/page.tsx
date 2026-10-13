import { Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";
import { REPO_URL } from "@/components/marketing/links";

const DESCRIPTION =
  "Terms for the Ajaia Docs demo: shared demo accounts, acceptable use, no warranty, and why documents in the demo may be reset at any time without notice.";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: DESCRIPTION,
  openGraph: { title: "Terms & Conditions · Ajaia Docs", description: DESCRIPTION },
  robots: { index: true, follow: true },
};

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "What Ajaia Docs is",
    body: (
      <p>
        Ajaia Docs is a demo project built for an assignment. It is not a commercial service, it has no paid plans, and
        there is no company or legal entity behind it. These terms exist so it&apos;s clear what you can expect from it.
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Demo accounts",
    body: (
      <>
        <p>
          Three demo accounts (Alice, Bob and Carol) are created when the database is seeded, and their password,{" "}
          <code>demo1234</code>, is published on the login page. You can also create your own account.
        </p>
        <ul>
          <li>Anyone can log in as any demo account, so treat everything you write there as visible to other visitors.</li>
          <li>Accounts you create yourself may be deleted when the demo is reset.</li>
          <li>Don&apos;t store personal, confidential or sensitive information in the demo.</li>
        </ul>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>Please use the demo to evaluate the product, and nothing else. In particular, don&apos;t:</p>
        <ul>
          <li>upload unlawful, harmful or infringing content;</li>
          <li>try to break, overload or gain unauthorised access to the server or its database;</li>
          <li>use automated tools to send large numbers of requests (the API is rate limited).</li>
        </ul>
        <p>
          If you find a security issue, please report it privately through the repository rather than exploiting it.
        </p>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content",
    body: (
      <p>
        You keep whatever rights you have in what you write or import. By putting it in the demo you accept that other
        visitors using the same demo accounts may read, change or delete it, and that it may be wiped when the demo is
        reset.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability and resets",
    body: (
      <p>
        The demo runs on a single server and may be stopped, redeployed or reset to its seed data at any time, without
        notice. Documents you create can be lost when that happens. Keep your own copy of anything you care about.
      </p>
    ),
  },
  {
    id: "warranty",
    title: "No warranty",
    body: (
      <p>
        The demo is provided &ldquo;as is&rdquo;, without warranties of any kind. To the extent the law allows, the
        author is not liable for any loss of data or other damage arising from your use of it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: (
      <p>
        These terms may change as the project changes; the date at the top shows the latest version. Questions go to the{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          GitHub repository
        </a>
        . See also the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      icon={Scale}
      title="Terms & Conditions"
      updated="October 13, 2026"
      intro={
        <p>
          The short version: it&apos;s a shared demo, so don&apos;t put anything private in it, and expect the data to be
          reset.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
