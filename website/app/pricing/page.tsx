import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title: "Pricing — GlassBox",
  description:
    "Evidence Retention pricing for GlassBox — priced on seats, anchored-decision volume, and retention window. Not a compliance product.",
};

type Tier = {
  name: string;
  price: string;
  blurb: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Hackathon",
    price: "Free",
    blurb: "Everything you need to try the full flow during the event.",
    features: [
      "Run analyses + sign & anchor records",
      "Public verify links + interactive tamper",
      "Walrus + Sui testnet anchoring",
      "1 seat",
    ],
    cta: "Try the live demo",
    href: "/login",
  },
  {
    name: "Team",
    price: "$—",
    blurb: "For a desk that wants its AI decisions on the record.",
    features: [
      "Everything in Hackathon",
      "Up to 5 seats",
      "Shared decision history",
      "Auditor read-access by link",
    ],
    cta: "Talk to us",
    href: "/about",
  },
  {
    name: "Evidence Retention",
    price: "$——",
    blurb: "The SKU: keep a verifiable trail of what your AI decided.",
    features: [
      "Priced on seats + anchored-decision volume + retention window",
      "Long-horizon record retention",
      "Audit-export pack",
      "Mainnet anchoring",
    ],
    cta: "Talk to us",
    href: "/about",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    blurb: "Org controls, SSO, and a dedicated anchor configuration.",
    features: [
      "Everything in Evidence Retention",
      "SSO + org roles",
      "Custom retention + residency",
      "Priority support",
    ],
    cta: "Talk to us",
    href: "/about",
  },
];

export default function PricingPage() {
  return (
    <AppShell variant="marketing" maxWidth="marketing">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-warn/50 bg-warn/10 px-3 py-1 text-[13px] text-warn">
        <span aria-hidden>◷</span> Free during the hackathon — no card, no catch.
      </div>
      <h1 className="m-0 text-[clamp(34px,6vw,52px)] font-extrabold leading-tight tracking-tight text-ink">
        Priced on <span className="text-brand">evidence kept</span>, not promises made.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[17px] leading-relaxed text-ink2">
        GlassBox is an evidence layer — the SKU is <b>Evidence Retention</b>, not “Compliance.”
        It produces a verifiable record of what your AI decided; it does not validate your model
        or guarantee compliance.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((t) => (
          <Card
            key={t.name}
            className={
              t.featured
                ? "relative border-brand/60 shadow-[0_8px_40px_rgba(124,92,255,.18)]"
                : undefined
            }
          >
            {t.featured ? (
              <span className="absolute -top-2.5 left-5 rounded-full border border-brand/60 bg-brand/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">
                The SKU
              </span>
            ) : null}
            <h2 className="m-0 text-[16px] font-bold text-ink">{t.name}</h2>
            <div className="mt-1 text-[28px] font-extrabold text-ink">{t.price}</div>
            <p className="mt-1 mb-4 text-[13px] leading-snug text-muted">{t.blurb}</p>
            <ul className="mb-5 flex list-none flex-col gap-2 p-0 text-[13px] text-ink2">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span aria-hidden className="text-accent">
                    ✓
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              href={t.href}
              variant={t.featured ? "primary" : "secondary"}
              className="w-full"
            >
              {t.cta}
            </Button>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-[13px] text-muted">
        Anchoring uses Walrus + an on-chain Sui object (a storage epoch, an independent reference
        — not a wall-clock timestamp). Tamper-evident, not tamper-proof.
      </p>
    </AppShell>
  );
}
