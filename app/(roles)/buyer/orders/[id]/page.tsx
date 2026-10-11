import { BuyerOrderDetailPage } from "@/components/pages/BuyerOrdersPage";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BuyerOrderDetailPage id={id} />;
}
