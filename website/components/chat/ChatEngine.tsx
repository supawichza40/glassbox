"use client";

// The shared chat body — message log + composer — reused by all three modes
// (bubble popover, side drawer, full page). Modes own ONLY their outer shell
// (chrome + sizing + a11y wrapper); everything inside is this one engine, fed by
// the single ChatProvider store, so escalating bubble→side→full never loses a
// message.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import { useChat } from "./ChatProvider";
import type { ChatMessage } from "./ChatProvider";
import { renderMarkdown } from "./markdown";
import { CopyButton } from "../CopyButton";

const SUGGESTED_PROMPTS = [
  "What is Signal Strength?",
  "What does tamper-evident mean?",
  "How does the Bull/Bear debate work?",
  "What's anchored on Sui?",
];

const SPARK = (
  <span
    aria-hidden="true"
    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[13px] text-brand"
    style={{ textShadow: "0 0 12px var(--brand-glow)" }}
  >
    ✦
  </span>
);

export function ChatEngine({ variant }: { variant: "bubble" | "side" | "full" }) {
  const { messages, streaming, send, abort } = useChat();
  const logRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const isFull = variant === "full";

  // Auto-scroll only when the user is already near the bottom.
  const nearBottom = useCallback(() => {
    const el = logRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useLayoutEffect(() => {
    if (atBottom) scrollToBottom(streaming ? "auto" : "smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, atBottom]);

  const onScroll = useCallback(() => setAtBottom(nearBottom()), [nearBottom]);

  const empty = messages.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={logRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation"
        className={cn(
          "gb-scroll relative flex-1 overflow-y-auto px-4 py-5",
          isFull && "px-0",
        )}
      >
        <div className={cn("mx-auto flex flex-col gap-6", isFull && "max-w-[720px]")}>
          {empty ? (
            <EmptyState onPick={send} isFull={isFull} />
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <UserMessage key={m.id} message={m} />
              ) : (
                <AssistantMessage
                  key={m.id}
                  message={m}
                  streaming={streaming}
                  onPick={send}
                />
              ),
            )
          )}
          {streaming &&
          messages[messages.length - 1]?.role === "assistant" &&
          !messages[messages.length - 1]?.content ? (
            <TypingIndicator />
          ) : null}
        </div>
      </div>

      {!atBottom && !empty ? (
        <button
          type="button"
          onClick={() => {
            scrollToBottom();
            setAtBottom(true);
          }}
          className="elev-3 absolute bottom-[112px] left-1/2 z-10 -translate-x-1/2 rounded-full border border-line bg-surface2 px-3 py-1.5 text-[12px] text-ink2 hover:border-line-strong hover:text-ink"
        >
          ↓ Latest
        </button>
      ) : null}

      <Composer streaming={streaming} onSend={send} onStop={abort} isFull={isFull} />
    </div>
  );
}

function EmptyState({
  onPick,
  isFull,
}: {
  onPick: (q: string) => void;
  isFull: boolean;
}) {
  const greeting = isFull ? "What can I explain?" : "Ask GlassBox about this page.";
  return (
    <div className={cn("flex flex-col gap-4 py-4", isFull && "py-10")}>
      <div className="flex items-center gap-2">
        {SPARK}
        <span className="text-[15px] font-semibold text-ink">{greeting}</span>
      </div>
      <p className="m-0 max-w-[60ch] text-[14px] leading-relaxed text-muted">
        I explain how GlassBox works and what&apos;s on this page. I don&apos;t give
        trading advice or predictions.
      </p>
      <div
        className={cn(
          "mt-1 grid grid-cols-1 gap-2",
          isFull && "sm:grid-cols-2",
        )}
      >
        {SUGGESTED_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="rounded-[10px] border border-line bg-surface2 px-3 py-2.5 text-left text-[13.5px] leading-snug text-ink2 transition-colors hover:border-accent hover:text-ink"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="relative max-w-[85%] rounded-2xl rounded-br-md bg-surface2 px-4 py-2.5 text-[15px] leading-[1.5] text-ink">
        {message.content}
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  streaming,
  onPick,
}: {
  message: ChatMessage;
  streaming: boolean;
  onPick: (q: string) => void;
}) {
  const isError = message.status === "error";
  const isRefused = message.status === "refused";
  const isStreaming = message.status === "streaming";
  const showCaret = isStreaming && streaming;

  return (
    <div
      className={cn(
        "group flex flex-col gap-1.5",
        isRefused && "border-l-2 border-warn pl-3",
        isError && "border-l-2 border-bear pl-3",
      )}
      {...(isError ? { role: "alert" } : {})}
    >
      <div className="flex items-center gap-2">
        {SPARK}
        <span className="text-[13px] font-semibold text-ink2">GlassBox</span>
        {isRefused ? (
          <span className="rounded-full border border-warn/50 bg-warn/10 px-2 py-0.5 text-[11px] font-medium text-warn">
            Redirected
          </span>
        ) : null}
      </div>

      {isError ? (
        <div className="flex flex-col items-start gap-2">
          <p className="m-0 text-[15px] leading-[1.65] text-ink2">
            {message.content}
          </p>
          <RetryButton />
        </div>
      ) : (
        <div
          className={cn(
            "text-[15px] leading-[1.65] text-ink2",
            "[&_p]:m-0 [&_p]:mb-2 [&_p:last-child]:mb-0",
            "[&_strong]:font-semibold [&_strong]:text-ink",
            "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1",
            "[&_.gb-md-link]:text-accent [&_.gb-md-link]:underline [&_.gb-md-link]:underline-offset-2",
            "[&_.gb-md-code]:rounded [&_.gb-md-code]:border [&_.gb-md-code]:border-line [&_.gb-md-code]:bg-well [&_.gb-md-code]:px-1.5 [&_.gb-md-code]:py-0.5 [&_.gb-md-code]:font-mono [&_.gb-md-code]:text-[13px] [&_.gb-md-code]:text-accent [&_.gb-md-code]:break-all",
            "[&_.gb-md-pre]:my-2 [&_.gb-md-pre]:overflow-x-auto [&_.gb-md-pre]:rounded-lg [&_.gb-md-pre]:border [&_.gb-md-pre]:border-line [&_.gb-md-pre]:bg-well [&_.gb-md-pre]:p-3 [&_.gb-md-pre]:font-mono [&_.gb-md-pre]:text-[13px] [&_.gb-md-pre]:leading-relaxed [&_.gb-md-pre]:text-ink",
            "[&_.gb-caret]:bg-ink2",
          )}
          dangerouslySetInnerHTML={{
            __html:
              renderMarkdown(message.content) +
              (showCaret
                ? '<span class="gb-caret align-[-2px] ml-0.5 inline-block h-[1.05em] w-[7px] rounded-[1px] bg-ink2 animate-pulse"></span>'
                : ""),
          }}
        />
      )}

      {message.suggestions?.length ? (
        <div className="mt-2 flex flex-col gap-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Related
          </div>
          <div className="flex flex-col gap-2">
            {message.suggestions.slice(0, 4).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onPick(q)}
                className="rounded-[10px] border border-line bg-surface2 px-3 py-2 text-left text-[13px] leading-snug text-ink2 transition-colors hover:border-accent hover:text-ink"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!isStreaming && !isError && message.content ? (
        <div className="mt-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <CopyButton value={message.content} label="Copy" />
        </div>
      ) : null}
    </div>
  );
}

function RetryButton() {
  const { retryLast } = useChat();
  return (
    <button
      type="button"
      onClick={retryLast}
      className="inline-flex h-8 items-center rounded-md border border-line px-3 text-[13px] text-ink2 hover:border-line-strong hover:text-ink"
    >
      ↻ Retry
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      {SPARK}
      <span
        className="inline-flex items-center gap-1.5"
        aria-label="GlassBox is thinking"
      >
        {[0, 0.2, 0.4].map((d, i) => (
          <i
            key={i}
            className="h-[6px] w-[6px] animate-pulse rounded-full bg-muted"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
      </span>
    </div>
  );
}

function Composer({
  streaming,
  onSend,
  onStop,
  isFull,
}: {
  streaming: boolean;
  onSend: (q: string) => void;
  onStop: () => void;
  isFull: boolean;
}) {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);

  // Expose the composer so modes can focus it on open.
  const autosize = useCallback(() => {
    const t = taRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(160, t.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    autosize();
  }, [text, autosize]);

  const submit = () => {
    const q = text.trim();
    if (!q || streaming) return;
    onSend(q);
    setText("");
  };

  return (
    <div className="elev-2 border-t border-line bg-surface px-3 py-3">
      <div
        className={cn("mx-auto flex items-end gap-2", isFull && "max-w-[720px]")}
      >
        <textarea
          ref={taRef}
          data-chat-composer
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => (composingRef.current = true)}
          onCompositionEnd={() => (composingRef.current = false)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !composingRef.current &&
              // guard browsers that report IME via the native isComposing flag
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            }
          }}
          aria-label="Ask a question about this page"
          placeholder="Ask anything…"
          className="gb-scroll max-h-[160px] min-h-[44px] flex-1 resize-none rounded-[10px] border border-line bg-well px-3 py-2.5 text-[15px] leading-[1.4] text-ink outline-none placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-bear/60 text-bear transition-colors hover:bg-bear/10"
          >
            <span aria-hidden="true" className="block h-2.5 w-2.5 rounded-[2px] bg-bear" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-action text-white transition-[opacity,filter] hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
          >
            <span aria-hidden="true" className="text-[15px]">↑</span>
          </button>
        )}
      </div>
      <p
        className={cn(
          "m-0 mt-2 text-center text-[12px] leading-snug text-faint",
          isFull && "mx-auto max-w-[720px]",
        )}
      >
        Explains this page — not financial advice. Tamper-evident, not
        tamper-proof.
      </p>
    </div>
  );
}
