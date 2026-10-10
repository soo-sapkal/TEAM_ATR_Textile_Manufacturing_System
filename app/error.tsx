"use client";

import { useEffect } from "react";
import { Button, PageHeader } from "@/components/ui/primitives";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Loom Ledger route error", error.digest ?? "unclassified");
  }, [error]);
  return <main className="permission-denied" role="alert">
    <PageHeader eyebrow="Page error" title="This workbench could not be opened." description="The page failed to render. Your demo state has not been submitted to a mill system." />
    <Button onClick={() => reset()}>Try this page again</Button>
  </main>;
}
