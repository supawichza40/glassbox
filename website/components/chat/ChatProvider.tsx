"use client";

// The single source of chat state. Mounted ONCE in app/layout.tsx so the message
// array survives every route change AND every mode swap (bubble ⇄ side ⇄ full).
// The three mode shells are pure presentational swaps over this same store, so
// "Expand" / "Collapse" never loses history.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { chat, BrainError } from "@/lib/brain";
import type { ChatTurn } from "@/lib/brain";

export type ChatMode = "closed" | "bubble" | "side" | "full";

export type MessageStatus =
  | "streaming"
  | "done"
  | "refused" // calm out-of-scope redirect (amber rail)
  | "error"; // the ONLY red case (network/transport)

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: MessageStatus;
  suggestions?: string[];
}

interface ChatState {
  messages: ChatMessage[];
  mode: ChatMode;
  streaming: boolean;
  open: (mode?: Exclude<ChatMode, "closed">) => void;
  close: () => void;
  setMode: (mode: ChatMode) => void;
  send: (text: string) => void;
  retryLast: () => void;
  abort: () => void;
  clear: () => void;
}

const Ctx = createContext<ChatState | null>(null);

let _seq = 0;
const nextId = () => `m${Date.now().toString(36)}_${(_seq++).toString(36)}`;

// The brain's ChatContext.page is a strict enum ("dashboard" | "verify"); sending a
// raw pathname like "/chat" makes it 422 the whole turn. Map the route to that enum
// (undefined on marketing pages — page context is optional).
function pageContext(path: string | null): "dashboard" | "verify" | undefined {
  if (!path) return undefined;
  if (path.startsWith("/verify")) return "verify";
  if (path.startsWith("/app")) return "dashboard";
  // /chat (general explainer) + marketing pages send no page context.
  return undefined;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setModeState] = useState<ChatMode>("closed");
  const [streaming, setStreaming] = useState(false);
  const pathname = usePathname();
  const abortRef = useRef<AbortController | null>(null);
  // Keep latest messages addressable inside async closures without re-subscribing.
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const open = useCallback((m: Exclude<ChatMode, "closed"> = "bubble") => {
    setModeState(m);
  }, []);

  const close = useCallback(() => {
    setModeState("closed");
  }, []);

  const setMode = useCallback((m: ChatMode) => setModeState(m), []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.status === "streaming"
          ? { ...m, status: m.content ? "done" : "error" }
          : m,
      ),
    );
  }, []);

  // Core send. `priorHistory` lets retryLast re-issue without the failed turn.
  const runTurn = useCallback(
    (question: string, priorHistory: ChatTurn[]) => {
      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: question,
        status: "done",
      };
      const botId = nextId();
      const botMsg: ChatMessage = {
        id: botId,
        role: "assistant",
        content: "",
        status: "streaming",
      };
      setMessages((prev) => [...prev, userMsg, botMsg]);
      setStreaming(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((prev) => prev.map((m) => (m.id === botId ? fn(m) : m)));

      chat({
        question,
        context: { page: pageContext(pathname) },
        history: priorHistory,
        signal: ctrl.signal,
        onDelta: (text) =>
          patch((m) => ({ ...m, content: m.content + text })),
        onDone: ({ refused, suggestions }) =>
          patch((m) => ({
            ...m,
            status: refused ? "refused" : "done",
            suggestions: suggestions.length ? suggestions : undefined,
          })),
      })
        .catch((err: unknown) => {
          const aborted =
            err instanceof BrainError && err.message === "Stopped.";
          patch((m) => ({
            ...m,
            status: aborted ? (m.content ? "done" : "error") : "error",
            content:
              m.content ||
              (err instanceof BrainError
                ? err.message
                : "Something went wrong. Please try again."),
          }));
        })
        .finally(() => {
          if (abortRef.current === ctrl) abortRef.current = null;
          setStreaming(false);
        });
    },
    [pathname],
  );

  const send = useCallback(
    (text: string) => {
      const q = text.trim();
      if (!q || streaming) return;
      const history: ChatTurn[] = messagesRef.current
        .filter((m) => m.status !== "error")
        .map((m) => ({ role: m.role, content: m.content }));
      runTurn(q, history);
    },
    [streaming, runTurn],
  );

  // Retry: drop the failed assistant turn (and its user turn already kept) and
  // re-issue the last user question with the surviving history.
  const retryLast = useCallback(() => {
    if (streaming) return;
    const msgs = messagesRef.current;
    // last assistant in error + the user turn just before it
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx < 0) return;
    const question = msgs[lastUserIdx].content;
    const kept = msgs.slice(0, lastUserIdx);
    setMessages(kept);
    messagesRef.current = kept;
    const history: ChatTurn[] = kept
      .filter((m) => m.status !== "error")
      .map((m) => ({ role: m.role, content: m.content }));
    runTurn(question, history);
  }, [streaming, runTurn]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setStreaming(false);
  }, []);

  const value = useMemo<ChatState>(
    () => ({
      messages,
      mode,
      streaming,
      open,
      close,
      setMode,
      send,
      retryLast,
      abort,
      clear,
    }),
    [messages, mode, streaming, open, close, setMode, send, retryLast, abort, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChat(): ChatState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useChat must be used within <ChatProvider>");
  return ctx;
}
