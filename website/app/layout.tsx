import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://glassbox.local"),
  title: {
    default: "GlassBox — tamper-evident AI financial decisions",
    template: "%s · GlassBox",
  },
  description:
    "An evidence layer for AI financial decisions: a Bull/Bear debate, a signed verdict, and an on-chain anchor anyone can independently re-verify in their browser. Tamper-evident, not tamper-proof.",
  applicationName: "GlassBox",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
