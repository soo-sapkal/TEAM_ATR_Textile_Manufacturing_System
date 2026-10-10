"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { RoleLink as Link } from "@/components/ui/primitives";
import { useState, useEffect, type FormEvent } from "react";
import { Activity, ArrowLeft, ArrowRight, Check, Factory, FileClock, Pause, Play, ShieldAlert, Wrench, X } from "lucide-react";
import Decimal from "decimal.js";
import { useDemo } from "@/lib/demo/context";
import { hasPermission, DEMO_USERS } from "@/lib/auth/permissions";
import { formatDate, formatDateTime, formatMoney, formatQty } from "@/lib/domain/format";
import { outputEntrySchema } from "@/lib/domain/schemas";
import type { Operation, Stage } from "@/lib/domain/types";
import { Button, Card, DataTable, EmptyState, Field, InfoStrip, Kicker, LinkButton, Meter, PageHeader, SelectInput, StatCard, StatusBadge, Tag, TextArea, TextInput } from "@/components/ui/primitives";

const stageOrder: Stage[] = ["SPINNING", "WEAVING", "DYEING"];
export function ProductionRoute({ path, id }: { path: string; id?: string }) {
  if (path === "/my-work") return <MyWorkPage/>;
  if (path.startsWith("/production/operations/")) return <OperationConsole id={id ?? ""}/>;
  if (path.startsWith("/production/plans/")) return <PlanPage id={id ?? ""}/>;
  if (path === "/production/shift-summary") return <ShiftSummaryPage/>;
  return <ProductionBoard/>;
}

