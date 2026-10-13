"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export interface FaqItem {
  q: string;
  a: ReactNode;
}

/** Keyboard-accessible FAQ (Radix Accordion) with animated height and chevron. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <Accordion.Root type="single" collapsible className="divide-y divide-line rounded-lg border border-line bg-surface">
      {items.map((item, i) => (
        <Accordion.Item key={item.q} value={`item-${i}`}>
          <Accordion.Header asChild>
            <h3>
              <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-canvas sm:px-5">
                {item.q}
                <ChevronDown aria-hidden className="mk-acc-chevron h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
              </Accordion.Trigger>
            </h3>
          </Accordion.Header>
          <Accordion.Content className="mk-acc-content">
            <div className="px-4 pb-4 text-[15px] leading-relaxed text-muted sm:px-5">{item.a}</div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
