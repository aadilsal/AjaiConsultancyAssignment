"use client";

import { clsx } from "clsx";
import { FileText, LogOut, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { ThemeToggle } from "./theme";
import { Avatar, Button, Tip } from "./ui";

const NAV = [
  { href: "/", label: "Documents" },
] as const;

const EASE = [0.2, 0, 0, 1] as const;

export function AppHeader() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  async function logout() {
    setLoggingOut(true);
    try {
      await api.logout();
    } finally {
      // Full reload so middleware and all client state reset.
      window.location.href = "/login";
    }
  }

  const logoutButton = (
    <Button variant="quiet" size="sm" onClick={() => void logout()} loading={loggingOut}>
      {!loggingOut && <LogOut aria-hidden className="h-4 w-4" strokeWidth={1.75} />}
      Log out
    </Button>
  );

  return (
    <header
      className={clsx(
        "sticky top-0 z-30 border-b bg-canvas transition-[box-shadow,border-color] duration-200",
        scrolled ? "border-line shadow-raised" : "border-transparent",
      )}
    >
      <div
        className={clsx(
          "mx-auto flex w-full max-w-[1040px] items-center justify-between gap-4 px-4 transition-[height] duration-200 ease-out",
          scrolled ? "h-12" : "h-14",
        )}
      >
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 rounded-sm text-primary">
            <FileText aria-hidden className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-[15px] font-semibold tracking-tight text-ink">Ajaia Docs</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-5 sm:flex">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "group relative rounded-sm py-1 text-sm transition-colors duration-150",
                    active ? "font-medium text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {item.label}
                  {active ? (
                    <motion.span
                      layoutId="nav-underline"
                      transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
                      className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-primary"
                    />
                  ) : (
                    <span className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-line transition-transform duration-200 ease-out group-hover:scale-x-100" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden min-w-0 items-center gap-2 sm:flex">
          <ThemeToggle />
          <span aria-hidden className="mx-1 h-5 w-px bg-line" />
          {user ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={user.name} />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
          ) : (
            <div aria-hidden className="h-8 w-32 animate-pulse rounded-md bg-line" />
          )}
          <Tip label="Sign out of Ajaia Docs">{logoutButton}</Tip>
        </div>

        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <Button
            variant="quiet"
            size="icon"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            key="mobile-menu"
            initial={{ opacity: 0, y: reduce ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="border-t border-line bg-surface px-4 pb-4 pt-2 sm:hidden"
          >
            <nav aria-label="Main" className="flex flex-col">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-2 py-2.5 text-[15px] transition-colors duration-150 hover:bg-canvas aria-[current=page]:font-medium aria-[current=page]:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-3">
              {user && (
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={user.name} />
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                </div>
              )}
              {logoutButton}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
