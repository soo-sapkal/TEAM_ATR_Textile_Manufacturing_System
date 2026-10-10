"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, ClipboardCheck, QrCode, ScanLine, Search } from "lucide-react";
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
  if (path === "/rolls" || path === "/scan") return <RollRegistryPage scanOnly={path === "/scan"}/>;
  if (path.startsWith("/rolls/")) return <RollPassportPage code={id ?? ""}/>;
  return <QualityQueuePage/>;
}

function QualityQueuePage() {
  const { data, user } = useDemo();
  const [filter, setFilter] = useState("WAITING");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => data.rolls.filter((roll) => {
    const need = `${roll.code} ${roll.orderCode} ${roll.buyer} ${roll.colour}`.toLowerCase().includes(search.toLowerCase());
    if (filter === "ALL") return need;
    if (filter === "WAITING") return need && ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED"].includes(roll.status);
    if (filter === "REWORK") return need && ["REWORK_REQUIRED", "REWORK_IN_PROGRESS"].includes(roll.status);
    if (filter === "HOLD") return need && ["QUARANTINED", "REJECTED"].includes(roll.status);
    return need && roll.status === filter;
  }), [data.rolls, filter, search]);
  const waiting = data.rolls.filter((roll) => ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED"].includes(roll.status)).length;
  return <><PageHeader eyebrow="Quality desk · inspection queue" title="Every roll needs a disposition." description="Capture defect type, severity, outcome, and evidence. A failed roll stays flagged after rework; accepted rolls alone can reach dispatch." actions={<><LinkButton href="/scan" variant="secondary"><ScanLine size={14}/> Scan / find roll</LinkButton><LinkButton href="/quality/defects" variant="quiet">Defect trends <ArrowRight size={12}/></LinkButton></>} meta={<><Tag>{waiting} WAITING</Tag><Tag>{data.rolls.filter((roll) => roll.priorFailure).length} PRIOR FAILURE</Tag><Tag>30 SEEDED ROLLS</Tag></>} /><div className="stat-grid"><StatCardView label="Awaiting inspection" value={waiting} tone="turmeric"/><StatCardView label="Rework required" value={data.rolls.filter((roll) => roll.status === "REWORK_REQUIRED").length} tone="madder"/><StatCardView label="Accepted" value={data.rolls.filter((roll) => roll.status === "ACCEPTED").length} tone="neem"/><StatCardView label="Quarantined / rejected" value={data.rolls.filter((roll) => ["QUARANTINED","REJECTED"].includes(roll.status)).length} tone="indigo"/></div>
    <div className="filter-row" role="group" aria-label="Filter quality queue">{["WAITING","REWORK","HOLD","ACCEPTED","ALL"].map((value) => <button className={`filter-chip${filter === value ? " filter-chip--active" : ""}`} key={value} onClick={() => setFilter(value)}>{value.replaceAll("_"," ")}</button>)}<label className="search-box" style={{ width: 225, marginLeft: "auto" }}><Search size={14}/><input aria-label="Search rolls" placeholder="Roll, order, buyer…" value={search} onChange={(event) => setSearch(event.target.value)}/></label></div>
    <Card title="Roll inspection work" action={<Tag>{filtered.length} rows</Tag>}><DataTable headers={["Roll / order", "Buyer · colour", "Qty", "Created", "Current state", "Failure history", "Next action"]} rows={filtered.map((roll) => [<div><Link href={`/rolls/${roll.code}`} className="cell-primary code">{roll.code}</Link><span className="cell-secondary">{roll.orderCode}</span></div>, <div>{roll.buyer}<span className="cell-secondary">{roll.colour} · {roll.dyeLot}</span></div>, formatQty(roll.qty,roll.unit,0), formatDateTime(roll.createdAt), <StatusBadge status={roll.status}/>, roll.priorFailure ? <StatusBadge status="REWORK_REQUIRED" label="Prior failure"/> : <span className="cell-secondary">First pass</span>, ["AWAITING_INSPECTION","REINSPECTION_REQUIRED","REWORK_IN_PROGRESS"].includes(roll.status) ? hasPermission(user, "quality.inspect") ? <Link href={`/quality/inspect/${encodeURIComponent(roll.code)}`} className="btn btn--primary btn--sm">Inspect <ArrowRight size={12}/></Link> : <span className="field__hint">quality.inspect required</span> : <Link href={`/rolls/${roll.code}`} className="btn btn--secondary btn--sm">Passport <ArrowRight size={12}/></Link>])}/></Card>
    <InfoStrip tone="warning" title="Disposition is a state change.">Pass records accepted status and finished-goods location. Rework/reject require defects. Reject or quarantine require reason. Evidence uploads persist only when connected to the real storage service.</InfoStrip>
  </>;
}

