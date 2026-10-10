import Link from "next/link";
import { ShieldX } from "lucide-react";
import { BrandMark, LinkButton } from "@/components/ui/primitives";

export default function ForbiddenPage() {
  return <main className="login-wrap"><section className="login-story"><BrandMark/><div><span className="kicker" style={{ color: "var(--turmeric)" }}>Permission boundary</span><h1>Not your station.</h1><p>This account does not have the permission needed for that page. Switch demo roles or return to the Gate.</p></div></section><section className="login-form-panel"><ShieldX size={34}/><h2 style={{ font: "900 40px var(--font-display)" }}>Access denied</h2><p>This is an explicit forbidden state, not an empty page.</p><div className="hero-actions"><LinkButton href="/login">Switch demo role</LinkButton><Link href="/" className="btn btn--secondary">Return home</Link></div></section></main>;
}
