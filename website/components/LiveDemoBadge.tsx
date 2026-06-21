"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/brain";
import { cn } from "@/lib/cn";

// LIVE / DEMO / OFFLINE pill — color + word + glyph. Polls the brain health once.
//   LIVE   = brain reachable, demoMode off
//   DEMO   = brain reachable, demoMode on (pre-baked golden path)
//   WAKING = checking / first attempt
//   OFFLINE= brain unreachable (honest — never fake "live")

type State = "waking" | "live" | "demo" | "offline";

export function LiveDemoBadge({ className }: { className?: string }) {
  const [state, setState] = useState<State>("waking");

  useEffect(() => {
    let alive = true;
    getHealth()
      .then((h) => {
        if (!alive) return;
        setState(h.demoMode ? "demo" : "live");
      })
      .catch(() => {
        if (alive) setState("offline");
      });
    return () => {
      alive = false;
    };
  }, []);

  const map: Record<State, { label: string; glyph: string; cls: string }> = {
    waking: { label: "Checking engine…", glyph: "◌", cls: "border-line text-muted" },
    live: { label: "LIVE", glyph: "●", cls: "border-bull/60 bg-bull/10 text-bull" },
    demo: { label: "DEMO", glyph: "●", cls: "border-brand/60 bg-brand/10 text-brand" },
    offline: { label: "ENGINE OFFLINE", glyph: "○", cls: "border-warn/60 bg-warn/10 text-warn" },
  };
  const m = map[state];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold",
        m.cls,
        className,
      )}
      title="Status of the GlassBox decision engine"
    >
      <span aria-hidden>{m.glyph}</span>
      {m.label}
    </span>
  );
}
