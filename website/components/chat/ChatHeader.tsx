"use client";

import { useRouter } from "next/navigation";
import { useChat } from "./ChatProvider";

// The header bar for the bubble + side shells. Mode controls escalate
// launcher→bubble→side→full and reverse — all pure shell swaps over the shared
// store, so history is preserved across every transition. "Expand to full" routes
// to /chat (a real page) and closes the overlay.

export function ChatHeader({ variant }: { variant: "bubble" | "side" }) {
  const { close, setMode } = useChat();
  const router = useRouter();

  const goFull = () => {
    setMode("closed");
    router.push("/chat");
  };

  return (
    <div className="flex items-center gap-2.5 border-b border-line bg-surface px-4 py-3">
      <span
        aria-hidden="true"
        className="text-[15px] text-brand"
        style={{ textShadow: "0 0 12px var(--brand-glow)" }}
      >
        ✦
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold leading-tight tracking-[-0.01em] text-ink">
          Ask GlassBox
        </div>
        <div className="text-[12px] leading-tight text-muted">
          Explainer · understands this page
        </div>
      </div>

      <div className="flex items-center gap-1">
        {variant === "bubble" ? (
          <IconBtn label="Expand to side panel" onClick={() => setMode("side")}>
            ⤢
          </IconBtn>
        ) : (
          <IconBtn label="Collapse to bubble" onClick={() => setMode("bubble")}>
            ⤡
          </IconBtn>
        )}
        <IconBtn label="Open full page" onClick={goFull}>
          ⛶
        </IconBtn>
        <IconBtn label="Close chat" onClick={close}>
          ✕
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-[13px] text-ink2 transition-colors hover:border-accent hover:text-accent"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
