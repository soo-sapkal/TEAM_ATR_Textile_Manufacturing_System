import { MachineRoute } from "@/components/pages/MachinePages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MachineRoute path={`/machines/${id}`} id={id} />;
}
