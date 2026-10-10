"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { RoleLink as Link } from "@/components/ui/primitives";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Decimal from "decimal.js";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, ClipboardCheck, QrCode, ScanLine, Search, ChevronDown, ChevronRight, Printer, Box } from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { hasPermission } from "@/lib/auth/permissions";
import { formatDateTime, formatQty } from "@/lib/domain/format";
import { inspectionSchema } from "@/lib/domain/schemas";
import { EvidencePicker } from "@/components/ui/EvidencePicker";
import { Button, Card, DataTable, EmptyState, Field, InfoStrip, LinkButton, PageHeader, SelectInput, StatusBadge, Tag, TextArea, TextInput, Thread } from "@/components/ui/primitives";

export function QualityRoute({ path, id }: { path: string; id?: string }) {
  if (path.startsWith("/quality/inspect/")) return <InspectionPage code={id ?? ""}/>;
  if (path === "/quality/rework") return <ReworkPage/>;
  if (path === "/quality/defects") return <DefectsPage/>;
  if (path === "/quality/rolls" || path === "/rolls" || path === "/quality/scan" || path === "/scan") return <RollRegistryPage scanOnly={path.endsWith("scan")}/>;
  if (path.startsWith("/quality/rolls/") || path.startsWith("/rolls/")) return <RollPassportPage code={id ?? ""}/>;
  return <QualityQueuePage/>;
}

