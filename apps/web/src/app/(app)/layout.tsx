import type { Metadata } from "next";
import type { ReactNode } from "react";

// Signed-in app routes are private: never index them.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return children;
}
