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

/** Word-by-word masked reveal for headlines (pure CSS, so it runs without JS). */
export function WordReveal({ text, startDelay = 0, step = 55 }: { text: string; startDelay?: number; step?: number }) {
  const words = text.split(" ");
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="mk-word-mask">
            <span className="mk-word" style={{ animationDelay: `${startDelay + i * step}ms` }}>
              {word}
            </span>
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </>
  );
}