function ProductionBoard() {
  const { data } = useDemo();
  const [stageFilter, setStageFilter] = useState("ALL");
  const [view, setView] = useState<"BOARD" | "LIST">("BOARD");
  const running = data.operations.filter((operation) => operation.status === "IN_PROGRESS").length;
  const paused = data.operations.filter((operation) => operation.status === "PAUSED").length;
  const noMachine = data.operations.filter((operation) => operation.status === "PLANNED" && !operation.machineCode).length;
  const visibleOperations = data.operations.filter((operation) => stageFilter === "ALL" || stageFilter === operation.stage);
  const [selectedOrderCode, setSelectedOrderCode] = useState<string | null>(null);
  return <>
    {selectedOrderCode && <OrderModal orderCode={selectedOrderCode} onClose={() => setSelectedOrderCode(null)} />}
    <PageHeader eyebrow="Make & move · shop floor" title="Production board" description="Plans progress through spinning, weaving, and dyeing. Operations are tied to a machine, shift, operator, and exact unit." actions={<><LinkButton href="/production/shift-summary" variant="secondary"><FileClock size={14}/> Shift summary</LinkButton><LinkButton href="/orders" variant="primary">Order plans <ArrowRight size={14}/></LinkButton></>} meta={<><Tag>12 MACHINES</Tag><Tag>{running} RUNNING OPS</Tag><Tag>{paused} PAUSED</Tag></>} />
    <div className="filter-row production-view-tabs" role="group" aria-label="Production view"><button type="button" className={`filter-chip${view === "BOARD" ? " filter-chip--active" : ""}`} aria-pressed={view === "BOARD"} onClick={() => setView("BOARD")}>Board</button><button type="button" className={`filter-chip${view === "LIST" ? " filter-chip--active" : ""}`} aria-pressed={view === "LIST"} onClick={() => setView("LIST")}>List</button><button type="button" className="filter-chip" disabled aria-describedby="production-gantt-help">Gantt · schedule required</button></div>
    <div className="stat-grid"><div className="stat-card stat-card--indigo"><div className="stat-card__top">Operations in motion</div><strong>{running}</strong><div className="stat-card__bottom">machine + active shift assigned</div></div><div className="stat-card stat-card--turmeric"><div className="stat-card__top">Paused / blocked</div><strong>{paused + data.machines.filter((machine) => machine.status === "BREAKDOWN").length}</strong><div className="stat-card__bottom">requires a reason or recovery</div></div><div className="stat-card stat-card--neem"><div className="stat-card__top">Completed this shift</div><strong>{data.operations.filter((operation) => operation.status === "COMPLETED").length}</strong><div className="stat-card__bottom">from seeded examples</div></div><div className="stat-card stat-card--cotton"><div className="stat-card__top">Needs machine</div><strong>{noMachine}</strong><div className="stat-card__bottom">stage-eligible assignment required</div></div></div>
    <div className="filter-row" role="group" aria-label="Filter production board">{["ALL", "SPINNING", "WEAVING", "DYEING"].map((filter) => <button key={filter} className={`filter-chip${stageFilter === filter ? " filter-chip--active" : ""}`} onClick={() => setStageFilter(filter)}>{filter.replaceAll("_", " ")}</button>)}<span className="field__hint">A machine must match the operation&apos;s stage; running machines cannot be double-assigned.</span></div>
    {view === "BOARD" && <div className="page-grid">{stageOrder.filter((stage) => stageFilter === "ALL" || stageFilter === stage).map((stage) => { const ops = data.operations.filter((operation) => operation.stage === stage && operation.status !== "CANCELLED"); const live = ops.filter((operation) => operation.status === "IN_PROGRESS").length; return <Card className="col-4" key={stage} title={stage} action={<Tag>{live} live</Tag>}><div className="stack-sm">{ops.map((operation) => <OperationCard key={operation.id} operation={operation} onOrderClick={(code) => setSelectedOrderCode(code)} />)}</div>{!ops.length && <EmptyState title="No operations in this lane" detail="Release a plan to create stage operations."/>}</Card>; })}</div>}
    {view === "LIST" && <Card className="card--table" title="Operation list" action={<Tag>{visibleOperations.length} shown</Tag>}><DataTable headers={["Operation", "Order / due", "Stage", "Machine / shift", "Good / target", "State", ""]} rows={visibleOperations.map((operation) => { const order = data.orders.find((candidate) => candidate.code === operation.orderCode); return [<Link className="cell-primary code" href={`/production/operations/${operation.id}`}>{operation.code}</Link>, <div><button className="cell-primary link-button" style={{ background: "none", border: "none", padding: 0, textDecoration: "underline", cursor: "pointer", color: "inherit", font: "inherit" }} onClick={() => setSelectedOrderCode(operation.orderCode)}>{operation.orderCode}</button><span className="cell-secondary">{order ? formatDate(order.due) : "Due date unavailable"}</span></div>, operation.stage, <div>{operation.machineCode ?? "Unassigned"}<span className="cell-secondary">{operation.shift ?? "No shift"}</span></div>, <div><span className="num">{formatQty(operation.good, operation.unit, 1)} / {formatQty(operation.target, operation.unit, 1)}</span><Meter value={operation.good} total={operation.target} label={`${operation.code} progress`} showNumbers={false}/></div>, <StatusBadge status={operation.status}/>, <Link className="btn btn--secondary btn--sm" href={`/production/operations/${operation.id}`}>Console <ArrowRight size={12}/></Link>]; })} empty={<EmptyState title="No operations in this filter" detail="Choose another stage or inspect the board."/>}/></Card>}
    <p className="field__hint" id="production-gantt-help">Calendar Gantt is unavailable in this demo: the supplied analysis does not define operation start/end timestamps. The view is intentionally not fabricated.</p>
    <div className="page-grid" style={{ marginTop: 16 }}><Card className="col-6" title="Machine alerts" action={<Link href="/machines" className="btn btn--quiet btn--sm">Machine board <ArrowRight size={12}/></Link>}>{data.machines.filter((machine) => ["BREAKDOWN", "MAINTENANCE"].includes(machine.status)).map((machine) => <div key={machine.id} className="info-strip info-strip--danger"><Wrench size={16}/><div><Link href={`/machines/${machine.id}`}><strong>{machine.code} · {machine.status}</strong></Link><div>{machine.downtimeMinutes} minutes logged · {machine.orderCode ?? "No active order"}</div></div></div>)}</Card><Card className="col-6" title="Planning guardrails"><InfoStrip tone="warning">Material shortage blocks release. Reservations are batch-aware; a machine assignment must match its process stage and shift availability.</InfoStrip><InfoStrip>Operator can start, pause, record output/waste/reject, downtime and completion—but cannot edit or delete an earlier output.</InfoStrip></Card></div>
  </>;
}

