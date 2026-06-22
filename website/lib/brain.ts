// Typed fetch wrappers for the FastAPI brain (reuse over HTTP — never rebuilt).
// Base URL from NEXT_PUBLIC_API_BASE (default the local dev brain on :8787).
// Every call degrades gracefully: a thrown BrainError carries a friendly message
// the UI can render as a state, never a crash.

import type {
  AuditRecord,
  Decision,
  HealthResult,
  OutOfScope,
  RiskBand,
  VerifyResult,
} from "./types";

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8787"
).replace(/\/$/, "");

export class BrainError extends Error {
  status: number;
  /** True when the brain ran the relevance gate (422 outOfScope) — not a real error. */
  outOfScope: boolean;
  constructor(message: string, status = 0, outOfScope = false) {
    super(message);
    this.name = "BrainError";
    this.status = status;
    this.outOfScope = outOfScope;
  }
}

const OFFLINE_MSG =
  "Can't reach the GlassBox engine. It may be waking up (~30s on a cold start) or offline. Try again in a moment.";

async function jsonFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs = 45000, ...rest } = init || {};
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      signal: ctrl.signal,
      headers: { "content-type": "application/json", ...(rest.headers || {}) },
    });
  } catch {
    clearTimeout(t);
    throw new BrainError(OFFLINE_MSG, 0);
  }
  clearTimeout(t);

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    // The relevance gate: 422 { outOfScope, message }.
    const oos = body as Partial<OutOfScope> | null;
    if (res.status === 422 && oos && oos.outOfScope) {
      throw new BrainError(
        oos.message || "That looks off-topic for GlassBox.",
        422,
        true,
      );
    }
    const detail =
      (body as { detail?: string; message?: string } | null)?.detail ||
      (body as { message?: string } | null)?.message ||
      `Request failed (HTTP ${res.status}).`;
    throw new BrainError(detail, res.status);
  }
  return body as T;
}

export function getHealth(): Promise<HealthResult> {
  return jsonFetch<HealthResult>("/api/health", { timeoutMs: 5000 });
}

export function getPubkey(): Promise<{ pubkey: string }> {
  return jsonFetch<{ pubkey: string }>("/api/pubkey", { timeoutMs: 5000 });
}

export interface AnalyzeArgs {
  goalText: string;
  asset?: string;
  risk?: RiskBand;
}

export function analyze(args: AnalyzeArgs): Promise<Decision> {
  return jsonFetch<Decision>("/api/analyze", {
    method: "POST",
    body: JSON.stringify({
      goalText: args.goalText,
      asset: args.asset || "SUI/USDC",
      risk: args.risk || "moderate",
    }),
  });
}

// POST /api/audit -> AuditRecord. The server keys the record by recordHash[:16]
// and returns recordId; we mirror that. recordCanonical is the exact hashed bytes.
export function audit(
  decision: Decision,
  goalText = "",
): Promise<AuditRecord> {
  return jsonFetch<AuditRecord>("/api/audit", {
    method: "POST",
    body: JSON.stringify({ decision, goalText }),
    timeoutMs: 60000,
  });
}

export function verify(recordId: string): Promise<VerifyResult> {
  return jsonFetch<VerifyResult>(
    `/api/verify/${encodeURIComponent(recordId)}`,
    { timeoutMs: 10000 },
  );
}

// ── Explainer chat (POST /api/chat) ────────────────────────────────────────
// Streams `event: delta\ndata:{"text":…}` chunks then one `event: done\n
// data:{"refused":bool,"suggestions":[…]}`. Falls back to a single JSON
// `{answer, refused, suggestions?}` when the server doesn't speak SSE. A 422
// `{outOfScope}` is a NORMAL refusal (not an error) — the brain answers it as
// a calm redirect, so we surface it through onDone, never as a throw.

export type ChatRole = "user" | "assistant";
export interface ChatTurn {
  role: ChatRole;
  content: string;
}
export interface ChatContext {
  page?: string;
  decision?: unknown;
  audit?: unknown;
}
export interface ChatArgs {
  question: string;
  context?: ChatContext;
  history?: ChatTurn[];
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  onDone: (info: { refused: boolean; suggestions: string[] }) => void;
}

const CHAT_OFFLINE_MSG =
  "Can't reach the GlassBox explainer right now. The engine may be waking up (~30s on a cold start). Try again in a moment.";

/**
 * Drives a chat turn. Resolves once the stream (or JSON fallback) completes.
 * Throws a BrainError ONLY on a network/transport failure or an abort — those
 * are the callers' single "error" state. An out-of-scope refusal resolves
 * normally with `refused: true`.
 */
export async function chat(args: ChatArgs): Promise<void> {
  const { question, context, history, signal, onDelta, onDone } = args;
  const payload = {
    question,
    context: context || {},
    history: (history || []).slice(-6),
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    if ((e as { name?: string }).name === "AbortError") {
      throw new BrainError("Stopped.", 0);
    }
    throw new BrainError(CHAT_OFFLINE_MSG, 0);
  }

  // 422 outOfScope is a valid refusal body, not a transport failure.
  if (!res.ok && res.status !== 422) {
    throw new BrainError(CHAT_OFFLINE_MSG, res.status);
  }

  const ct = res.headers.get("content-type") || "";

  if (res.body && /text\/event-stream/.test(ct)) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let refused = false;
    let suggestions: string[] = [];
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          let ev = "message";
          let data = "";
          for (const ln of block.split("\n")) {
            if (ln.startsWith("event:")) ev = ln.slice(6).trim();
            else if (ln.startsWith("data:")) data += ln.slice(5).replace(/^ /, "");
          }
          if (!data) continue;
          let j: { text?: string; refused?: boolean; suggestions?: string[] };
          try {
            j = JSON.parse(data);
          } catch {
            continue;
          }
          if (ev === "delta") {
            if (j.text) onDelta(j.text);
          } else if (ev === "done") {
            refused = !!j.refused;
            suggestions = Array.isArray(j.suggestions) ? j.suggestions : [];
          } else if (ev === "error") {
            throw new BrainError(CHAT_OFFLINE_MSG, 0);
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") {
        // A user-initiated Stop: finalize whatever streamed so far, calmly.
        onDone({ refused: false, suggestions: [] });
        return;
      }
      if (e instanceof BrainError) throw e;
      throw new BrainError(CHAT_OFFLINE_MSG, 0);
    }
    onDone({ refused, suggestions });
    return;
  }

  // ── JSON fallback ──
  type ChatJson = { answer?: string; refused?: boolean; suggestions?: string[] };
  let body: ChatJson;
  try {
    body = (await res.json()) as ChatJson;
  } catch {
    throw new BrainError(CHAT_OFFLINE_MSG, 0);
  }
  if (body.answer) onDelta(body.answer);
  onDone({
    refused: !!body.refused,
    suggestions: Array.isArray(body.suggestions) ? body.suggestions : [],
  });
}
