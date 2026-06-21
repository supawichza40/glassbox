"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { setSession, type Role } from "@/lib/auth";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/Button";

// Auth template — centered ~420 card. Seeded demo: "Enter as Provider / Auditor"
// sets the cookie session and redirects to ?next (or the role's home). Google is a
// disabled stub ("coming soon"). NO real Supabase.

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  function enter(role: Role) {
    setSession(role);
    const dest =
      next && next.startsWith("/app")
        ? next
        : role === "provider"
          ? "/app/provider"
          : "/app/auditor";
    router.push(dest);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="no-underline">
        <Wordmark />
      </Link>

      <div className="mt-6 w-full max-w-[420px] rounded-[12px] border border-line bg-surface p-6 shadow-[0_8px_30px_rgba(0,0,0,.45)]">
        <h1 className="m-0 text-[22px] font-bold text-ink">Enter the demo</h1>
        <p className="mt-1.5 mb-0 text-[14px] text-muted">
          The demo account holds both seats. Pick a role to start — you can switch
          any time.
        </p>

        {/* Disabled Google stub */}
        <button
          disabled
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-well text-[14px] font-medium text-muted opacity-60"
          aria-disabled="true"
          title="Coming soon"
        >
          <span aria-hidden>◎</span> Continue with Google
          <span className="ml-1 rounded-full border border-line px-2 py-0.5 text-[11px]">
            coming soon
          </span>
        </button>

        <div className="my-5 flex items-center gap-3 text-[12px] text-muted">
          <span className="h-px flex-1 bg-line" />
          or enter the seeded demo
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="primary" size="lg" onClick={() => enter("provider")}>
            Enter as Provider
          </Button>
          <Button variant="secondary" size="lg" onClick={() => enter("auditor")}>
            Enter as Auditor
          </Button>
        </div>

        <p className="mt-5 mb-0 text-center text-[12px] text-muted">
          No account is created. A seeded session is stored in your browser only.
        </p>
      </div>

      <Link href="/" className="mt-5 text-[13px] text-ink2 no-underline hover:text-ink">
        ← Back to home
      </Link>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