function OperationCard({ operation, onOrderClick }: { operation: Operation; onOrderClick?: (code: string) => void }) {
  const { data, user, act, toast } = useDemo();
  const order = data.orders.find((o) => o.code === operation.orderCode);
  const [selectedMachine, setSelectedMachine] = useState(operation.machineCode ?? "");
  const [selectedShift, setSelectedShift] = useState(operation.shift ?? "");
  const [selectedOperator, setSelectedOperator] = useState(operation.operators[0] ?? "");
  const [commandRevision, setCommandRevision] = useState(1);
  const [assigning, setAssigning] = useState(false);
  const canAssign = hasPermission(user, "production.assign") && ["PLANNED", "PAUSED"].includes(operation.status);
  const eligibleMachines = data.machines.filter((machine) => machine.stage === operation.stage && machine.status === "IDLE" && (!machine.operationId || machine.operationId === operation.id) && !data.operations.some((other) => other.id !== operation.id && other.machineCode === machine.code && ["PLANNED", "IN_PROGRESS", "PAUSED"].includes(other.status)));
  const selectedCode = eligibleMachines.some((machine) => machine.code === selectedMachine) ? selectedMachine : eligibleMachines[0]?.code ?? "";
  const alreadyAssigned = selectedCode === operation.machineCode && selectedShift === (operation.shift ?? "") && selectedOperator === (operation.operators[0] ?? "") && data.machines.some((machine) => machine.code === selectedCode && machine.operationId === operation.id);
  const percent = new Decimal(operation.target).gt(0) ? Decimal.min(100, new Decimal(operation.good).div(operation.target).mul(100)).toNumber() : 0;
  return <article className="stage-card"><div className="stage-card__meta"><span>{operation.code}</span><StatusBadge status={operation.status}/></div><h3>{onOrderClick ? <button style={{ background: "none", border: "none", padding: 0, textDecoration: "underline", cursor: "pointer", color: "inherit", font: "inherit" }} onClick={() => onOrderClick(operation.orderCode)}>{operation.orderCode}</button> : <Link href={`/orders/${encodeURIComponent(operation.orderCode)}`}>{operation.orderCode}</Link>}</h3><div className="stage-card__meta"><span>{operation.machineCode ?? "Unassigned"}</span><span>{operation.shift ?? "Shift not assigned"}</span></div><p className="cell-secondary">{operation.operators.join(" · ") || "Operator not assigned"}</p><Meter value={operation.good} total={operation.target} label="Good output" tone={percent >= 100 ? "neem" : "indigo"}/><div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}><span className="cell-secondary">Waste {formatQty(operation.waste, operation.unit, 1)} · Reject {formatQty(operation.reject, operation.unit, 1)}</span><Link className="btn btn--secondary btn--sm" href={`/production/operations/${operation.id}`}>Open console <ArrowRight size={12}/></Link></div>{canAssign && <div className="operation-assignment" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}><Field label="Assign machine"><SelectInput value={selectedCode} onChange={(event) => setSelectedMachine(event.target.value)} disabled={!eligibleMachines.length || assigning}><option value="">No eligible machine</option>{eligibleMachines.map((machine) => <option key={machine.id} value={machine.code}>{machine.code} · {machine.name}</option>)}</SelectInput></Field><Field label="Assign shift"><SelectInput value={selectedShift} onChange={(event) => setSelectedShift(event.target.value)} disabled={assigning}><option value="">Select shift</option><option value="A · 06:00–14:00">A · 06:00–14:00</option><option value="B · 14:00–22:00">B · 14:00–22:00</option><option value="C · 22:00–06:00">C · 22:00–06:00</option></SelectInput></Field><Field label="Assign operator"><SelectInput value={selectedOperator} onChange={(event) => setSelectedOperator(event.target.value)} disabled={assigning}><option value="">Select operator</option>{DEMO_USERS.filter(u => u.roles.includes("MACHINE_OPERATOR")).map(u => <option key={u.id} value={u.name.split(" (")[0]}>{u.name}</option>)}</SelectInput></Field><Button size="sm" disabled={!selectedCode || !selectedShift || !selectedOperator || assigning || alreadyAssigned} onClick={async () => { setAssigning(true); try { const res = await fetch("/api/production/assign-machine", { method: "POST", body: JSON.stringify({ operationId: operation.id, machineId: selectedCode, shift: selectedShift, operator: selectedOperator, actor: user?.name }) }); const outcome = await res.json(); if (outcome.success) { toast("Machine assigned", "Operation updated.", "success"); setCommandRevision((current) => current + 1); window.location.reload(); } else { toast("Error", outcome.error, "error"); } } catch (err: any) { toast("Error", err.message, "error"); } finally { setAssigning(false); } }}>{assigning ? "Assigning…" : alreadyAssigned ? "Machine assigned" : "Assign machine"}</Button>{!eligibleMachines.length && <span className="field__hint">No unreserved IDLE {operation.stage.toLowerCase()} machine is currently available.</span>}</div>}{!canAssign && ["PLANNED", "PAUSED"].includes(operation.status) && <span className="field__hint">Machine assignment requires production.assign.</span>}
  {order?.materialShortage && operation.stage !== "SPINNING" && <div className="field__hint" style={{ color: "var(--madder)", fontWeight: "bold", marginTop: 8 }}>⚠️ Warning: Upstream material shortage. Assigning this task may stall production.</div>}
  </article>;
}

