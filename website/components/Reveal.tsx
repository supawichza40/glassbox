"use client";

import type { ReactNode } from "react";
import { useReveal } from "@/lib/useReveal";
import { cn } from "@/lib/cn";

// Thin client wrapper that opts a server-rendered block into the scroll-reveal.
// Server HTML is fully visible; the `.reveal` (hidden) class is only added after
// mount, so a no-JS page never hides content. `index` staggers grids via --i.
interface RevealProps {
  children: ReactNode;
  className?: string;
  index?: number;
  /** Render as a semantic <section> instead of the default <div>. */
  as?: "div" | "section";
}

export function Reveal({ children, className, index, as = "div" }: RevealProps) {
  const ref = useReveal<HTMLElement>();
  const style =
    index != null ? ({ ["--i"]: index } as React.CSSProperties) : undefined;
  if (as === "section") {
    return (
      <section
        ref={ref as React.RefObject<HTMLElement>}
        className={cn(className)}
        style={style}
      >
        {children}
      </section>
    );
  }
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(className)}
      style={style}
    >
      {children}
    </div>
  );
}
