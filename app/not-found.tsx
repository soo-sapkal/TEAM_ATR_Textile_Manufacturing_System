import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark, PageHeader } from "@/components/ui/primitives";

export default function NotFound() {
  return <main className="permission-denied" aria-labelledby="not-found-title">
    <Link href="/" aria-label="Loom Ledger home"><BrandMark/></Link>
    <PageHeader eyebrow="404 · route not found" title="That page is not on this thread." description="The address may be outdated, or the route may not be part of this frontend build." />
    <Link href="/" className="btn btn--primary"><ArrowLeft size={15}/> Return to the Gate</Link>
    <p className="field__hint">Staff and buyer records remain behind their separate route boundaries.</p>
  </main>;
}
