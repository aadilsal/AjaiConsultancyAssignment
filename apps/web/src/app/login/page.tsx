import { FileText, Upload, Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const CAPABILITIES = [
  { icon: FileText, text: "Rich-text docs with autosave" },
  { icon: Upload, text: "Import .txt, .md and .docx" },
  { icon: Users, text: "Share with teammates — owner controls access" },
] as const;

export default function LoginPage() {
  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex h-14 w-full max-w-[1040px] items-center justify-between px-4">
        <span className="flex items-center gap-2 text-primary">
          <FileText aria-hidden className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Ajaia Docs</span>
        </span>
        <ThemeToggle />
      </div>
      <main className="mx-auto grid w-full max-w-[1040px] gap-10 px-4 pb-16 pt-8 md:grid-cols-[minmax(0,1fr)_440px] md:gap-16 md:pt-20">
        <div className="md:pt-8">
          <h1 className="text-2xl font-semibold tracking-tight">Documents for small teams.</h1>
          <p className="mt-2 max-w-sm text-[15px] text-muted">
            Write, format and share documents in one place. Changes save as you type.
          </p>
          <ul className="mt-8 space-y-4">
            {CAPABILITIES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px]">
                <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-primary">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
