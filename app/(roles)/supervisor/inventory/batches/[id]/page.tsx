import { InventoryRoute } from "@/components/pages/InventoryPages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InventoryRoute path={`/inventory/batches/${id}`} id={id} />;
}
