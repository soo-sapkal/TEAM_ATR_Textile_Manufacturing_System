import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Card, InfoStrip, PageHeader } from "@/components/ui/primitives";

export default async function PublicRollTokenPage({ params }: { params: Promise<{ token: string }> }) {
  // Do not look up raw roll codes or disclose whether a token belongs to a real record.
  await params;
  return <main className="portal-main">
    <PageHeader eyebrow="Public trace · limited view" title="Trace link unavailable" description="This demo does not issue or resolve public roll tokens." actions={<Link href="/" className="btn btn--secondary"><ArrowLeft size={14}/> Back to Loom Ledger</Link>} />
    <Card title="A signed mill token is required">
      <InfoStrip tone="warning"><ShieldAlert size={17}/>Public QR lookup is intentionally disabled until the mill backend issues and validates an opaque, signed token. An internal roll code is not accepted as a public lookup key.</InfoStrip>
      <p className="field__hint">No roll, buyer, supplier, employee, machine, or cost details were loaded.</p>
    </Card>
  </main>;
}
