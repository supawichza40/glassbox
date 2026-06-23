"use client";

// The mounted overlay surface — a floating launcher that escalates to a bubble
// popover or a side drawer. Mounted once via AppShell so it rides on marketing +
// app pages. Hidden entirely in ?present (the projector/pitch view) and while the
// FULL page route owns the conversation. All three overlay states share the same
// ChatProvider store, so escalating never loses history.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { useChat } from "./ChatProvider";
import { ChatEngine } from "./ChatEngine";
import { ChatHeader } from "./ChatHeader";
import { useDialogA11y } from "./useDialogA11y";

export function ChatLauncher() {
  const { mode, open, close } = useChat();
  const pathname = usePathname();
  const search = useSearchParams();
  const launcherRef = useRef<HTMLButtonElement>(null);
  // Portal target is document.body, which only exists after mount. Gating on
  // `mounted` also avoids an SSR/hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const present = search.get("present") !== null;
  const onFullRoute = pathname === "/chat" || pathname === "/app/chat";
  // The full route owns the conversation; don't double-render an overlay there.
  if (present || onFullRoute || !mounted) return null;

  const overlayOpen = mode === "bubble" || mode === "side";

  // Portal to <body> so the fixed launcher/overlay anchor to the VIEWPORT, not to
  // a transformed ancestor (e.g. .gb-rise leaves an identity transform that would
  // otherwise become the containing block and pin "fixed" to the page, not the view).
  return createPortal(
    <>
      {/* Launcher (bottom-right). aria-expanded reflects overlay state. */}
      {!overlayOpen ? (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => open("bubble")}
          aria-expanded={false}
          aria-haspopup="dialog"
          aria-controls="gb-chat-panel"
          className="fixed bottom-5 right-5 z-40 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink shadow-[0_8px_30px_rgba(0,0,0,.45)] transition-[transform,border-color] hover:border-brand/60 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span
            aria-hidden="true"
            className="text-[15px] text-brand"
            style={{ textShadow: "0 0 12px var(--brand-glow)" }}
          >
            ✦
          </span>
          Ask GlassBox
        </button>
      ) : null}

      {overlayOpen ? (
        <ChatOverlay
          mode={mode}
          onClose={close}
          returnFocusRef={launcherRef}
        />
      ) : null}
    </>,
    document.body,
  );
}

function ChatOverlay({
  mode,
  onClose,
  returnFocusRef,
}: {
  mode: "bubble" | "side";
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const panelRef = useDialogA11y({ open: true, onClose, returnFocusRef });

  const isSide = mode === "side";

  return (
    <>
      {/* Backdrop: dims + closes on click. Side drawer dims; bubble stays light. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40",
          isSide ? "bg-black/40 backdrop-blur-[1px]" : "bg-transparent",
        )}
      />

      <div
        ref={panelRef}
        id="gb-chat-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Ask GlassBox — page explainer"
        tabIndex={-1}
        className={cn(
          "elev-3 fixed z-50 flex flex-col overflow-hidden border border-line bg-surface outline-none",
          // motion: scale .96 -> 1 + fade
          "origin-bottom-right",
          "motion-safe:[animation:gbPop_260ms_var(--ease-out)_both]",
          isSide
            ? // SIDE: right drawer, full height. Mobile -> full-screen sheet.
              "inset-y-0 right-0 w-[min(520px,100vw)] sm:w-[clamp(400px,38vw,520px)] sm:rounded-l-2xl max-sm:inset-0 max-sm:w-full"
            : // BUBBLE: bottom-right popover. Mobile -> full-screen sheet.
              "bottom-5 right-5 h-[560px] max-h-[calc(100dvh-40px)] w-[380px] rounded-2xl max-sm:inset-0 max-sm:bottom-0 max-sm:right-0 max-sm:h-[100dvh] max-sm:w-full max-sm:rounded-none",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ChatHeader variant={mode} />
        <ChatEngine variant={mode} />
      </div>
    </>
  );
}
