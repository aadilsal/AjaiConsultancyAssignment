import type { ReactNode } from "react";
import { ScrollProgress } from "@/components/marketing/scroll-progress";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import "@/components/marketing/marketing.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mk-root flex min-h-dvh flex-col bg-canvas">
      <a
        href="#main"
        className="sr-only z-[70] rounded-md bg-surface px-3 py-2 text-sm text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SmoothScroll />
      <ScrollProgress />
      <SiteNav />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
