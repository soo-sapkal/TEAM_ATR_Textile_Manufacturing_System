"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { DemoProvider } from "@/lib/demo/context";
import { ToastViewport } from "@/components/shell/ToastViewport";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: 1 }, mutations: { retry: 0 } },
  }));
  return <QueryClientProvider client={queryClient}><DemoProvider>{children}<ToastViewport /></DemoProvider></QueryClientProvider>;
}
