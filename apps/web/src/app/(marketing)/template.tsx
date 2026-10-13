import type { ReactNode } from "react";

// Remounts on every marketing navigation, replaying the CSS enter animation.
export default function MarketingTemplate({ children }: { children: ReactNode }) {
  return <div className="mk-page">{children}</div>;
}
