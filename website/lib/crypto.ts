// Client-side verification primitives — mirrors server/glassbox/static/verify.html.
// The interactive tamper does a REAL SHA-256 of recordCanonical via Web Crypto and
// compares to recordHash. Signature check uses the bundled noble-ed25519 (lazy import).

/** SHA-256 hex of a UTF-8 string. Web Crypto (secure context: HTTPS or localhost). */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isSecureCryptoContext(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    !!(window.crypto && window.crypto.subtle)
  );
}

function fromHex(h: string): Uint8Array {
  const m = h.match(/.{1,2}/g);
  if (!m) return new Uint8Array();
  return Uint8Array.from(m.map((x) => parseInt(x, 16)));
}

/** ed25519 verify via the bundled noble lib in /public/vendor (browser-only). */
export async function verifySignature(
  signatureHex: string,
  message: string,
  pubkeyHex: string,
): Promise<boolean> {
  try {
    // Loaded as a side-effect-free ESM module served from /public.
    const ed = (await import(
      /* webpackIgnore: true */ "/vendor/noble-ed25519.js" as string
    )) as {
      verifyAsync: (
        sig: Uint8Array,
        msg: Uint8Array,
        pub: Uint8Array,
      ) => Promise<boolean>;
    };
    return await ed.verifyAsync(
      fromHex(signatureHex),
      new TextEncoder().encode(message),
      fromHex(pubkeyHex),
    );
  } catch {
    return false;
  }
}

/** Per-character HTML diff for the fingerprint (changed chars wrapped). Mirrors
 *  verify.html diffChars: walks `b` (the live hash) against `a` (the anchored one). */
function esc(c: string): string {
  return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c;
}
export function diffCharsHtml(anchored: string, live: string): string {
  let out = "";
  for (let i = 0; i < live.length; i++) {
    const ch = esc(live[i]);
    out += anchored[i] === live[i] ? ch : `<span class="gb-diff-char">${ch}</span>`;
  }
  return out;
}

// ---- plain-English field diff (which field was rewritten) ----
type Flat = Record<string, unknown>;
function flatten(obj: unknown, prefix = "", out: Flat = {}): Flat {
  if (obj === null || typeof obj !== "object") {
    out[prefix] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) =>
      flatten(v, prefix ? `${prefix}[${i}]` : `[${i}]`, out),
    );
    return out;
  }
  for (const k of Object.keys(obj as object)) {
    flatten((obj as Flat)[k], prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

export interface FieldDiffRow {
  field: string;
  old: unknown;
  now: unknown;
}

/** Diff two canonical JSON strings into the changed fields. Throws on invalid JSON. */
export function fieldDiff(anchoredStr: string, currentStr: string): FieldDiffRow[] {
  const A = flatten(JSON.parse(anchoredStr));
  const B = flatten(JSON.parse(currentStr));
  const keys = new Set([...Object.keys(A), ...Object.keys(B)]);
  const rows: FieldDiffRow[] = [];
  for (const k of keys) {
    if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) {
      rows.push({ field: k, old: A[k], now: B[k] });
    }
  }
  return rows;
}

export function prettyVal(v: unknown): string {
  if (v === undefined) return "(absent)";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

/** Mutate one character so a "tamper it for me" button always breaks the hash.
 *  Mirrors verify.html's tamperBtn: bump the first digit, else flip the first letter. */
export function tamperOneChar(text: string): string {
  const i = text.search(/[0-9]/);
  if (i >= 0) {
    const d = text[i];
    return text.slice(0, i) + (d === "9" ? "8" : String(+d + 1)) + text.slice(i + 1);
  }
  return text.replace(/[A-Za-z]/, (c) => (c === "a" ? "b" : "a"));
}