function MyWorkPage() {
  const { data, user, toast } = useDemo();
  const assignedName = user?.name === "Ravi Kumar" ? "R. Kumar" : user?.name;
  const ops = data.operations.filter((operation) => {
    const skillMatch = user?.name.match(/\((.*) Operator\)/i);
    const skill = skillMatch ? skillMatch[1].toUpperCase() : null;
    return Boolean(assignedName && operation.operators.includes(assignedName)) && (!skill || operation.stage === skill) && !["COMPLETED", "CANCELLED"].includes(operation.status);
  });
  return <><PageHeader eyebrow="Floor view · assigned work" title={`Your work, ${user?.name.split(" ")[0] ?? "operator"}.`} description="Large-touch shift actions. No cost fields, no back-office clutter, and no pretend optimistic save." meta={<><Tag>SHIFT B · 14:00–22:00</Tag><Tag>10 OCT 2026</Tag></>} /><div className="info-strip info-strip--warning"><ShieldAlert size={18}/><div><strong>Floor mode</strong><div>Native scroll and feedback-only motion. This list contains only operations assigned to your demo profile. All updates reset with the session.</div></div></div><div className="page-grid">{ops.map((operation) => { const machine = data.machines.find((candidate) => candidate.code === operation.machineCode); return <Card className="col-6" key={operation.id} title={operation.code} action={<StatusBadge status={operation.status}/>}><div className="stage-card__meta"><span>Order {operation.orderCode}</span><span>{operation.stage}</span></div><div style={{ font: "900 26px var(--font-display)", margin: "11px 0" }}>{formatQty(operation.good, operation.unit, 1)} <span className="field__hint">good output</span></div><div className="stage-card__meta"><span>{operation.machineCode ?? "Machine unassigned"}</span><span>{operation.shift ?? "No shift"}</span></div><Meter value={operation.good} total={operation.target} label="Shift target"/><div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}><LinkButton href={`/production/operations/${operation.id}`} variant="primary" size="lg"><Activity size={17}/> Open operation</LinkButton>{machine && <LinkButton href={`/machines/${machine.id}`} variant="secondary" size="lg"><Wrench size={17}/> Machine</LinkButton>}{machine && <Button variant="quiet" size="lg" onClick={() => toast("Breakdown Reported", `Supervisor alerted for ${machine.code} breakdown.`, "error")} style={{ color: "var(--madder)", border: "2px solid var(--madder)", background: "#fff" }}><ShieldAlert size={17} /> Report Breakdown</Button>}</div></Card>; })}{ops.length === 0 && <div className="col-12"><EmptyState title="No operation is assigned to this user" detail="The demo list is intentionally not filled with every live operation. A planner or administrator must assign a real shift task before work appears here." action={<LinkButton href="/production" variant="secondary">Open production board</LinkButton>}/></div>}</div></>;
}

function PlanPage({ id }: { id: string }) {
  const { data, user } = useDemo();
  const order = data.orders.find((candidate) => candidate.id === id || candidate.code === id || candidate.code === `ORD-${id}`);
  if (!order) return <><PageHeader title="Plan not found"/><EmptyState title="No plan record" action={<LinkButton href="/production">Production board</LinkButton>}/></>;
  return <><PageHeader eyebrow="Plan readiness" title={`Plan · ${order.code}`} description={`${order.product} · due ${formatDate(order.due)} · ${formatQty(order.ordered, order.unit, 0)}`} actions={<LinkButton href="/production" variant="secondary"><ArrowLeft size={14}/> Production board</LinkButton>} meta={<StatusBadge status={order.status}/>} /><div className="two-pane"><div className="stack"><Card title="Plan stages"><DataTable headers={["Sequence", "Stage", "Machine", "Target", "State"]} rows={data.operations.filter((operation) => operation.orderCode === order.code).map((operation, index) => [String(index + 1).padStart(2,"0"), operation.stage, operation.machineCode ?? "—", formatQty(operation.target,operation.unit,0), <StatusBadge status={operation.status}/>])}/><div className="form-actions">{hasPermission(user, "production.plan") ? <Button disabled title="No plan-release API or verified BOM/reservation transaction is connected."><Play size={15}/> Release unavailable in demo</Button> : <span className="permission-note">Plan release requires production.plan.</span>}<span className="field__hint">{order.materialShortage ? "Release guard: yarn is short. " : order.hasQualityHold ? "Release guard: quality hold is open. " : ""}No plan, batch reservation, or release is recorded from this demo screen; a verified BOM/yield and backend transaction are required.</span></div></Card><Card title="Material and stage eligibility"><InfoStrip tone={order.materialShortage ? "danger" : order.hasQualityHold ? "warning" : "success"} title={order.materialShortage ? "Material shortage" : order.hasQualityHold ? "Quality hold" : "Material ready in this demo"}>{order.materialShortage ? "Do not release this plan. The demo only shows the order's shortage flag; no material reservation is performed." : order.hasQualityHold ? "Resolve the order's quality hold before release. The authoritative backend must re-check this state atomically." : "A real release must show every reserved yarn batch and accepted quantity before the plan begins."}</InfoStrip><div className="permission-note">Order unit: {order.unit}. Yarn unit: KG. A BOM/yield recipe is required to convert stage demand; no conversion is performed in this prototype.</div></Card></div><Card title="Plan actors"><InfoStrip tone="info">Planner assignment and approval are separate permissions. Creator cannot self-approve a request if the authoritative policy requires separation.</InfoStrip><div className="permission-note">Current demo order: {order.code}<br/>Due date: {formatDate(order.due)}<br/>Priority: {order.priority}</div></Card></div></>;
}