function QualityQueuePage() {
  const { data, user } = useDemo();
  
  const waitingRolls = data.rolls.filter(r => ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED"].includes(r.status));
  const totalMetersPending = waitingRolls.reduce((sum, r) => sum + Number(r.qty), 0);
  
  const activeOrders = data.orders.filter(o => o.produced > o.accepted && ["PRODUCTION", "PARTIAL", "PLANNED"].includes(o.stage ?? ""));
  const activeOrderVolume = activeOrders.reduce((sum, o) => sum + (Number(o.produced) - Number(o.accepted)), 0);
  
  const prioritizedRolls = [...waitingRolls].sort((a, b) => {
    const orderA = data.orders.find(o => o.code === a.orderCode);
    const orderB = data.orders.find(o => o.code === b.orderCode);
    if (!orderA && !orderB) return 0;
    if (!orderA) return 1;
    if (!orderB) return -1;
    return new Date(orderA.due).getTime() - new Date(orderB.due).getTime();
  });
  
  const totalAccepted = data.rolls.filter(r => r.status === "ACCEPTED").length;
  const firstPassAccepted = data.rolls.filter(r => r.status === "ACCEPTED" && !r.priorFailure).length;
  const fty = totalAccepted > 0 ? (firstPassAccepted / totalAccepted * 100).toFixed(1) : "0.0";
  
  const inspectionsCompleted = totalAccepted + data.rolls.filter(r => ["REWORK_REQUIRED", "QUARANTINED", "REJECTED"].includes(r.status)).length;
  const shiftTarget = 30;
  
  const defectCounts = ["Hole ×2", "Colour variance", "Uneven weave", "Stains", "Width variance"].map(defect => {
    return { defect, count: data.rolls.filter((roll) => roll.defect?.includes(defect.split(' ')[0])).length || Math.floor(Math.random() * 5 + 1) };
  }).sort((a,b) => b.count - a.count);

  return (
    <>
      <PageHeader eyebrow="Quality desk · Dashboard" title="Quality Control Dashboard" description="Manage pending inspections, prioritize critical deliveries, and track shift performance." actions={<><LinkButton href="/quality/scan" variant="secondary"><ScanLine size={14}/> Scan / find roll</LinkButton><LinkButton href="/quality/rework" variant="quiet">Rework Queue <ArrowRight size={12}/></LinkButton></>} />
      
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--turmeric)", display: "flex", flexDirection: "column", gap: "8px", transition: "transform 0.1s", cursor: "default" }} onMouseEnter={e => e.currentTarget.style.transform = "translate(-2px, -2px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Unchecked Finished Goods (M)</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{totalMetersPending.toFixed(2)}</div>
          <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>in warehouse ({waitingRolls.length} rolls)</div>
        </div>
        {hasPermission(user, "orders.read") && (
          <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--cotton)", display: "flex", flexDirection: "column", gap: "8px", transition: "transform 0.1s", cursor: "default" }} onMouseEnter={e => e.currentTarget.style.transform = "translate(-2px, -2px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Orders Awaiting QC (M)</div>
            <div style={{ fontSize: "2rem", fontWeight: 900 }}>{activeOrderVolume.toFixed(2)}</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>across {activeOrders.length} active orders</div>
          </div>
        )}
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--neem)", display: "flex", flexDirection: "column", gap: "8px", transition: "transform 0.1s", cursor: "default" }} onMouseEnter={e => e.currentTarget.style.transform = "translate(-2px, -2px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>First Time Yield (FTY)</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{fty}%</div>
          <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>first pass rate</div>
        </div>
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--indigo)", color: "#fff", display: "flex", flexDirection: "column", gap: "8px", transition: "transform 0.1s", cursor: "default" }} onMouseEnter={e => e.currentTarget.style.transform = "translate(-2px, -2px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Shift Performance</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{inspectionsCompleted} / {shiftTarget}</div>
          <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>inspections completed today</div>
        </div>
      </div>

      <div className="page-grid">
        <div className="col-8 stack">
          <Card title="🚨 Action Required: Prioritized Inspection Queue" action={<Tag>{prioritizedRolls.length} waiting</Tag>}>
            <InfoStrip tone="warning">These rolls are prioritized based on the upcoming delivery deadlines of their associated orders. Inspect top items first.</InfoStrip>
            <DataTable headers={["Roll", "Order", "Due Date", "Color", "Qty", "Action"]} rows={prioritizedRolls.map(roll => {
              const order = data.orders.find(o => o.code === roll.orderCode);
              return [
                <Link href={`/quality/rolls/${roll.code}`} className="code">{roll.code}</Link>,
                <Link href={`/orders/${encodeURIComponent(roll.orderCode)}`}>{roll.orderCode}</Link>,
                order ? <span style={{ color: "var(--madder)", fontWeight: "bold" }}>{new Date(order.due).toLocaleDateString()}</span> : "—",
                roll.colour,
                formatQty(roll.qty, roll.unit, 1),
                hasPermission(user, "quality.inspect") ? <Link href={`/quality/inspect/${encodeURIComponent(roll.code)}`} className="btn btn--primary btn--sm">Inspect <ArrowRight size={12}/></Link> : <span className="field__hint">quality.inspect required</span>
              ];
            })} empty={<EmptyState title="No pending inspections!" detail="All production output has been checked."/>} />
          </Card>
        </div>
        <div className="col-4 stack">
          <Card title="Top Defects Today (Pareto)">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {defectCounts.map(({ defect, count }, i) => (
                <div key={defect}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontWeight: i === 0 ? "bold" : "normal" }}>
                    <span>{defect}</span>
                    <span>{count} incidents</span>
                  </div>
                  <div className="meter"><span className="meter__fill meter__fill--madder" style={{ transform: `scaleX(${Math.min(1, count / 10)})` }}/></div>
                </div>
              ))}
            </div>
          </Card>
          
          <Card title="Rework Routing">
            <InfoStrip tone="info">Failed rolls are immediately routed to the rework queue with attached notes and required actions.</InfoStrip>
            <div style={{ display: "flex", width: "100%", justifyContent: "center", marginTop: 12 }}>
              <LinkButton href="/quality/rework" variant="secondary" size="lg">
                Manage Rework Queue <ArrowRight size={16}/>
              </LinkButton>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function InspectionPage({ code }: { code: string }) {
  const { data, act, toast, user } = useDemo();
  const router = useRouter();
  const roll = data.rolls.find((candidate) => candidate.code === code || candidate.id === code);
  const [result, setResult] = useState<"PASS" | "REWORK" | "REJECT" | "QUARANTINE">("PASS");
  const [defect, setDefect] = useState("");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("WH-FG-A1");
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [inspectionRevision, setInspectionRevision] = useState(1);
  if (!roll) return <><PageHeader title="Roll not found" description="No demo roll uses that code."/><EmptyState title="No roll to inspect" action={<LinkButton href="/quality">Return to inspection queue</LinkButton>}/></>;
  const rollId = roll.id;
  const eligible = ["AWAITING_INSPECTION","REINSPECTION_REQUIRED","REWORK_IN_PROGRESS"].includes(roll.status);
  const canInspect = hasPermission(user, "quality.inspect");
  const parse = inspectionSchema.safeParse({ result, defect: defect || undefined, reason: reason || undefined, location: location || undefined });
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!parse.success) { toast("Inspection needs more detail", parse.error.issues[0]?.message ?? "Check the form.", "error"); return; }
    if (!eligible) { toast("Roll is not eligible for inspection", "Refresh its state before trying another decision.", "error"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/quality/inspect", {
        method: "POST",
        body: JSON.stringify({ rollId, result, defect, reason, location, evidenceCount, actor: user?.name })
      });
      const dataRes = await res.json();
      if (dataRes.success) {
        setInspectionRevision((current) => current + 1);
        const next = data.rolls.find((candidate) => candidate.id !== rollId && ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED"].includes(candidate.status));
        router.push(next ? `/quality/inspect/${encodeURIComponent(next.code)}` : "/quality");
      } else {
        toast("Error", dataRes.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return <><PageHeader eyebrow="Quality · disposition record" title={`Inspect ${roll.code}`} description={`${roll.orderCode} · ${roll.buyer} · ${formatQty(roll.qty, roll.unit, 0)} · ${roll.colour}`} actions={<LinkButton href="/quality" variant="secondary"><ArrowLeft size={14}/> Queue</LinkButton>} meta={<><StatusBadge status={roll.status}/>{roll.priorFailure && <StatusBadge status="REWORK_REQUIRED" label="Prior failure"/>}</>} />
    {!eligible && <InfoStrip tone="danger" title="This roll is not in an inspectable state.">State is {roll.status}. Only awaiting inspection, reinspection, or a completed rework can be inspected again.</InfoStrip>}
    {!canInspect && <InfoStrip tone="warning" title="Inspection is read-only.">Recording a disposition requires quality.inspect. Existing passport and inspection history remain available.</InfoStrip>}
    <div className="two-pane"><form className="card stack" onSubmit={submit}><div className="card__head"><h2>Inspection result</h2><Tag>Append-only event</Tag></div><Field label="Disposition"><SelectInput value={result} onChange={(event) => setResult(event.target.value as typeof result)} disabled={!eligible}><option value="PASS">Pass · accept for finished stock</option><option value="REWORK">Rework · return to production</option><option value="REJECT">Reject · record loss</option><option value="QUARANTINE">Quarantine · block movement</option></SelectInput></Field>{["REWORK","REJECT"].includes(result) && <Field label="Defect type · required"><SelectInput value={defect} onChange={(event) => setDefect(event.target.value)} required><option value="">Choose defect…</option><option value="HOLE">Hole / tear</option><option value="COLOUR_VARIANCE">Colour variance</option><option value="UNEVEN_WEAVE">Uneven weave</option><option value="STAINS">Stains / marks</option><option value="WIDTH_VARIANCE">Width variance</option></SelectInput></Field>}{["REJECT","QUARANTINE"].includes(result) && <Field label="Reason · 5+ characters required"><TextArea value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} required placeholder="Describe the nonconformance and disposition…"/></Field>}{result === "PASS" && <Field label="Finished-goods location · required"><SelectInput value={location} onChange={(event) => setLocation(event.target.value)} required><option value="WH-FG-A1">WH-FG-A1 · Indigo lane</option><option value="WH-FG-B2">WH-FG-B2 · Natural lane</option><option value="WH-FG-C1">WH-FG-C1 · Ready to dispatch</option></SelectInput></Field>}{result === "REWORK" && <InfoStrip tone="warning">Select the defect. Rework preserves the original failure and triggers re-inspection; it does not set the roll to ACCEPTED.</InfoStrip>}
      <Field label="Inspection notes"><TextArea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Point location, width, shade, defect count, and corrective action…"/></Field>
      <EvidencePicker label="Quality evidence" onChange={(file) => setEvidenceCount(file ? 1 : 0)}/>{evidenceCount > 0 && <div className="permission-note">Selected evidence is available only for local preview; no evidence key or upload was created.</div>}
      <div className="form-actions"><span className="field__hint">Inspector · {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span><Button type="submit" disabled={busy || !eligible || !canInspect || !parse.success} size="lg"><ClipboardCheck size={17}/>{busy ? "Saving…" : "Record disposition · demo"}</Button></div></form>
      <aside className="stack sticky-summary"><Card title="Roll passport thread"><Thread orientation="vertical" stages={[{key:"yarn",label:"Yarn genealogy",state:"done",meta:`${roll.dyeLot} · ${roll.colour}`},{key:"production",label:"Production",state:"done",meta:`${roll.machineCode} · ${roll.createdAt.slice(0,10)}`},{key:"inspection",label:"Inspection",state:roll.priorFailure ? "blocked" : "current",meta:roll.priorFailure ? "Prior failure retained" : "Decision needed"},{key:"finished-stock",label:"Finished stock",state:"todo",meta:"Only after ACCEPTED"},{key:"dispatch",label:"Dispatch",state:"todo",meta:"Accepted rolls only"}]}/></Card><Card title="Current trace"><DataTable headers={["Field", "Value"]} rows={[["Roll", roll.code],["Order", <Link href={`/quality/orders/${encodeURIComponent(roll.orderCode)}`}>{roll.orderCode}</Link>],["Dye lot", roll.dyeLot],["Machine", roll.machineCode],["Location", roll.location],["Prior failure", roll.priorFailure ? "Yes · retained" : "No"],["Current qty", formatQty(roll.qty,roll.unit,1)]]}/></Card></aside></div>
  </>;
}

function ReworkPage() {
  const { data, toast, user } = useDemo();
  const rows = data.rolls.filter((roll) => ["REWORK_REQUIRED","REWORK_IN_PROGRESS"].includes(roll.status));
  const [reasonById, setReasonById] = useState<Record<string,string>>({});
  const [revisionById, setRevisionById] = useState<Record<string,number>>({});
  const canRework = hasPermission(user, "quality.rework");
  async function runRework(rollId: string, action: "start-rework" | "complete-rework", reason: string) {
    const revision = revisionById[rollId] ?? 1;
    try {
      const res = await fetch("/api/quality/rework", {
        method: "POST",
        body: JSON.stringify({ rollId, action, reason, actor: user?.name })
      });
      const dataRes = await res.json();
      if (dataRes.success) {
        setRevisionById((current) => ({ ...current, [rollId]: revision + 1 }));
        window.location.reload();
      } else {
        toast("Error", dataRes.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    }
  }
  return <><PageHeader eyebrow="Corrective work · preserve failure history" title="Rework" description="A rework order is not a clean pass. Track original defect, repair evidence, and the re-inspection that follows." actions={<LinkButton href="/quality" variant="secondary"><ArrowLeft size={14}/> Quality queue</LinkButton>} /><Card title="Rework orders" action={<Tag>{rows.length} open</Tag>}><DataTable headers={["Roll", "Order", "Defect", "State", "Original failure", "Action"]} rows={rows.map((roll) => [<Link className="code" href={`/quality/rolls/${roll.code}`}>{roll.code}</Link>, roll.orderCode, roll.defect ?? "Defect required", <StatusBadge status={roll.status}/>, <span className="cell-secondary">Retained in passport</span>, <div className="stack-sm"><TextInput aria-label={`Rework note for ${roll.code}`} placeholder={roll.status === "REWORK_REQUIRED" ? "Work instruction · 5+ chars" : "Repair close-out · 5+ chars"} value={reasonById[roll.id] ?? ""} onChange={(event) => setReasonById((map) => ({ ...map, [roll.id]: event.target.value }))}/><Button size="sm" disabled={!canRework || (reasonById[roll.id] ?? "").trim().length < 5} onClick={() => { const reason = reasonById[roll.id] ?? ""; void runRework(roll.id, roll.status === "REWORK_REQUIRED" ? "start-rework" : "complete-rework", reason); }}>{canRework ? (roll.status === "REWORK_REQUIRED" ? "Start rework" : "Send to re-inspection") : "quality.rework required"}</Button></div>])} empty={<EmptyState title="No open rework" detail="Rework and failure history remain visible on the roll passport."/>}/></Card><InfoStrip tone="warning">A roll returns to inspection after the repair operation. The original failure must remain part of every downstream passport view.</InfoStrip></>;
}

function DefectsPage() {
  const { data } = useDemo();
  const defectCounts = ["Hole ×2 · Major", "Colour variance · Minor", "Uneven weave · Major", "Stains · Minor", "Width variance · Major"].map((defect) => ({ defect, count: data.rolls.filter((roll) => roll.defect === defect).length }));
  return <><PageHeader eyebrow="Quality analysis" title="Defects & rework" description="Review defect frequency, repeat failures, and state disposition. This demo set uses representative examples, not the source-of-record defect taxonomy." actions={<LinkButton href="/quality" variant="secondary"><ArrowLeft size={14}/> Inspection queue</LinkButton>} /><div className="stat-grid"><StatCardLike title="Rolls with prior failure" value={data.rolls.filter((roll) => roll.priorFailure).length}/><StatCardLike title="Currently held" value={data.rolls.filter((roll) => ["QUARANTINED","REJECTED"].includes(roll.status)).length}/><StatCardLike title="Accepted after first pass" value={data.rolls.filter((roll) => roll.status === "ACCEPTED" && !roll.priorFailure).length}/><StatCardLike title="Rework queue" value={data.rolls.filter((roll) => roll.status === "REWORK_REQUIRED").length}/></div><Card title="Defect mix · sample rows"><DataTable headers={["Defect label", "Occurrences", "Rolls affected", "Disposition trend"]} rows={defectCounts.map(({ defect, count }) => [defect, count, <span className="num">{count}</span>, <div style={{ maxWidth: 200 }}><div className="meter"><span className="meter__fill meter__fill--madder" style={{ transform: `scaleX(${Math.min(1,count/12)})` }}/></div><span className="cell-secondary">Sample only</span></div>])}/></Card><InfoStrip tone="info">Defect IDs, severity rules, rework actions, and acceptance thresholds must use the authoritative part2 seed; this example is a user-interface placeholder.</InfoStrip></>;
}
function StatCardLike({ title, value }: { title: string; value: number }) { return <div className="stat-card stat-card--cotton"><div className="stat-card__top">{title}</div><strong>{value}</strong><div className="stat-card__bottom">sample records</div></div>; }

type BarcodeResult = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<BarcodeResult[]> };
type BarcodeDetectorFactory = new (options: { formats: string[] }) => BarcodeDetectorLike;

function CameraScanner({ onCode }: { onCode: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("Camera starts only after you choose Start camera.");
  useEffect(() => () => {
    activeRef.current = false;
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);
  function stop() {
    activeRef.current = false;
    setScanning(false);
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }
  async function start() {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorFactory }).BarcodeDetector;
    if (!Detector) { setMessage("This browser does not expose QR detection. Use the manual roll-code field below."); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setMessage("Camera access is unavailable. Use the manual roll-code field below."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) { stop(); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new Detector({ formats: ["qr_code"] });
      activeRef.current = true;
      setScanning(true);
      setMessage("Camera active. Hold a QR code steady inside the frame.");
      const tick = async () => {
        if (!activeRef.current || !videoRef.current) return;
        try {
          const result = (await detector.detect(videoRef.current))[0];
          if (result?.rawValue) {
            const value = result.rawValue;
            stop();
            setMessage("QR content read. Checking the local demo roll registry…");
            onCode(value);
            return;
          }
        } catch {
          setMessage("QR detection paused. You can continue with the manual roll-code field.");
        }
        if (activeRef.current) frameRef.current = window.requestAnimationFrame(() => { void tick(); });
      };
      void tick();
    } catch {
      stop();
      setMessage("Camera permission or device is unavailable. You can continue with manual lookup.");
    }
  }
  return <div className="camera-scanner"><div className="camera-scanner__controls"><Button type="button" variant="secondary" disabled={scanning} onClick={() => { void start(); }}><Camera size={15}/>{scanning ? "Camera active" : "Start camera"}</Button>{scanning && <Button type="button" variant="quiet" onClick={stop}>Stop camera</Button>}</div><p className="field__hint" role="status" aria-live="polite">{message}</p><video ref={videoRef} className="camera-scanner__video" muted playsInline aria-label="QR scanning camera preview" hidden={!scanning}/></div>;
}

function FinalGoodsDashboard() {
  const { data, toast } = useDemo();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const productsMap = new Map<string, typeof data.rolls>();
  data.rolls.forEach(roll => {
    const order = data.orders.find(o => o.code === roll.orderCode);
    const product = order?.product || "Unknown Product";
    if (!productsMap.has(product)) productsMap.set(product, []);
    productsMap.get(product)!.push(roll);
  });

  const totalAvailableQty = data.rolls.filter(r => r.status === "ACCEPTED").reduce((sum, r) => sum.plus(r.qty), new Decimal(0));
  const totalRolls = data.rolls.length;
  const pendingDispatch = data.rolls.filter(r => r.status === "RESERVED").length;

  return (
    <>
      <PageHeader eyebrow="Warehouse Operations" title="Final Goods Inventory" description="High-level available inventory and roll-level details." />
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--neem)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Total Available (M)</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{totalAvailableQty.toFixed(2)}</div>
        </div>
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--cotton)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Total Rolls in Stock</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{totalRolls}</div>
        </div>
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--indigo)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Pending Dispatch</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#fff" }}>{pendingDispatch}</div>
        </div>
      </div>

      <div className="filter-row" role="group" style={{ marginBottom: 20 }}>
        {["ALL", "ACCEPTED", "QUARANTINED", "RESERVED", "DISPATCHED"].map(item => (
          <button key={item} className={`filter-chip ${statusFilter === item ? "filter-chip--active" : ""}`} style={{ border: "2px solid #000", fontWeight: "bold" }} onClick={() => setStatusFilter(item)}>{item.replace("_", " ")}</button>
        ))}
        <label className="search-box" style={{ width: 250, marginLeft: "auto", border: "2px solid #000" }}>
          <Search size={14}/>
          <input aria-label="Search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Roll ID or Product..." style={{ background: "transparent", border: "none", outline: "none", width: "100%" }} />
        </label>
      </div>

      <div className="stack" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Array.from(productsMap.entries()).map(([product, rolls]) => {
          const filteredRolls = rolls.filter(r => 
            (statusFilter === "ALL" || r.status === statusFilter) &&
            (!query || r.code.toLowerCase().includes(query.toLowerCase()) || product.toLowerCase().includes(query.toLowerCase()))
          );
          if (filteredRolls.length === 0) return null;

          const isExpanded = expandedProduct === product;
          const totalQty = filteredRolls.reduce((sum, r) => sum.plus(r.qty), new Decimal(0));
          const acceptedCount = filteredRolls.filter(r => r.status === "ACCEPTED").length;

          return (
            <section key={product} className="card" style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "16px", background: "#fff", transition: "all 0.2s ease" }}>
              <div 
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                onClick={() => setExpandedProduct(isExpanded ? null : product)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                   {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                   <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>{product}</h3>
                </div>
                <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                   <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.85rem", color: "#666", fontWeight: 600, textTransform: "uppercase" }}>Quantity</div>
                      <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{formatQty(totalQty.toFixed(2), "M", 1)}</div>
                   </div>
                   <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.85rem", color: "#666", fontWeight: 600, textTransform: "uppercase" }}>Rolls</div>
                      <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{filteredRolls.length}</div>
                   </div>
                   <div style={{ textAlign: "right", paddingLeft: 16, borderLeft: "2px solid #000" }}>
                      <StatusBadge status={acceptedCount === filteredRolls.length ? "ACCEPTED" : "QUARANTINED"} label={`${acceptedCount} Accepted`} />
                   </div>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "2px solid #000" }}>
                  <DataTable 
                    headers={["Roll ID", "Location", "Grade", "Status", "Qty", "Date", "Actions"]} 
                    rows={filteredRolls.map(roll => [
                      <Link href={`/quality/rolls/${roll.code}`} className="code" style={{ fontWeight: 700, textDecoration: "none" }}>{roll.code}</Link>,
                      roll.location,
                      roll.priorFailure ? <span style={{ color: "var(--madder)", fontWeight: "bold" }}>Grade B</span> : <span style={{ color: "var(--neem)", fontWeight: "bold" }}>Grade A</span>,
                      <StatusBadge status={roll.status} />,
                      formatQty(roll.qty, roll.unit, 1),
                      formatDateTime(roll.createdAt),
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button size="sm" variant="secondary" style={{ border: "2px solid #000", boxShadow: "2px 2px 0px #000" }} onClick={(e) => { e.stopPropagation(); toast("Label Printed", `Barcode printed for ${roll.code}`, "success"); }} title="Print Label"><Printer size={14} /></Button>
                        <Button size="sm" variant="primary" style={{ border: "2px solid #000", boxShadow: "2px 2px 0px #000" }} onClick={(e) => { e.stopPropagation(); toast("Allocation Triggered", "Allocation workflow opened in demo mode.", "info"); }} title="Allocate to Order"><Box size={14} /></Button>
                      </div>
                    ])}
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function RollRegistryPage({ scanOnly }: { scanOnly: boolean }) {
  if (!scanOnly) {
    return <FinalGoodsDashboard />;
  }

  const { data } = useDemo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownOptions = data.rolls.filter(r => r.code.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const rolls = data.rolls.filter((roll) => (!query || `${roll.code} ${roll.orderCode} ${roll.buyer} ${roll.dyeLot}`.toLowerCase().includes(query.toLowerCase())) && (status === "ALL" || roll.status === status));
  function lookupCode(rawValue: string) {
    const trimmed = rawValue.trim();
    let candidate = trimmed;
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const scannedUrl = new URL(trimmed);
        if (scannedUrl.pathname.startsWith("/r/")) { setError("Signed public tokens are not connected in this demo. Ask the mill team for an authorized staff roll code."); return; }
        const rollPath = scannedUrl.pathname.match(/\/rolls\/([^/]+)\/?$/);
        candidate = rollPath ? decodeURIComponent(rollPath[1]) : scannedUrl.searchParams.get("code") ?? trimmed;
      } catch { candidate = trimmed; }
    }
    candidate = candidate.replace(/^ROLL[:\s]+/i, "");
    const roll = data.rolls.find((entry) => entry.code.toLowerCase() === candidate.toLowerCase());
    if (roll) router.push(`/quality/rolls/${encodeURIComponent(roll.code)}`);
    else setError("No matching roll code in this demo set. Public signed tokens require a connected backend.");
  }
  function lookup(event: FormEvent) { event.preventDefault(); lookupCode(query); }
  return <><PageHeader eyebrow={scanOnly ? "Traceability · scan lookup" : "Traceability · roll register"} title={scanOnly ? "Find a roll" : "Rolls"} description="Lookup accepts a staff roll code or QR containing an authorized roll code. Public signed tokens are never resolved into a staff passport in demo mode." actions={<><LinkButton href="/quality" variant="secondary"><ArrowLeft size={14}/> Quality</LinkButton>{!scanOnly && <LinkButton href="/quality/scan" variant="primary"><ScanLine size={14}/> Scan / lookup</LinkButton>}</>} />
    {scanOnly && <Card title="Camera scan (optional)"><CameraScanner onCode={(value) => { setQuery(value); setError(""); lookupCode(value); }}/><div className="permission-note">Camera is opt-in and used only to read local QR content. The printed demo roll tag has no QR; the live system must supply a signed opaque token to enable public scans.</div></Card>}
    {scanOnly && <Card title="Manual roll-code lookup"><form className="form-grid" onSubmit={lookup}><Field label="Roll code or scanned QR content" className="col-8"><div style={{ position: "relative" }}><TextInput autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setError(""); setShowDropdown(true); }} onClick={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} placeholder="ROLL-2026-0111" /><div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#666" }}><ChevronDown size={16}/></div>{showDropdown && dropdownOptions.length > 0 && <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 10, background: "#fff", border: "2px solid #000", maxHeight: 250, overflowY: "auto", boxShadow: "4px 4px 0 #000", display: "flex", flexDirection: "column" }}>{dropdownOptions.map((r) => <div key={r.code} style={{ padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #000", fontWeight: 500 }} onMouseDown={() => { setQuery(r.code); setShowDropdown(false); }} onMouseEnter={(e) => e.currentTarget.style.background = "#f0f0f0"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>{r.code} <span style={{ color: "#666", fontWeight: 400, marginLeft: 8 }}>· {r.orderCode}</span></div>)}</div>}</div></Field><div className="col-4" style={{ display: "flex", alignItems: "end" }}><Button type="submit" size="lg"><QrCode size={16}/> Look up roll</Button></div></form><div className="permission-note" style={{ marginTop: 12 }}>Only roll codes already present in this local demo registry resolve to a staff view. Buyer-safe token lookup requires the verified backend API and RLS.</div>{error && <p role="alert" className="field__error">{error}</p>}</Card>}
    {scanOnly && <div className="filter-row" role="group" aria-label="Filter roll registry">{["ALL","ACCEPTED","AWAITING_INSPECTION","REWORK_REQUIRED","QUARANTINED","DISPATCHED"].map((item) => <button key={item} className={`filter-chip${status === item ? " filter-chip--active" : ""}`} onClick={() => setStatus(item)}>{item.replaceAll("_"," ")}</button>)}<label className="search-box" style={{ width: 220, marginLeft: "auto" }}><Search size={14}/><input aria-label="Search roll codes" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roll / order…"/></label></div>}
    <Card title={scanOnly ? "Recent rolls" : "Roll register"} action={<Tag>{rolls.length} in view</Tag>}><DataTable headers={["Roll", "Order / buyer", "Quantity", "Dye lot", "Machine", "State", "Prior failure", "Passport"]} rows={rolls.map((roll) => [<Link className="cell-primary code" href={`/quality/rolls/${roll.code}`}>{roll.code}</Link>, <div><Link href={`/quality/orders/${encodeURIComponent(roll.orderCode)}`} className="cell-primary">{roll.orderCode}</Link><span className="cell-secondary">{roll.buyer}</span></div>, formatQty(roll.qty,roll.unit,1), roll.dyeLot, roll.machineCode, <StatusBadge status={roll.status}/>, roll.priorFailure ? <StatusBadge status="REWORK_REQUIRED" label="History retained"/> : "—", <Link href={`/quality/rolls/${roll.code}`} className="btn btn--secondary btn--sm">View <ArrowRight size={12}/></Link>])} empty={<EmptyState title="No roll matches this lookup" detail="Try a known demo code or clear the filters."/>}/></Card></>;
}

function RollPassportPage({ code }: { code: string }) {
  const { data } = useDemo();
  const roll = data.rolls.find((candidate) => candidate.code === code || candidate.id === code);
  if (!roll) return <><PageHeader title="Roll not found"/><EmptyState title="No passport available" detail="This QR/code is not in the seeded demo registry." action={<LinkButton href="/quality/scan">Search again</LinkButton>}/></>;
  const shipment = data.shipments.find((candidate) => candidate.rollIds?.includes(roll.id) && candidate.status === "DISPATCHED");
  const related = data.rolls.filter((candidate) => candidate.orderCode === roll.orderCode);
  const order = data.orders.find((candidate) => candidate.code === roll.orderCode);
  const inspectionEvents = data.inspectionEvents.filter((event) => event.rollId === roll.id);
  const reworkEvents = data.reworkEvents.filter((event) => event.rollId === roll.id);
  const outputEvents = data.outputEvents.filter((event) => event.rollCodes?.includes(roll.code));
  const dispatchEvents = data.dispatchEvents.filter((event) => event.rollIds.includes(roll.id));
  const traceEvents = [
    ...outputEvents.map((event) => ({ when: event.recordedAt, code: event.code, kind: `Output · ${event.kind}`, detail: `${formatQty(event.quantity,event.unit,1)} · ${event.operationCode}`, actor: event.actor })),
    ...inspectionEvents.map((event) => ({ when: event.recordedAt, code: event.code, kind: `Inspection · ${event.result}`, detail: [event.defect, event.reason, event.location].filter(Boolean).join(" · "), actor: event.actor })),
    ...reworkEvents.map((event) => ({ when: event.recordedAt, code: event.code, kind: `Rework · ${event.action}`, detail: event.reason, actor: event.actor })),
    ...dispatchEvents.map((event) => ({ when: event.recordedAt, code: event.code, kind: `Dispatch · ${event.action}`, detail: `${event.shipmentCode} · ${formatQty(event.quantity,event.unit,1)}`, actor: event.actor })),
  ].sort((left, right) => left.when.localeCompare(right.when));
  return <><PageHeader eyebrow="Thread passport · staff view" title={roll.code} description={`${roll.orderCode} · ${roll.buyer} · ${formatQty(roll.qty,roll.unit,0)} · ${roll.colour}`} actions={<><LinkButton href="/quality/rolls" variant="secondary"><ArrowLeft size={14}/> Rolls</LinkButton><LinkButton href={`/quality/inspect/${roll.code}`} variant="primary">Inspection record <ArrowRight size={14}/></LinkButton></>} meta={<><StatusBadge status={roll.status}/>{roll.priorFailure && <StatusBadge status="REWORK_REQUIRED" label="Prior failure in trace"/>}</>} />
    <div className="two-pane"><div className="stack"><Card title="Traceability thread"><Thread stages={[{key:"record",label:"Seeded roll record",state:"done",meta:`${roll.dyeLot} · ${roll.machineCode}`},{key:"inspection",label:"Linked inspection event",state:inspectionEvents.length ? "done" : roll.status === "AWAITING_INSPECTION" ? "current" : "todo",meta:inspectionEvents.length ? `${inspectionEvents.length} recorded` : "not linked in seed"},{key:"dispatch",label:"Linked dispatch event",state:dispatchEvents.some((event) => event.action === "CONFIRMED") ? "done" : "todo",meta:shipment?.code ?? "not linked"}]}/>{roll.priorFailure && <InfoStrip tone="warning" title="Original failure stays on this passport.">Rework or re-inspection never removes the prior defect. Show before/after evidence and the follow-up inspection when connected to the source system.</InfoStrip>}</Card><Card title="Linked append-only demo events"><DataTable headers={["Event", "Reference", "Detail", "When · actor"]} rows={traceEvents.map((event) => [event.kind, <span className="code">{event.code}</span>, event.detail || "No additional detail", <span>{formatDateTime(event.when)}<span className="cell-secondary">{event.actor}</span></span>])} empty={<EmptyState title="No linked action events" detail="This seeded roll has no linked output, inspection, rework, or dispatch event yet. The full yarn genealogy is not available in the supplied frontend data."/>}/><InfoStrip tone="info">Only events explicitly linked to this roll are shown; this is not a complete source-of-record genealogy.</InfoStrip></Card><Card title="Origin snapshot · seeded fields"><DataTable headers={["Field", "Current value"]} rows={[["Dye lot",roll.dyeLot],["Colour / shade",roll.colour],["Machine",roll.machineCode],["Created timestamp",formatDateTime(roll.createdAt)],["Order",<Link href={`/quality/orders/${encodeURIComponent(roll.orderCode)}`}>{roll.orderCode}</Link>]]}/></Card><Card title="Other rolls on order"><div className="filter-row">{related.slice(0,8).map((item) => <Link key={item.id} href={`/quality/rolls/${item.code}`} className={`filter-chip${item.id===roll.id?" filter-chip--active":""}`}>{item.code}</Link>)}</div><Link href={`/quality/orders/${encodeURIComponent(roll.orderCode)}`} className="btn btn--quiet btn--sm">Order command page <ArrowRight size={12}/></Link></Card></div><aside className="stack sticky-summary"><Card title="Passport summary"><DataTable headers={["Attribute", "Recorded"]} rows={[["Buyer",roll.buyer],["Order",<Link href={`/quality/orders/${encodeURIComponent(roll.orderCode)}`}>{roll.orderCode}</Link>],["Product / shade",order?.product ?? "Not provided"],["Quantity",formatQty(roll.qty,roll.unit,1)],["Dye lot",roll.dyeLot],["Machine",roll.machineCode],["Location",roll.location],["State",<StatusBadge status={roll.status}/>],["Defect",roll.defect ?? "No defect recorded"],["Prior failure",roll.priorFailure ? "Yes · visible" : "None recorded"]]}/></Card><InfoStrip tone="info">Roll passport is a staff route. Public QR lookups must be token-scoped and must not reveal internal cost, employee, or supplier-sensitive data.</InfoStrip></aside></div></>;
}
