import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title: "About — GlassBox",
  description:
    "GlassBox makes the record of an AI's financial decision tamper-evident. Built for the Encode Vibe Hackathon by The Start of a Joke.",
};

export default function AboutPage() {
  return (
    <AppShell variant="marketing" maxWidth="marketing">
      <h1 className="m-0 text-[clamp(34px,6vw,52px)] font-extrabold leading-tight tracking-tight text-ink">
        We&apos;re not selling that the AI is right.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[17px] leading-relaxed text-ink2">
        We&apos;re selling that <b>no one can quietly edit what it decided</b>. AI is starting to
        make financial calls, and the record of those calls is usually a log the operator can edit.
        GlassBox makes that record tamper-evident, and lets anyone verify it themselves.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="m-0 text-[15px] font-bold text-ink">The team</h2>
          <p className="mt-2 mb-0 text-[14px] leading-relaxed text-ink2">
            <b>The Start of a Joke</b>
            <br />
            Supavich Aussawaauschariyakul · Orestis Kap
          </p>
          <p className="mt-3 mb-0 text-[13px] text-muted">
            Built for the <b>Encode Vibe Coding Hackathon</b>, London.
          </p>
        </Card>
        <Card>
          <h2 className="m-0 text-[15px] font-bold text-ink">How it&apos;s built</h2>
          <ul className="mt-2 mb-0 flex list-none flex-col gap-2 p-0 text-[13px] text-ink2">
            <li>· A hand-written multi-agent brain (Bull / Bear / Risk Arbiter)</li>
            <li>· ed25519 signing → Walrus storage → on-chain Sui anchor</li>
            <li>· Spec-first frontend; verify runs client-side (Web Crypto)</li>
            <li>· Provider-agnostic LLM (Gemini / OpenRouter)</li>
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <p className="m-0 text-[13px] leading-snug text-muted">
          GlassBox is an evidence layer — <b>tamper-evident, not tamper-proof</b>. The signature
          proves origin; the on-chain Sui object is an independent anchor (a storage epoch, not a
          wall-clock timestamp). It is not advice, not model validation, and not a compliance
          guarantee.
        </p>
      </Card>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/login" variant="primary">
          Try the live demo
        </Button>
        <a
          href="https://github.com/supawichza40/glassbox"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-[15px] font-semibold text-ink2 no-underline hover:text-ink hover:border-[#3a4757]"
        >
          View the code on GitHub ↗
        </a>
      </div>
    </AppShell>
  );
}