function OperationConsole({ id }: { id: string }) {
  const { data, act, toast, user } = useDemo();
  const operation = data.operations.find((candidate) => candidate.id === id || candidate.code === id);
  const [good, setGood] = useState("0.000");
  const [waste, setWaste] = useState("0.000");
  const [reject, setReject] = useState("0.000");
  const [rollQty, setRollQty] = useState("0.000");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [transitionRevision, setTransitionRevision] = useState(1);
  const [outputRevision, setOutputRevision] = useState(1);
  if (!operation) return <><PageHeader title="Operation not found"/><EmptyState title="No operation record" action={<LinkButton href="/production">Production board</LinkButton>}/></>;
  const operationId = operation.id;
  const machine = data.machines.find((candidate) => candidate.code === operation.machineCode);
  const finalStage = operation.stage === "DYEING";
  const nextQty = new Decimal(good || 0).plus(waste || 0).plus(reject || 0);
  const plannedRoom = new Decimal(operation.target).minus(operation.good).minus(operation.waste).minus(operation.reject);
  const rollMatches = !finalStage || new Decimal(rollQty || 0).eq(good || 0);
  const state = operation.status;
  const canOperate = hasPermission(user, "machines.operate");
  const canRecordOutput = hasPermission(user, "production.record_output");
  const [bom, setBom] = useState<any[]>([]);
  const [loadingBom, setLoadingBom] = useState(true);

  useEffect(() => {
    if (!operation) return;
    const relatedOrder = data.orders.find(o => o.code === operation.orderCode);
    if (!relatedOrder) { setLoadingBom(false); return; }
    
    fetch("/api/products")
      .then(r => r.json())
      .then(resData => {
        if (!resData.success) { setLoadingBom(false); return; }
        const matchedProduct = resData.data.find((p: any) => p.name === relatedOrder.product);
        if (!matchedProduct) { setLoadingBom(false); return; }
        
        fetch(`/api/products/${matchedProduct.id}/bom`)
          .then(r => r.json())
          .then(bomData => {
             if (bomData.success) setBom(bomData.data);
             setLoadingBom(false);
          });
      })
      .catch(() => setLoadingBom(false));
  }, [operation, data.orders]);

  async function transition(action: string) {
    if (!canOperate) { toast("Operation action is read-only", "This transition requires machines.operate.", "error"); return; }
    if (["pause", "cancel"].includes(action) && reason.trim().length < 5) { toast("Reason required", "Pause or cancel requires at least five characters.", "error"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/production/operation-transition", {
        method: "POST",
        body: JSON.stringify({ operationId, action, reason, actor: user?.name })
      });
      const outcome = await res.json();
      if (outcome.success) { 
        setTransitionRevision((current) => current + 1); 
        setReason(""); 
        toast("State Updated", `Operation transitioned to ${outcome.status}.`, "success");
        window.location.reload();
      } else {
        toast("Error", outcome.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function record(event: FormEvent) {
    event.preventDefault();
    const parsed = outputEntrySchema.safeParse({ good, waste, reject, remaining: Decimal.max(0, plannedRoom).toFixed(3), finalStage, rollQty });
    if (!canRecordOutput) { toast("Output is read-only", "Recording output requires production.record_output.", "error"); return; }
    if (!parsed.success) { toast("Output needs correction", parsed.error.issues[0]?.message ?? "Check the quantities.", "error"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/production/record-output", {
        method: "POST",
        body: JSON.stringify({ operationId, good, waste, reject, rollQty, actor: user?.name })
      });
      const outcome = await res.json();
      if (outcome.success) { 
        setOutputRevision((current) => current + 1); 
        setGood("0.000"); setWaste("0.000"); setReject("0.000"); setRollQty("0.000"); 
        toast("Output Recorded", "Output events have been saved.", "success");
        window.location.reload();
      } else {
        toast("Error", outcome.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return <>
    <PageHeader eyebrow="Floor operation console" title={operation.code} description={`${operation.orderCode} · ${operation.stage.toLowerCase()} · ${operation.machineCode ?? "Machine not assigned"}`} actions={<LinkButton href="/production" variant="secondary"><ArrowLeft size={14}/> Production board</LinkButton>} meta={<><StatusBadge status={state}/><Tag>{operation.shift ?? "NO SHIFT"}</Tag><Tag>FLOOR VIEW · NO COSTS</Tag></>} />
    <div className="stat-grid"><StatCard label="Good output" value={formatQty(operation.good, operation.unit, 0)} detail="accepted at this operation" tone="neem"/><StatCard label="Waste" value={formatQty(operation.waste, operation.unit, 1)} detail="recorded separately" tone="turmeric"/><StatCard label="Reject" value={formatQty(operation.reject, operation.unit, 1)} detail="recorded separately" tone="madder"/><StatCard label="Remaining target" value={formatQty(Decimal.max(0, plannedRoom).toFixed(3), operation.unit, 0)} detail={`Target ${formatQty(operation.target, operation.unit, 0)}`} tone="indigo"/></div>
    <div className="two-pane"><div className="stack">
      <Card title="1 · Confirm workstation"><div className="page-grid"><div className="col-6"><Kicker>Machine</Kicker><strong style={{ display: "block", font: "900 24px var(--font-mono)", marginTop: 6 }}>{machine?.code ?? "Unassigned"}</strong><span className="cell-secondary">{machine?.name ?? "Assign a stage-eligible machine before starting"}</span></div><div className="col-6"><Kicker>Machine state</Kicker><div style={{ marginTop: 8 }}><StatusBadge status={machine?.status ?? "OFFLINE"}/></div><span className="cell-secondary">{machine?.location ?? "No location"}</span></div><div className="col-6"><Kicker>Shift</Kicker><strong className="cell-primary">{operation.shift ?? "No assigned shift"}</strong></div><div className="col-6"><Kicker>Operator(s)</Kicker><strong className="cell-primary">{operation.operators.join(" · ") || "No assigned operator"}</strong></div></div>{machine?.status === "BREAKDOWN" && <InfoStrip tone="danger">Machine is down. Do not start this operation until a separate maintenance close-out clears the machine.</InfoStrip>}</Card>
      <Card title="2 · Record output" className="card--floor"><form onSubmit={record} className="stack"><div className="form-grid form-grid--3"><Field label={`Good · ${operation.unit}`}><TextInput className="floor-input" inputMode="decimal" pattern="\d+(\.\d{1,3})?" value={good} onChange={(event) => setGood(event.target.value)} disabled={state !== "IN_PROGRESS" || !canRecordOutput} required/></Field><Field label={`Waste · ${operation.unit}`}><TextInput className="floor-input" inputMode="decimal" value={waste} onChange={(event) => setWaste(event.target.value)} disabled={state !== "IN_PROGRESS" || !canRecordOutput} required/></Field><Field label={`Reject · ${operation.unit}`}><TextInput className="floor-input" inputMode="decimal" value={reject} onChange={(event) => setReject(event.target.value)} disabled={state !== "IN_PROGRESS" || !canRecordOutput} required/></Field></div><div className="info-strip"><Activity size={17}/><div><strong>Exact shift check</strong><div>Combined entry {formatQty(nextQty.toFixed(3), operation.unit, 1)} · remaining target {formatQty(Decimal.max(0, plannedRoom).toFixed(3), operation.unit, 1)}</div></div></div>{finalStage && <Field label="Final-stage roll total · M" hint="Must exactly equal this entry's good-output quantity before final-stage completion."><TextInput className="floor-input" inputMode="decimal" value={rollQty} onChange={(event) => setRollQty(event.target.value)} disabled={state !== "IN_PROGRESS" || !canRecordOutput} required/><span className="field__hint">{rollMatches ? "Roll quantity reconciles." : "Roll total must equal good output exactly."}</span></Field>}<div className="form-actions"><span className="field__hint">Good, waste, reject and roll lineage create append-only events.</span><Button type="submit" size="lg" disabled={busy || state !== "IN_PROGRESS" || !rollMatches}><Check size={17}/>{busy ? "Recording…" : "Record output"}</Button></div></form></Card>
      <Card title="3 · State actions"><div className="stack-sm">{!canOperate && <InfoStrip tone="warning">State changes require machines.operate. This profile can inspect but cannot start, pause, complete, or cancel this operation.</InfoStrip>}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{state === "PLANNED" && <Button size="lg" disabled={!canOperate || busy || !machine || machine.status !== "IDLE"} onClick={() => transition("start")}><Play size={17}/> Start</Button>}{state === "IN_PROGRESS" && <><Button size="lg" variant="secondary" disabled={!canOperate || busy} onClick={() => transition("pause")}><Pause size={17}/> Pause</Button><Button size="lg" variant="primary" disabled={!canOperate || busy || (finalStage && !rollMatches)} onClick={() => transition("complete")}><Check size={17}/> Complete</Button></>}{state === "PAUSED" && <Button size="lg" disabled={!canOperate || busy} onClick={() => transition("resume")}><Play size={17}/> Resume</Button>}{["PLANNED", "IN_PROGRESS", "PAUSED"].includes(state) && <Button size="lg" variant="danger" disabled={!canOperate || busy} onClick={() => transition("cancel")}>Cancel operation</Button>}</div>{canOperate && ["IN_PROGRESS", "PAUSED", "PLANNED"].includes(state) && <Field label="Reason for pause / cancellation / downtime" hint="Required for pause and cancellation; preserve append-only reason. Use at least five characters."><TextArea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What happened? Include the stop time and issue…"/></Field>}<span className="field__hint">Completed operations have no edit or delete controls. A correction is a new, linked event.</span></div></Card>
    </div><aside className="stack sticky-summary"><Card title="Operation thread"><div className="stack-sm"><div className="permission-note"><strong>{operation.planCode}</strong><span className="cell-secondary">Plan linked to order {operation.orderCode}</span></div><div className="permission-note"><strong>Stage · {operation.stage}</strong><span className="cell-secondary">Input unit and output unit: {operation.unit}. Cross-unit arithmetic is prohibited.</span></div><div className="permission-note"><strong>Target · {formatQty(operation.target, operation.unit, 1)}</strong><span className="cell-secondary">Recorded outputs: good + waste + reject.</span></div><InfoStrip tone="warning">Final-stage rolls need one traceable identity each; their exact total must reconcile to good output. No UUID or roll code is minted in this demo.</InfoStrip><LinkButton href={`/machines/${machine?.id ?? ""}`} variant="secondary"><Factory size={15}/> Machine detail</LinkButton></div></Card>
    
    <Card title="Required Yarn Recipe (BOM)">
      {loadingBom ? <div style={{ padding: 12 }}>Loading recipe...</div> : bom.length === 0 ? <EmptyState title="No recipe" detail="No dynamic BOM found for this product." /> : 
        <div className="stack-sm">
          {bom.map(b => (
            <div className="permission-note" key={b.yarn_item_id}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong className="code">{b.yarn_code}</strong>
              </div>
              <span className="cell-secondary">{b.yarn_name}</span>
              <div className="num" style={{ marginTop: 4 }}>
                {formatQty(b.quantity_required, b.unit, 3)} per unit
              </div>
            </div>
          ))}
          <InfoStrip tone="info">Check recipe details against machine inputs before starting the operation.</InfoStrip>
        </div>
      }
    </Card>

    <Card title="Append-only output history"><DataTable headers={["Event", "Kind", "Quantity", "Time", "Actor"]} rows={data.outputEvents.filter((event) => event.operationId === operationId).map((event) => [event.code, event.kind, formatQty(event.quantity,event.unit,1), formatDateTime(event.recordedAt), event.actor])} empty={<EmptyState title="No output events" detail="Session-only output records appear here after a valid command."/>}/></Card><div className="permission-note">User {user?.name} · role permissions checked by permission key, not role name.</div></aside></div>
  </>;
}

function ShiftSummaryPage() {
  const { data } = useDemo();
  const stages = stageOrder.flatMap((stage) => [...new Set(data.operations.filter((operation) => operation.stage === stage).map((operation) => operation.unit))].map((unit) => {
    const operations = data.operations.filter((operation) => operation.stage === stage && operation.unit === unit);
    return { stage, unit, operations, good: operations.reduce((sum, operation) => sum.plus(operation.good), new Decimal(0)), waste: operations.reduce((sum, operation) => sum.plus(operation.waste), new Decimal(0)), reject: operations.reduce((sum, operation) => sum.plus(operation.reject), new Decimal(0)) };
  }));
  return <><PageHeader eyebrow="Operations close-out · shift B" title="Shift summary" description="Good, waste, reject, downtime, and handover are separate numbers. Totals are grouped by stage and unit." actions={<LinkButton href="/production" variant="secondary"><ArrowLeft size={14}/> Production board</LinkButton>} meta={<Tag>10 OCT 2026 · 14:00–22:00 · DEMO</Tag>} />
    <div className="page-grid">{stages.map((stage) => <Card key={`${stage.stage}-${stage.unit}`} className="col-4" title={`${stage.stage} · ${stage.unit}`}><div className="num" style={{ fontSize: 22, fontWeight: 900 }}>{formatQty(stage.good.toFixed(3),stage.unit,0)} good</div><div className="stack-sm" style={{ marginTop: 10 }}><div className="permission-note">Waste · {formatQty(stage.waste.toFixed(3),stage.unit,1)}</div><div className="permission-note">Reject · {formatQty(stage.reject.toFixed(3),stage.unit,1)}</div><div className="permission-note">Operations · {stage.operations.length}</div></div></Card>)}</div>
    <Card title="Handover and open downtime" className="col-12"><DataTable headers={["Machine", "State", "Downtime", "Linked order", "Handover note"]} rows={data.machines.filter((machine) => machine.downtimeMinutes > 0 || machine.status === "BREAKDOWN").map((machine) => [machine.code, <StatusBadge status={machine.status}/>, `${machine.downtimeMinutes} min`, machine.orderCode ?? "—", machine.status === "BREAKDOWN" ? "Repair and quality impact to be reviewed by incoming lead" : "Close-out complete / no note in demo"])} /></Card>
    <InfoStrip tone="warning">Shift summary is a seeded preview; an authoritative close must carry signed record timestamps and avoid changing earlier postings.</InfoStrip></>;
}

function OrderModal({ orderCode, onClose }: { orderCode: string; onClose: () => void }) {
  const { data } = useDemo();
  const order = data.orders.find(o => o.code === orderCode);
  const [tab, setTab] = useState("details");

  if (!order) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "white", padding: 24, borderRadius: 12, width: "90%", maxWidth: 800, maxHeight: "90%", overflow: "auto", position: "relative", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, border: "none", background: "none", cursor: "pointer", color: "#64748b" }} aria-label="Close modal"><X size={24} /></button>
        <h2 style={{ marginBottom: 16, fontSize: "1.5rem" }}>Order Details: {order.code}</h2>
        
        <div className="filter-row production-view-tabs" style={{ marginBottom: 20 }}>
          <button className={`filter-chip ${tab === "details" ? "filter-chip--active" : ""}`} onClick={() => setTab("details")}>Details</button>
          <button className={`filter-chip ${tab === "production" ? "filter-chip--active" : ""}`} onClick={() => setTab("production")}>Production</button>
          <button className={`filter-chip ${tab === "financials" ? "filter-chip--active" : ""}`} onClick={() => setTab("financials")}>Financials</button>
        </div>

        {tab === "details" && (
          <div className="page-grid">
            <Card className="col-6" title="Basic Info">
              <div className="stack-sm">
                <div><strong>Buyer:</strong> {order.buyer}</div>
                <div><strong>Product:</strong> {order.product}</div>
                <div><strong>Colour:</strong> {order.colour}</div>
                <div><strong>Priority:</strong> <StatusBadge status={order.priority} /></div>
              </div>
            </Card>
            <Card className="col-6" title="Status">
              <div className="stack-sm">
                <div><strong>Stage:</strong> {order.stage || "N/A"}</div>
                <div><strong>Due Date:</strong> {formatDate(order.due)}</div>
                <div><strong>Status:</strong> <StatusBadge status={order.status} /></div>
                <div><strong>Material Shortage:</strong> {order.materialShortage ? "Yes" : "No"}</div>
              </div>
            </Card>
          </div>
        )}

        {tab === "production" && (
          <div className="page-grid">
            <Card className="col-12" title="Production Quantities">
              <div className="stat-grid">
                <StatCard label="Ordered" value={formatQty(order.ordered, order.unit, 0)} />
                <StatCard label="Produced" value={formatQty(order.produced, order.unit, 0)} />
                <StatCard label="Accepted" value={formatQty(order.accepted, order.unit, 0)} tone="neem" />
                <StatCard label="Dispatched" value={formatQty(order.dispatched, order.unit, 0)} tone="indigo" />
              </div>
              <div style={{ marginTop: 24 }}>
                 <Meter value={order.produced} total={order.ordered} label="Production Progress" />
              </div>
            </Card>
          </div>
        )}

        {tab === "financials" && (
          <div className="page-grid">
             <Card className="col-12" title="Financial Summary">
                <div className="stat-grid">
                   <StatCard label="Revenue" value={formatMoney(order.revenue, order.currency)} tone="neem" />
                   <StatCard label="Recorded Cost" value={formatMoney(order.recordedCost, order.currency)} tone="madder" />
                   <StatCard label="Estimated Cost" value={formatMoney(order.estimatedCost, order.currency)} tone="turmeric" />
                </div>
             </Card>
          </div>
        )}
      </div>
    </div>
  );
}