function StatCardView({ label, value, tone }: { label: string; value: number; tone: "cotton" | "turmeric" | "madder" | "neem" | "indigo" }) { return <div className={`stat-card stat-card--${tone}`}><div className="stat-card__top">{label}</div><strong>{value}</strong><div className="stat-card__bottom">rolls in demo set</div></div>; }

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
    const response = await act("inspect-roll", { rollId, result, defect, reason, location, evidenceCount, commandKey: `inspection-${rollId}-${inspectionRevision}` });
    setBusy(false);
    if (response.ok) {
      setInspectionRevision((current) => current + 1);
      const next = data.rolls.find((candidate) => candidate.id !== rollId && ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED"].includes(candidate.status));
      router.push(next ? `/quality/inspect/${encodeURIComponent(next.code)}` : "/quality");
    }
  }
  return <><PageHeader eyebrow="Quality · disposition record" title={`Inspect ${roll.code}`} description={`${roll.orderCode} · ${roll.buyer} · ${formatQty(roll.qty, roll.unit, 0)} · ${roll.colour}`} actions={<LinkButton href="/quality" variant="secondary"><ArrowLeft size={14}/> Queue</LinkButton>} meta={<><StatusBadge status={roll.status}/>{roll.priorFailure && <StatusBadge status="REWORK_REQUIRED" label="Prior failure"/>}</>} />
    {!eligible && <InfoStrip tone="danger" title="This roll is not in an inspectable state.">State is {roll.status}. Only awaiting inspection, reinspection, or a completed rework can be inspected again.</InfoStrip>}
    {!canInspect && <InfoStrip tone="warning" title="Inspection is read-only.">Recording a disposition requires quality.inspect. Existing passport and inspection history remain available.</InfoStrip>}
    <div className="two-pane"><form className="card stack" onSubmit={submit}><div className="card__head"><h2>Inspection result</h2><Tag>Append-only event</Tag></div><Field label="Disposition"><SelectInput value={result} onChange={(event) => setResult(event.target.value as typeof result)} disabled={!eligible}><option value="PASS">Pass · accept for finished stock</option><option value="REWORK">Rework · return to production</option><option value="REJECT">Reject · record loss</option><option value="QUARANTINE">Quarantine · block movement</option></SelectInput></Field>{["REWORK","REJECT"].includes(result) && <Field label="Defect type · required"><SelectInput value={defect} onChange={(event) => setDefect(event.target.value)} required><option value="">Choose defect…</option><option value="HOLE">Hole / tear</option><option value="COLOUR_VARIANCE">Colour variance</option><option value="UNEVEN_WEAVE">Uneven weave</option><option value="STAINS">Stains / marks</option><option value="WIDTH_VARIANCE">Width variance</option></SelectInput></Field>}{["REJECT","QUARANTINE"].includes(result) && <Field label="Reason · 5+ characters required"><TextArea value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} required placeholder="Describe the nonconformance and disposition…"/></Field>}{result === "PASS" && <Field label="Finished-goods location · required"><SelectInput value={location} onChange={(event) => setLocation(event.target.value)} required><option value="WH-FG-A1">WH-FG-A1 · Indigo lane</option><option value="WH-FG-B2">WH-FG-B2 · Natural lane</option><option value="WH-FG-C1">WH-FG-C1 · Ready to dispatch</option></SelectInput></Field>}{result === "REWORK" && <InfoStrip tone="warning">Select the defect. Rework preserves the original failure and triggers re-inspection; it does not set the roll to ACCEPTED.</InfoStrip>}
      <Field label="Inspection notes"><TextArea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Point location, width, shade, defect count, and corrective action…"/></Field>
      <EvidencePicker label="Quality evidence" onChange={(file) => setEvidenceCount(file ? 1 : 0)}/>{evidenceCount > 0 && <div className="permission-note">Selected evidence is available only for local preview; no evidence key or upload was created.</div>}
      <div className="form-actions"><span className="field__hint">Inspector · {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span><Button type="submit" disabled={busy || !eligible || !canInspect || !parse.success} size="lg"><ClipboardCheck size={17}/>{busy ? "Saving…" : "Record disposition · demo"}</Button></div></form>
      <aside className="stack sticky-summary"><Card title="Roll passport thread"><Thread orientation="vertical" stages={[{key:"yarn",label:"Yarn genealogy",state:"done",meta:`${roll.dyeLot} · ${roll.colour}`},{key:"production",label:"Production",state:"done",meta:`${roll.machineCode} · ${roll.createdAt.slice(0,10)}`},{key:"inspection",label:"Inspection",state:roll.priorFailure ? "blocked" : "current",meta:roll.priorFailure ? "Prior failure retained" : "Decision needed"},{key:"finished-stock",label:"Finished stock",state:"todo",meta:"Only after ACCEPTED"},{key:"dispatch",label:"Dispatch",state:"todo",meta:"Accepted rolls only"}]}/></Card><Card title="Current trace"><DataTable headers={["Field", "Value"]} rows={[["Roll", roll.code],["Order", <Link href={`/orders/${encodeURIComponent(roll.orderCode)}`}>{roll.orderCode}</Link>],["Dye lot", roll.dyeLot],["Machine", roll.machineCode],["Location", roll.location],["Prior failure", roll.priorFailure ? "Yes · retained" : "No"],["Current qty", formatQty(roll.qty,roll.unit,1)]]}/></Card></aside></div>
  </>;
}

