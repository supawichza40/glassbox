"use client";

import { useEffect, useRef } from "react";

// Dialog a11y for the bubble/side shells: focus the composer on open, trap Tab,
// Esc closes + returns focus to the launcher. The full PAGE mode does NOT use
// this (a page is not a modal).

export function useDialogA11y({
  open,
  onClose,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    // Focus the composer (preferred) or the panel itself.
    const composer = panel.querySelector<HTMLElement>("[data-chat-composer]");
    const t = window.setTimeout(() => (composer || panel).focus(), 40);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panel!.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
      // Return focus to the launcher when the dialog closes.
      returnFocusRef?.current?.focus?.();
    };
  }, [open, onClose, returnFocusRef]);

  return panelRef;
}
