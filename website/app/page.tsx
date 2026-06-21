import Image from "next/image";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { VerdictPill } from "@/components/VerdictPill";

export default function LandingPage() {
  return (
    <AppShell variant="marketing" maxWidth="marketing">
      {/* ---------- Hero ---------- */}
      <section className="py-10 sm:py-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-ink2">
          <span aria-hidden className="text-brand">
            ◇
          </span>
          Evidence layer for AI financial decisions
        </span>
        <h1 className="mx-auto mt-5 max-w-[18ch] text-[clamp(32px,6vw,52px)] font-extrabold leading-[1.05] tracking-tight text-ink">
          Prove your AI&apos;s call{" "}
          <span className="text-brand">wasn&apos;t quietly rewritten.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[58ch] text-[18px] leading-relaxed text-ink2">
          An AI Bull and Bear debate a trade. We lock the verdict with a
          signature and an on-chain anchor — so anyone can re-check it on their
          own device. Change one character and it shows{" "}
          <b className="text-bear">TAMPER DETECTED</b>.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button href="/login" variant="primary" size="lg">
            Try the live demo
          </Button>
          <Button href="/verify/demo" variant="secondary" size="lg">
            Verify a record →
          </Button>
        </div>
        <p className="mt-4 text-[13px] text-muted">
          Tamper-evident, not tamper-proof. An evidence layer — not advice, not a
          compliance guarantee.
        </p>
      </section>

      {/* ---------- The problem ---------- */}
      <section className="py-8">
        <h2 className="text-[20px] font-bold text-ink">The problem</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              t: "AI decisions are black boxes",
              b: "A model says BUY. Why? On what evidence? After the fact, the reasoning is gone — and nobody can tell if the record was edited.",
            },
            {
              t: "Records can be quietly rewritten",
              b: "A losing call gets softened. An input gets changed. With nothing anchored, there is no way to prove what the AI actually decided.",
            },
            {
              t: "Trust shouldn't mean 'trust us'",
              b: "A green checkmark from the vendor's own server proves nothing. Verification has to happen on the skeptic's device, against an independent anchor.",
            },
          ].map((c) => (
            <Card key={c.t}>
              <h3 className="m-0 text-[16px] font-semibold text-ink">{c.t}</h3>
              <p className="mt-2 mb-0 text-[14px] leading-snug text-muted">{c.b}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="scroll-mt-20 py-8">
        <h2 className="text-[20px] font-bold text-ink">How it works</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            ["1", "Ask", "Pose a real question — e.g. should I add to SUI now?"],
            ["2", "Debate", "A Bull and a Bear argue both sides; an Arbiter resolves a verdict."],
            ["3", "Sign + anchor", "Code computes Signal Strength, signs the record (ed25519), and anchors it on Walrus / Sui."],
            ["4", "Re-verify", "Anyone recomputes the hash + checks the signature in-browser. Tamper one byte → it fails."],
          ].map(([n, t, b]) => (
            <Card key={n}>
              <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-brand/60 bg-brand/15 text-[13px] font-bold text-brand">
                {n}
              </div>
              <h3 className="m-0 text-[15px] font-semibold text-ink">{t}</h3>
              <p className="mt-1.5 mb-0 text-[13px] leading-snug text-muted">{b}</p>
            </Card>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-[12px] border border-line bg-surface p-3">
          <Image
            src="/glassbox-architecture.png"
            alt="GlassBox architecture: a goal enters the Bull/Bear/Arbiter brain, produces a decision, which is signed and anchored on Walrus and Sui, then independently re-verified in the browser."
            width={1600}
            height={900}
            className="h-auto w-full rounded-md"
            priority={false}
          />
        </div>
      </section>

      {/* ---------- WOW teaser ---------- */}
      <section className="py-8">
        <Card className="bg-surface2">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="flex-1">
              <h2 className="m-0 text-[22px] font-bold text-ink">
                The moment that lands the room
              </h2>
              <p className="mt-2 max-w-[52ch] text-[15px] leading-snug text-ink2">
                Open a signed decision. It verifies. Then edit a single character
                of the record — the fingerprint breaks instantly and the screen
                slams to <b className="text-bear">TAMPER DETECTED</b>. No server
                in the trust path. Put it back, and it verifies again.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <Button href="/verify/demo" variant="primary">
                  See it on a live record
                </Button>
                <span className="inline-flex items-center gap-2 text-[13px] text-muted">
                  <VerdictPill verdict="BUY" size="sm" /> verified, then broken on
                  edit
                </span>
              </div>
            </div>
            <div
              aria-hidden
              className="grid w-full max-w-[220px] place-items-center rounded-lg border border-bear/50 border-dashed bg-bear/10 px-4 py-8"
            >
              <div className="text-[28px] font-extrabold text-bear">✗ TAMPER</div>
              <div className="mono mt-2 text-[11px] text-bear/80">
                026980<span className="gb-diff-char">9</span>…04a6d
              </div>
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
