"use client";

import { Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { quickLogin, type DemoId } from "./session";

/** One-click sign-in as a seeded demo user, then straight to the dashboard. */
export function QuickLoginButton({ id, name }: { id: DemoId; name: string }) {
  const router = useRouter();
  const errorId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      await quickLogin(id);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign in. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-busy={pending || undefined}
        aria-describedby={error ? errorId : undefined}
        className="mk-press group inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-line bg-canvas px-4 text-sm font-medium text-ink transition-colors duration-150 hover:border-primary hover:bg-primary hover:text-on-primary disabled:cursor-wait disabled:opacity-80"
      >
        {pending ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={1.75} />
        ) : (
          <LogIn aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        )}
        {pending ? `Signing in as ${name}…` : `Log in as ${name}`}
      </button>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
