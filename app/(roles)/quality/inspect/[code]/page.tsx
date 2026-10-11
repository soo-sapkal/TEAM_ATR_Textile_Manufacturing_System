import { QualityRoute } from "@/components/pages/QualityPages";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <QualityRoute path={`/quality/inspect/${code}`} id={code} />;
}
