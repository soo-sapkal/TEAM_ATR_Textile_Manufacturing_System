import { BuyerPortalShell } from "@/components/portal/BuyerPortal";

export default function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <BuyerPortalShell>{children}</BuyerPortalShell>;
}
