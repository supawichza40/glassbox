"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

/** Copy-to-clipboard with a transient confirm. Color + word + glyph on the
 *  confirmed state (✓ Copied). 44px tap target. */
export function CopyButton({ value, label = "Copy", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — silently no-op (value is visible on screen) */
    }
  }
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border px-2 text-[12px] font-medium transition-colors",
        copied
          ? "border-bull/60 text-bull"
          : "border-line text-muted hover:text-ink hover:border-line-strong",
        className,
      )}
    >
      <span aria-hidden>{copied ? "✓" : "⧉"}</span>
      {copied ? "Copied" : label}
    </button>
  );
}
