// Next 16 proxy (the renamed middleware). Guards /app/* — redirects to /login with
// ?next=<path> when there is no seeded session cookie. /verify/:id is auth-free by
// design (the whole growth loop), so it is NOT matched here.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionFromCookieString } from "./lib/auth";

export function proxy(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const session = cookie
    ? readSessionFromCookieString(`${SESSION_COOKIE}=${cookie}`)
    : null;

  if (!session) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Only guard the app surface. Static, images, /verify/* and marketing stay open.
  matcher: ["/app/:path*"],
};
