"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { AlertModalProvider } from "./alert-modal";
import { ThemeProvider } from "./theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Tooltip.Provider delayDuration={300} skipDelayDuration={200}>
        <AlertModalProvider>{children}</AlertModalProvider>
      </Tooltip.Provider>
    </ThemeProvider>
  );
}
