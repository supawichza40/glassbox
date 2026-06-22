"use client";

// FULL chat mode — a real route (not a modal). Centered 720px column with the
// composer pinned to the bottom and a context-aware empty state. Shares the same
// ChatProvider store as the bubble/side overlays, so a conversation started in
// the bubble continues here untouched (and vice-versa). No focus trap — a page is
// not a dialog.

import Link from "next/link";
import { useEffect } from "react";
import { Wordmark } from "@/components/Wordmark";
import { ChatEngine } from "@/components/chat/ChatEngine";
import { useChat } from "@/components/chat/ChatProvider";

export default function FullChatPage() {
  const { setMode } = useChat();

  // Claim the conversation: ensure the overlay isn't also open behind a route.
  useEffect(() => {
    setMode("full");
    return () => setMode("closed");
  }, [setMode]);

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="no-underline">
            <Wordmark />
          </Link>
          <span className="text-[12px] text-muted">Page explainer</span>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <ChatEngine variant="full" />
      </main>
    </div>
  );
}