function ReworkPage() {
  const { data, act, user } = useDemo();
  const rows = data.rolls.filter((roll) => ["REWORK_REQUIRED","REWORK_IN_PROGRESS"].includes(roll.status));
  const [reasonById, setReasonById] = useState<Record<string,string>>({});
  const [revisionById, setRevisionById] = useState<Record<string,number>>({});
  const canRework = hasPermission(user, "quality.rework");
  async function runRework(rollId: string, action: "start-rework" | "complete-rework", reason: string) {
    const revision = revisionById[rollId] ?? 1;
    const response = await act(action, { rollId, reason, commandKey: `${action}-${rollId}-${revision}` });
    if (response.ok) setRevisionById((current) => ({ ...current, [rollId]: revision + 1 }));
  }
  return <><PageHeader eyebrow="Corrective work · preserve failure history" title="Rework" description="A rework order is not a clean pass. Track original defect, repair evidence, and the re-inspection that follows." actions={<LinkButton href="/quality" variant="secondary"><ArrowLeft size={14}/> Quality queue</LinkButton>} /><Card title="Rework orders" action={<Tag>{rows.length} open</Tag>}><DataTable headers={["Roll", "Order", "Defect", "State", "Original failure", "Action"]} rows={rows.map((roll) => [<Link className="code" href={`/rolls/${roll.code}`}>{roll.code}</Link>, roll.orderCode, roll.defect ?? "Defect required", <StatusBadge status={roll.status}/>, <span className="cell-secondary">Retained in passport</span>, <div className="stack-sm"><TextInput aria-label={`Rework note for ${roll.code}`} placeholder={roll.status === "REWORK_REQUIRED" ? "Work instruction · 5+ chars" : "Repair close-out · 5+ chars"} value={reasonById[roll.id] ?? ""} onChange={(event) => setReasonById((map) => ({ ...map, [roll.id]: event.target.value }))}/><Button size="sm" disabled={!canRework || (reasonById[roll.id] ?? "").trim().length < 5} onClick={() => { const reason = reasonById[roll.id] ?? ""; void runRework(roll.id, roll.status === "REWORK_REQUIRED" ? "start-rework" : "complete-rework", reason); }}>{canRework ? (roll.status === "REWORK_REQUIRED" ? "Start rework" : "Send to re-inspection") : "quality.rework required"}</Button></div>])} empty={<EmptyState title="No open rework" detail="Rework and failure history remain visible on the roll passport."/>}/></Card><InfoStrip tone="warning">A roll returns to inspection after the repair operation. The original failure must remain part of every downstream passport view.</InfoStrip></>;
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

function RollRegistryPage({ scanOnly }: { scanOnly: boolean }) {
  const { data } = useDemo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [error, setError] = useState("");
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
    if (roll) router.push(`/rolls/${encodeURIComponent(roll.code)}`);
    else setError("No matching roll code in this demo set. Public signed tokens require a connected backend.");
  }
  function lookup(event: FormEvent) { event.preventDefault(); lookupCode(query); }
  return <><PageHeader eyebrow={scanOnly ? "Traceability · scan lookup" : "Traceability · roll register"} title={scanOnly ? "Find a roll" : "Rolls"} description="Lookup accepts a staff roll code or QR containing an authorized roll code. Public signed tokens are never resolved into a staff passport in demo mode." actions={<><LinkButton href="/quality" variant="secondary"><ArrowLeft size={14}/> Quality</LinkButton>{!scanOnly && <LinkButton href="/scan" variant="primary"><ScanLine size={14}/> Scan / lookup</LinkButton>}</>} />
    {scanOnly && <Card title="Camera scan (optional)"><CameraScanner onCode={(value) => { setQuery(value); setError(""); lookupCode(value); }}/><div className="permission-note">Camera is opt-in and used only to read local QR content. The printed demo roll tag has no QR; the live system must supply a signed opaque token to enable public scans.</div></Card>}
    {scanOnly && <Card title="Manual roll-code lookup"><form className="form-grid" onSubmit={lookup}><Field label="Roll code or scanned QR content" className="col-8"><TextInput autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setError(""); }} placeholder="ROLL-2026-0111" list="roll-code-list"/><datalist id="roll-code-list">{data.rolls.map((r) => <option key={r.code} value={r.code} />)}</datalist></Field><div className="col-4" style={{ display: "flex", alignItems: "end" }}><Button type="submit" size="lg"><QrCode size={16}/> Look up roll</Button></div></form><div className="permission-note" style={{ marginTop: 12 }}>Only roll codes already present in this local demo registry resolve to a staff view. Buyer-safe token lookup requires the verified backend API and RLS.</div>{error && <p role="alert" className="field__error">{error}</p>}</Card>}
    {!scanOnly && <div className="filter-row" role="group" aria-label="Filter roll registry">{["ALL","ACCEPTED","AWAITING_INSPECTION","REWORK_REQUIRED","QUARANTINED","DISPATCHED"].map((item) => <button key={item} className={`filter-chip${status === item ? " filter-chip--active" : ""}`} onClick={() => setStatus(item)}>{item.replaceAll("_"," ")}</button>)}<label className="search-box" style={{ width: 220, marginLeft: "auto" }}><Search size={14}/><input aria-label="Search roll codes" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roll / order…"/></label></div>}
    <Card title={scanOnly ? "Recent rolls" : "Roll register"} action={<Tag>{rolls.length} in view</Tag>}><DataTable headers={["Roll", "Order / buyer", "Quantity", "Dye lot", "Machine", "State", "Prior failure", "Passport"]} rows={rolls.map((roll) => [<Link className="cell-primary code" href={`/rolls/${roll.code}`}>{roll.code}</Link>, <div><Link href={`/orders/${encodeURIComponent(roll.orderCode)}`} className="cell-primary">{roll.orderCode}</Link><span className="cell-secondary">{roll.buyer}</span></div>, formatQty(roll.qty,roll.unit,1), roll.dyeLot, roll.machineCode, <StatusBadge status={roll.status}/>, roll.priorFailure ? <StatusBadge status="REWORK_REQUIRED" label="History retained"/> : "—", <Link href={`/rolls/${roll.code}`} className="btn btn--secondary btn--sm">View <ArrowRight size={12}/></Link>])} empty={<EmptyState title="No roll matches this lookup" detail="Try a known demo code or clear the filters."/>}/></Card></>;
}

