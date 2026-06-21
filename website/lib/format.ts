// Small presentation helpers (no domain logic).

export function shortHash(h: string | null | undefined, head = 10, tail = 6): string {
  if (!h) return "—";
  if (h.length <= head + tail + 1) return h;
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

/** 4-char chunked mono string (hashes/sigs read more honestly chunked). */
export function chunk4(s: string | null | undefined): string {
  if (!s) return "—";
  return (s.match(/.{1,4}/g) || [s]).join(" ");
}

export function relativeTime(ms: number): string {
  const d = Date.now() - ms;
  const s = Math.floor(d / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
