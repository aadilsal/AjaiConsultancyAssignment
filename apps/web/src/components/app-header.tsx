"use client";

import { FileText, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { ThemeToggle } from "./theme";
import { Avatar, Button, Tip } from "./ui";

export function AppHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((r) => {
        if (active) setUser(r.user);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await api.logout();
    } finally {
      // Full reload so middleware and all client state reset.
      window.location.href = "/login";
    }
  }

  return (
    <header className="border-b border-line bg-canvas">
      <div className="mx-auto flex h-14 w-full max-w-[1040px] items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 rounded-sm text-primary">
          <FileText aria-hidden className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Ajaia Docs</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <ThemeToggle />
          <span aria-hidden className="mx-1 h-5 w-px bg-line" />
          {user ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={user.name} />
              <div className="hidden min-w-0 leading-tight sm:block">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
              <span className="sr-only sm:hidden">{user.name}</span>
            </div>
          ) : (
            <div aria-hidden className="h-8 w-32 animate-pulse rounded-md bg-line" />
          )}
          <Tip label="Sign out of Ajaia Docs">
            <Button variant="quiet" size="sm" onClick={() => void logout()} loading={loggingOut}>
              {!loggingOut && <LogOut aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
              Log out
            </Button>
          </Tip>
        </div>
      </div>
    </header>
  );
}
