// Seeded demo auth — NO Supabase. "Enter demo" sets a seeded session in a cookie
// (so the proxy.ts guard can read it server-side) carrying a role (provider|auditor).
// The seeded demo account holds BOTH roles, so the role toggle just rewrites the cookie.
//
// Wave 1: replace setSession/clearSession with a real provider, but KEEP the cookie
// name + shape (GlassboxSession JSON) so the guard and useSession keep working.

export type Role = "provider" | "auditor";

export interface GlassboxSession {
  email: string;
  name: string;
  role: Role;
  seeded: true;
  enteredAt: number;
}

export const SESSION_COOKIE = "gb_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const SEEDED_EMAIL = "demo@glassbox.dev";
const SEEDED_NAME = "Demo User";

export function makeSession(role: Role): GlassboxSession {
  return {
    email: SEEDED_EMAIL,
    name: SEEDED_NAME,
    role,
    seeded: true,
    enteredAt: Date.now(),
  };
}

function writeCookie(value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(
    value,
  )}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

/** Client-side: start a seeded demo session as the given role. */
export function setSession(role: Role): GlassboxSession {
  const s = makeSession(role);
  writeCookie(JSON.stringify(s));
  return s;
}

/** Client-side: switch the active role on the existing seeded session. */
export function setRole(role: Role): GlassboxSession {
  const existing = readSessionFromCookieString(
    typeof document !== "undefined" ? document.cookie : "",
  );
  const s = existing ? { ...existing, role } : makeSession(role);
  writeCookie(JSON.stringify(s));
  return s;
}

/** Client-side: end the demo session. */
export function clearSession() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Parse a session out of a raw cookie header/string. Used by the guard + the hook. */
export function readSessionFromCookieString(
  cookieStr: string,
): GlassboxSession | null {
  if (!cookieStr) return null;
  const match = cookieStr
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
    const parsed = JSON.parse(raw) as GlassboxSession;
    if (parsed && parsed.seeded && (parsed.role === "provider" || parsed.role === "auditor")) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Client-side: read the current session (or null). */
export function getSession(): GlassboxSession | null {
  if (typeof document === "undefined") return null;
  return readSessionFromCookieString(document.cookie);
}
