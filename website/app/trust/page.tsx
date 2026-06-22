import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title: "Trust & security — GlassBox",
  description:
    "What GlassBox proves, what it deliberately does not, the trust path, and our subprocessors.",
};

function Proves({ yes, children }: { yes: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-[14px] text-ink2">
      <span aria-hidden className={yes ? "text-bull" : "text-bear"}>
        {yes ? "✓" : "✗"}
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function TrustPage() {
  return (
    <AppShell variant="marketing" maxWidth="marketing">
      <h1 className="m-0 text-[clamp(34px,6vw,52px)] font-extrabold leading-tight tracking-tight text-ink">
        Honest by construction.
      </h1>
      <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-ink2">
        GlassBox is an <b>evidence layer</b>. The strongest thing we can do for your trust is be
        exact about what the proof means — and what it doesn&apos;t.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="m-0 text-[15px] font-bold text-ink">What it proves</h2>
          <ul className="mt-3 flex list-none flex-col gap-2.5 p-0">
            <Proves yes>
              <b>Origin.</b> The ed25519 signature shows the record came from the published key.
            </Proves>
            <Proves yes>
              <b>Non-alteration.</b> The on-chain Sui object anchors the fingerprint — change one
              byte and it no longer matches.
            </Proves>
            <Proves yes>
              <b>Independence.</b> Anyone re-checks it in their own browser; no GlassBox server is
              in the trust path.
            </Proves>
          </ul>
        </Card>
        <Card>
          <h2 className="m-0 text-[15px] font-bold text-ink">What it does NOT prove</h2>
          <ul className="mt-3 flex list-none flex-col gap-2.5 p-0">
            <Proves yes={false}>
              That the inputs were true or the call was correct. It records the decision; it
              doesn&apos;t validate it.
            </Proves>
            <Proves yes={false}>
              A precise wall-clock time. The anchor is a Sui storage <b>epoch</b> — an independent
              reference, not a timestamp.
            </Proves>
            <Proves yes={false}>
              Profit, returns, or compliance. Signal Strength is decisiveness, not a forecast;
              this is not advice or a compliance guarantee.
            </Proves>
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="m-0 text-[15px] font-bold text-ink">The trust path</h2>
        <p className="mt-2 mb-0 text-[14px] leading-relaxed text-ink2">
          A decision is signed (ed25519), written to <b>Walrus</b>, and registered as an on-chain
          <b> Sui object</b>. Verification recomputes the SHA-256 of the canonical record in your
          browser and checks it against the published key and the on-chain anchor. The record is
          PII-free; the goal text is held in a crypto-erasable store.
        </p>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="m-0 text-[15px] font-bold text-ink">Subprocessors</h2>
          <p className="mt-2 mb-0 text-[13px] leading-snug text-muted">
            Decision data flows through: <b>Walrus</b> (blob storage), <b>Sui</b> (on-chain
            anchor), and an <b>LLM provider</b> (Gemini / OpenRouter) for the Bull/Bear debate.
            Market inputs come from CoinGecko + DeepBook.
          </p>
        </Card>
        <Card>
          <h2 className="m-0 text-[15px] font-bold text-ink">Security posture</h2>
          <p className="mt-2 mb-0 text-[13px] leading-snug text-muted">
            SOC 2 / ISO 27001: <b className="text-warn">not yet — on the roadmap</b>. We state this
            honestly rather than imply a certification we don&apos;t hold. Found an issue? Reach the
            team from the{" "}
            <a href="/about" className="text-accent no-underline">
              About page
            </a>
            .
          </p>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/verify/demo" variant="primary">
          Verify a record yourself
        </Button>
        <Button href="/#how" variant="secondary">
          How it works
        </Button>
      </div>
    </AppShell>
  );
}
