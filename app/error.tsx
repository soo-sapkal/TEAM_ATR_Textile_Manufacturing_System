"use client";

import { useEffect } from "react";
import { Button, PageHeader } from "@/components/ui/primitives";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Loom Ledger route error", error.digest ?? "unclassified");
  }, [error]);
  return <main className="permission-denied" role="alert">
    <PageHeader eyebrow="Page error" title="An error occurred while loading this page." description="Please try refreshing the page or contact support if the problem persists." />
    <Button onClick={() => reset()}>Try this page again</Button>
  </main>;
}
