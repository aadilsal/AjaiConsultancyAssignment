"use client";

import { useEffect, useState } from "react";

export type DemoId = "alice" | "bob" | "carol";

const DEMO_EMAIL: Record<DemoId, string> = {
  alice: "alice@ajaia.test",
  bob: "bob@ajaia.test",
  carol: "carol@ajaia.test",
};

// TODO: switch to quickLogin from "@/lib/demo-accounts" once the web agent adds it.
/** Signs in as a seeded demo user; throws with a user-facing message on failure. */
export async function quickLogin(id: DemoId): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email: DEMO_EMAIL[id], password: "demo1234" }),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: { message?: unknown } } | null;
    const message = data?.error?.message;
    throw new Error(typeof message === "string" ? message : "Couldn't sign in. Please try again.");
  }
}

/** "unknown" until /api/auth/me answers; never redirects (unlike the app's api client). */
export function useSignedIn(): "unknown" | "in" | "out" {
  const [state, setState] = useState<"unknown" | "in" | "out">("unknown");
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store", signal: ctrl.signal })
      .then((r) => setState(r.ok ? "in" : "out"))
      .catch(() => {
        if (!ctrl.signal.aborted) setState("out");
      });
    return () => ctrl.abort();
  }, []);
  return state;
}
