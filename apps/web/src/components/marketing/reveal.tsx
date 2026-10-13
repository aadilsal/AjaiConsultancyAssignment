"use client";

import { clsx } from "clsx";
import { useLayoutEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Fades + rises content in once when it scrolls into view.
 * Only elements that start below the fold are hidden, and only after JS runs.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    setArmed(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-armed={armed || undefined}
      data-in={inView || undefined}
      className={clsx("mk-reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/** Word-by-word masked reveal for headlines (pure CSS, so it runs without JS). `emphasis` gets a drawn underline. */
export function WordReveal({
  text,
  startDelay = 0,
  step = 55,
  emphasis,
}: {
  text: string;
  startDelay?: number;
  step?: number;
  emphasis?: string;
}) {
  const words = text.split(" ");
  const drawDelay = startDelay + words.length * step + 220;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => {
          const isEm = emphasis !== undefined && word.replace(/[.,!?]$/, "") === emphasis;
          return (
            <span key={`${word}-${i}`} className={isEm ? "relative inline-block" : undefined}>
              <span className="mk-word-mask">
                <span className="mk-word" style={{ animationDelay: `${startDelay + i * step}ms` }}>
                  {word}
                </span>
              </span>
              {isEm && (
                <svg
                  className="mk-underline pointer-events-none absolute -bottom-[0.14em] left-0 h-[0.32em] w-[calc(100%-0.3em)] overflow-visible text-primary"
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 9C46 4 118 2.5 198 6.5"
                    pathLength={1}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    style={{ animationDelay: `${drawDelay}ms` }}
                  />
                </svg>
              )}
              {i < words.length - 1 ? " " : null}
            </span>
          );
        })}
      </span>
    </>
  );
}
