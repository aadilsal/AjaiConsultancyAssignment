"use client";

import { clsx } from "clsx";
import { LogIn, Menu, X } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme";
import { Brand } from "./brand";

const SECTIONS = [
  { id: "features", label: "Features" },
  { id: "accounts", label: "Demo accounts" },
  { id: "faq", label: "FAQ" },
] as const;

/** Transparent at the top, solid after 24px; hides on scroll down, returns on scroll up. */
export function SiteNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);

  useMotionValueEvent(scrollY, "change", (y) => {
    const delta = y - lastY.current;
    lastY.current = y;
    setScrolled(y > 24);
    if (open || y < 120) setHidden(false);
    else if (Math.abs(delta) > 4) setHidden(delta > 0);
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onHome = pathname === "/welcome";
  const sectionHref = (id: string) => (onHome ? `#${id}` : `/welcome#${id}`);

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden ? "-100%" : 0 }}
      transition={{ duration: reduce ? 0 : 0.22, ease: [0.2, 0, 0, 1] }}
      className={clsx(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-200 ease-out",
        scrolled || open ? "border-line bg-surface shadow-raised" : "border-transparent bg-transparent",
      )}
    >
      <nav
        aria-label="Main"
        className={clsx(
          "mx-auto flex max-w-[1120px] items-center gap-3 px-4 transition-[height] duration-200 ease-out sm:px-6",
          scrolled ? "h-14" : "h-16",
        )}
      >
        <Brand />

        <ul className="ml-6 hidden items-center gap-6 md:flex">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={sectionHref(s.id)} className="mk-link text-sm text-muted transition-colors duration-150 hover:text-ink">
                {s.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            href="/login"
            className="mk-press group inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary-hover"
          >
            <LogIn aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Log in
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink transition-colors duration-150 hover:bg-canvas md:hidden"
            aria-expanded={open}
            aria-controls="mk-mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X aria-hidden className="h-5 w-5" strokeWidth={1.75} /> : <Menu aria-hidden className="h-5 w-5" strokeWidth={1.75} />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mk-mobile-menu" className="mk-sheet border-t border-line bg-surface md:hidden">
          <ul className="mx-auto max-w-[1120px] px-4 py-3">
            {SECTIONS.map((s, i) => (
              <li key={s.id} className="mk-sheet-item" style={{ animationDelay: `${40 + i * 40}ms` }}>
                <a
                  href={sectionHref(s.id)}
                  onClick={() => setOpen(false)}
                  className="mk-press flex h-11 items-center rounded-md px-2 text-[15px] text-ink hover:bg-canvas"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.header>
  );
}
