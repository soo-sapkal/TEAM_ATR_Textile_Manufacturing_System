import { BuyerOrderDetailPage } from "@/components/portal/BuyerPortal";

export default async function BuyerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BuyerOrderDetailPage id={decodeURIComponent(id)}/>;
}
