"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { cn } from "@/lib/cn";
import { Wordmark } from "./Wordmark";
import { RoleSwitch } from "./RoleSwitch";
import { LiveDemoBadge } from "./LiveDemoBadge";
import { Button } from "./Button";

// App shell / top-nav. Three nav states:
//   logged-out marketing (Verify is a primary nav item) · Provider · Auditor.
// `variant="bare"` renders only the wordmark (used by the full-bleed verify template).

interface AppShellProps {
  children: React.ReactNode;
  /** "app" shows the role switch + sign out; "marketing" shows nav + CTAs;
   *  "bare" is the auth-free verify chrome (wordmark only). */
  variant?: "marketing" | "app" | "bare";
  /** Constrain the content width. */
  maxWidth?: "marketing" | "app" | "verify";
}

const MAXW: Record<NonNullable<AppShellProps["maxWidth"]>, string> = {
  marketing: "max-w-[1040px]",
  app: "max-w-[1200px]",
  verify: "max-w-[760px]",
};

export function AppShell({
  children,
  variant = "marketing",
  maxWidth,
}: AppShellProps) {
  const { session, switchRole, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const width = MAXW[maxWidth || (variant === "app" ? "app" : "marketing")];

  function onSignOut() {
    signOut();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div
          className={cn(
            "mx-auto flex h-14 items-center justify-between gap-4 px-4 sm:px-6",
            width,
          )}
        >
          <Link href={variant === "bare" ? "#" : "/"} className="no-underline">
            <Wordmark showTagline={variant === "marketing"} />
          </Link>

          {variant === "marketing" ? (
            <nav className="flex items-center gap-1 sm:gap-3">
              <Link
                href="/#how"
                className="hidden px-2 text-[14px] text-ink2 no-underline hover:text-ink sm:inline"
              >
                How it works
              </Link>
              <Link
                href="/pricing"
                className="hidden px-2 text-[14px] text-ink2 no-underline hover:text-ink sm:inline"
              >
                Pricing
              </Link>
              <Link
                href="/verify/demo"
                className="px-2 text-[14px] font-semibold text-accent no-underline hover:brightness-110"
              >
                Verify a record
              </Link>
              <Button href="/login" variant="primary" className="ml-1">
                Try the live demo
              </Button>
            </nav>
          ) : null}

          {variant === "app" && session ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <LiveDemoBadge className="hidden sm:inline-flex" />
              <RoleSwitch role={session.role} onSwitch={switchRole} />
              <button
                onClick={onSignOut}
                className="hidden h-9 rounded-md border border-line px-3 text-[13px] text-muted hover:text-ink hover:border-[#3a4757] sm:inline-flex sm:items-center"
              >
                Exit demo
              </button>
            </div>
          ) : null}

          {variant === "bare" ? (
            <span className="text-[12px] text-muted">Powered by GlassBox</span>
          ) : null}
        </div>
      </header>

      <main className={cn("mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-8", width)}>
        {children}
      </main>

      {variant !== "bare" ? <Footer width={width} active={pathname} /> : null}
    </div>
  );
}

function Footer({ width, active }: { width: string; active: string | null }) {
  void active;
  return (
    <footer className="border-t border-line bg-bg">
      <div
        className={cn(
          "mx-auto flex flex-col items-start justify-between gap-3 px-4 py-6 sm:flex-row sm:items-center sm:px-6",
          width,
        )}
      >
        <Wordmark />
        <p className="m-0 max-w-[60ch] text-[13px] leading-snug text-muted">
          Tamper-evident evidence layer for AI financial decisions. Signatures
          prove origin; the on-chain Sui object anchors the record. Not advice,
          not a compliance guarantee.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <Link href="/verify/demo" className="text-accent no-underline">
            Verify
          </Link>
          <Link href="/pricing" className="text-ink2 no-underline hover:text-ink">
            Pricing
          </Link>
          <Link href="/trust" className="text-ink2 no-underline hover:text-ink">
            Trust
          </Link>
          <Link href="/about" className="text-ink2 no-underline hover:text-ink">
            About
          </Link>
          <Link href="/login" className="text-ink2 no-underline hover:text-ink">
            Demo
          </Link>
        </div>
      </div>
    </footer>
  );
}
