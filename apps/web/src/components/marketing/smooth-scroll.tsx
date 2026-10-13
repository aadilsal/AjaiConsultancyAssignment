"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/** Lenis smooth scrolling for marketing pages; off under reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;

    const start = () => {
      if (media.matches || lenis) return;
      lenis = new Lenis({ autoRaf: true, anchors: { offset: -72 }, lerp: 0.12 });
    };
    const stop = () => {
      lenis?.destroy();
      lenis = null;
    };
    const onChange = () => (media.matches ? stop() : start());

    start();
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
      stop();
    };
  }, []);

  return null;
}