function RollPassportPage({ code }: { code: string }) {
  const { data } = useDemo();
  const roll = data.rolls.find((candidate) => candidate.code === code || candidate.id === code);
  if (!roll) return <><PageHeader title="Roll not found"/><EmptyState title="No passport available" detail="This QR/code is not in the seeded demo registry." action={<LinkButton href="/scan">Search again</LinkButton>}/></>;
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
  return <><PageHeader eyebrow="Thread passport · staff view" title={roll.code} description={`${roll.orderCode} · ${roll.buyer} · ${formatQty(roll.qty,roll.unit,0)} · ${roll.colour}`} actions={<><LinkButton href="/rolls" variant="secondary"><ArrowLeft size={14}/> Rolls</LinkButton><LinkButton href={`/quality/inspect/${roll.code}`} variant="primary">Inspection record <ArrowRight size={14}/></LinkButton></>} meta={<><StatusBadge status={roll.status}/>{roll.priorFailure && <StatusBadge status="REWORK_REQUIRED" label="Prior failure in trace"/>}</>} />
    <div className="two-pane"><div className="stack"><Card title="Traceability thread"><Thread stages={[{key:"record",label:"Seeded roll record",state:"done",meta:`${roll.dyeLot} · ${roll.machineCode}`},{key:"inspection",label:"Linked inspection event",state:inspectionEvents.length ? "done" : roll.status === "AWAITING_INSPECTION" ? "current" : "todo",meta:inspectionEvents.length ? `${inspectionEvents.length} recorded` : "not linked in seed"},{key:"dispatch",label:"Linked dispatch event",state:dispatchEvents.some((event) => event.action === "CONFIRMED") ? "done" : "todo",meta:shipment?.code ?? "not linked"}]}/>{roll.priorFailure && <InfoStrip tone="warning" title="Original failure stays on this passport.">Rework or re-inspection never removes the prior defect. Show before/after evidence and the follow-up inspection when connected to the source system.</InfoStrip>}</Card><Card title="Linked append-only demo events"><DataTable headers={["Event", "Reference", "Detail", "When · actor"]} rows={traceEvents.map((event) => [event.kind, <span className="code">{event.code}</span>, event.detail || "No additional detail", <span>{formatDateTime(event.when)}<span className="cell-secondary">{event.actor}</span></span>])} empty={<EmptyState title="No linked action events" detail="This seeded roll has no linked output, inspection, rework, or dispatch event yet. The full yarn genealogy is not available in the supplied frontend data."/>}/><InfoStrip tone="info">Only events explicitly linked to this roll are shown; this is not a complete source-of-record genealogy.</InfoStrip></Card><Card title="Origin snapshot · seeded fields"><DataTable headers={["Field", "Current value"]} rows={[["Dye lot",roll.dyeLot],["Colour / shade",roll.colour],["Machine",roll.machineCode],["Created timestamp",formatDateTime(roll.createdAt)],["Order",<Link href={`/orders/${encodeURIComponent(roll.orderCode)}`}>{roll.orderCode}</Link>]]}/></Card><Card title="Other rolls on order"><div className="filter-row">{related.slice(0,8).map((item) => <Link key={item.id} href={`/rolls/${item.code}`} className={`filter-chip${item.id===roll.id?" filter-chip--active":""}`}>{item.code}</Link>)}</div><Link href={`/orders/${encodeURIComponent(roll.orderCode)}`} className="btn btn--quiet btn--sm">Order command page <ArrowRight size={12}/></Link></Card></div><aside className="stack sticky-summary"><Card title="Passport summary"><DataTable headers={["Attribute", "Recorded"]} rows={[["Buyer",roll.buyer],["Order",<Link href={`/orders/${encodeURIComponent(roll.orderCode)}`}>{roll.orderCode}</Link>],["Product / shade",order?.product ?? "Not provided"],["Quantity",formatQty(roll.qty,roll.unit,1)],["Dye lot",roll.dyeLot],["Machine",roll.machineCode],["Location",roll.location],["State",<StatusBadge status={roll.status}/>],["Defect",roll.defect ?? "No defect recorded"],["Prior failure",roll.priorFailure ? "Yes · visible" : "None recorded"]]}/></Card><InfoStrip tone="info">Roll passport is a staff route. Public QR lookups must be token-scoped and must not reveal internal cost, employee, or supplier-sensitive data.</InfoStrip></aside></div></>;
}
