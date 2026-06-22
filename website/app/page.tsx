import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Reveal } from "@/components/Reveal";
import { InteractiveTamper } from "@/components/InteractiveTamper";
import { DEMO_RECORD } from "@/lib/demo";

const SECTION = "py-16 sm:py-20";
const H2 = "text-[clamp(26px,4.5vw,32px)] font-extrabold tracking-tight text-ink";

export default function LandingPage() {
  return (
    <AppShell variant="marketing" maxWidth="marketing">
      <div className="mx-auto w-full max-w-[1100px]">
        {/* ---------- Hero ---------- */}
        <section className="py-12 text-center sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-ink2 elev-1">
            <span aria-hidden className="text-brand">
              ◇
            </span>
            Evidence layer for AI financial decisions
          </span>
          <h1 className="mx-auto mt-5 max-w-[20ch] text-[clamp(34px,6vw,56px)] font-extrabold leading-[1.04] tracking-tight text-ink">
            AI made the call.{" "}
            <span className="text-brand">Now prove no one rewrote it.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[56ch] text-[18px] leading-relaxed text-ink2">
            An AI Bull and Bear debate a trade, then we lock the verdict with a
            signature and an on-chain anchor. Anyone can re-check it on their own
            device — change one character and it shows{" "}
            <b className="text-bear">TAMPER DETECTED</b>.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button href="/login" variant="primary" size="lg">
              Run an analysis
            </Button>
            <Button href="#how" variant="ghost" size="lg">
              How it works
            </Button>
          </div>
          <p className="mt-4 text-[13px] text-muted">
            Or{" "}
            <Link href="/verify/demo" className="text-accent no-underline">
              verify a live record →
            </Link>{" "}
            · Tamper-evident, not tamper-proof. An evidence layer — not advice, not
            a compliance guarantee.
          </p>
        </section>

        {/* ---------- Live tamper widget (the real thing, not a teaser) ---------- */}
        <Reveal as="section" className="pb-4">
          <Card className="glow-evidence elev-3" interactive>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 text-[18px] font-bold text-ink">
                A signed decision you can break right now
              </h2>
              <span className="text-[13px] text-muted">Edit any character →</span>
            </div>
            <InteractiveTamper
              recordCanonical={DEMO_RECORD.audit.recordCanonical}
              recordHash={DEMO_RECORD.audit.recordHash}
              verifiedBaseline
            />
          </Card>
        </Reveal>

        {/* ---------- The problem ---------- */}
        <section className={SECTION}>
          <Reveal>
            <h2 className={H2}>The problem</h2>
          </Reveal>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
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
            ].map((c, i) => (
              <Reveal key={c.t} index={i}>
                <Card interactive className="h-full">
                  <h3 className="m-0 text-[16px] font-semibold text-ink">{c.t}</h3>
                  <p className="mt-2 mb-0 text-[14px] leading-snug text-muted">
                    {c.b}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how" className={`scroll-mt-20 ${SECTION}`}>
          <Reveal>
            <h2 className={H2}>How it works</h2>
          </Reveal>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-4">
            {[
              ["1", "Ask", "Pose a real question — e.g. should I add to SUI now?"],
              ["2", "Debate", "A Bull and a Bear argue both sides; an Arbiter resolves a verdict."],
              ["3", "Sign + anchor", "Code computes Signal Strength, signs the record (ed25519), and anchors it on Walrus / Sui."],
              ["4", "Re-verify", "Anyone recomputes the hash + checks the signature in-browser. Tamper one byte → it fails."],
            ].map(([n, t, b], i) => (
              <Reveal key={n} index={i}>
                <Card interactive className="h-full">
                  <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-brand/60 bg-brand/15 text-[13px] font-bold text-brand-hi">
                    {n}
                  </div>
                  <h3 className="m-0 text-[15px] font-semibold text-ink">{t}</h3>
                  <p className="mt-1.5 mb-0 text-[13px] leading-snug text-muted">{b}</p>
                </Card>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-8">
            <div className="overflow-hidden rounded-[14px] border border-line bg-surface p-3 elev-1">
              <Image
                src="/glassbox-architecture.png"
                alt="GlassBox architecture: a goal enters the Bull/Bear/Arbiter brain, produces a decision, which is signed and anchored on Walrus and Sui, then independently re-verified in the browser."
                width={1600}
                height={900}
                className="h-auto w-full rounded-md"
                priority={false}
              />
            </div>
          </Reveal>
        </section>

        {/* ---------- Trust / proof strip ---------- */}
        <section className={SECTION}>
          <Reveal>
            <Card className="glow-evidence elev-2 text-center">
              <h2 className={`${H2} mx-auto max-w-[24ch]`}>
                The trust path runs on your device
              </h2>
              <p className="mx-auto mt-4 max-w-[60ch] text-[15px] leading-relaxed text-ink2">
                Verification runs on YOUR device — recompute the SHA-256, check the
                ed25519 signature. No GlassBox server in the trust path.
              </p>
              <div className="mono mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[13px] text-faint">
                {["ed25519", "SHA-256", "Walrus", "Sui"].map((t, i) => (
                  <span key={t} className="inline-flex items-center gap-3">
                    {i > 0 ? <span aria-hidden className="text-line-strong">·</span> : null}
                    <span className="text-ink2">{t}</span>
                  </span>
                ))}
              </div>
            </Card>
          </Reveal>
        </section>

        {/* ---------- Two roles ---------- */}
        <section className={SECTION}>
          <Reveal>
            <h2 className={H2}>Two roles, one record</h2>
          </Reveal>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              {
                tag: "Provider",
                t: "Sign the decision",
                b: "Run the Bull/Bear debate, resolve a verdict, then sign and anchor the record so the call is fixed in evidence — exactly as the AI made it.",
                cta: ["Run an analysis", "/login"] as const,
                accent: "text-brand",
              },
              {
                tag: "Auditor",
                t: "Verify the decision",
                b: "Open any record and re-check it on your own device. Recompute the fingerprint, confirm the signature, and watch a single edit break it.",
                cta: ["Verify a record", "/verify/demo"] as const,
                accent: "text-accent",
              },
            ].map((r, i) => (
              <Reveal key={r.tag} index={i}>
                <Card interactive className="flex h-full flex-col">
                  <span
                    className={`text-[12px] font-bold uppercase tracking-wide ${r.accent}`}
                  >
                    {r.tag}
                  </span>
                  <h3 className="mt-2 mb-0 text-[20px] font-bold text-ink">{r.t}</h3>
                  <p className="mt-2 mb-5 text-[14px] leading-snug text-muted">
                    {r.b}
                  </p>
                  <div className="mt-auto">
                    <Button href={r.cta[1]} variant="secondary">
                      {r.cta[0]}
                    </Button>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- Final CTA band ---------- */}
        <section className="pb-20 pt-4">
          <Reveal>
            <Card className="glow-evidence elev-3 text-center">
              <h2 className={`${H2} mx-auto max-w-[22ch]`}>
                Make an AI decision you can prove.
              </h2>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button href="/login" variant="primary" size="lg">
                  Run an analysis
                </Button>
                <Button href="/verify/demo" variant="secondary" size="lg">
                  Verify a record →
                </Button>
              </div>
              <p className="mt-4 text-[13px] text-muted">
                Tamper-evident, not tamper-proof. An evidence layer — not advice,
                not a compliance guarantee.
              </p>
            </Card>
          </Reveal>
        </section>
      </div>
    </AppShell>
  );
}
