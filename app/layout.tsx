import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Public_Sans } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Loom Ledger — Everest Textile Mills", template: "%s · Loom Ledger" },
  description: "The mill's shared record—from yarn gate to buyer dispatch.",
  applicationName: "Loom Ledger",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}><body><a className="skip-link" href="#main-content">Skip to main content</a><Providers>{children}</Providers></body></html>;
}
