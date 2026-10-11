"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { RoleLink as Link } from "@/components/ui/primitives";
import { Activity, ArrowLeft, ArrowRight, Clock3, ShieldAlert, Wrench } from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { hasPermission } from "@/lib/auth/permissions";
import { formatDate, formatDateTime, formatMoney, formatQty } from "@/lib/domain/format";
import type { Machine } from "@/lib/domain/types";
import { Button, Card, DataTable, EmptyState, Field, InfoStrip, LinkButton, PageHeader, SelectInput, StatCard, StatusBadge, Tag, TextArea, TextInput } from "@/components/ui/primitives";

const MACHINE_STAGES = ["ALL", "SPINNING", "WEAVING", "DYEING"] as const;
const MACHINE_STATUSES: Machine["status"][] = ["RUNNING", "IDLE", "SETUP", "MAINTENANCE", "BREAKDOWN", "OFFLINE"];

export function MachineRoute({ path, id }: { path: string; id?: string }) {
  if (path.startsWith("/machines/") && id) return <MachineDetail id={id}/>;
  return <MachineBoard/>;
}

function MachineBoard() {
  const { data, user, refreshData } = useDemo();
  const [stage, setStage] = useState<(typeof MACHINE_STAGES)[number]>("ALL");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data.machines.length === 0) {
      setLoading(true);
      fetch("/api/production")
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data?.machines?.length) {
            refreshData();
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [data.machines.length, refreshData]);

  const filtered = useMemo(() => data.machines.filter((machine) => stage === "ALL" || machine.stage === stage), [data.machines, stage]);
  return <>
    <PageHeader eyebrow="Production assets · status board" title="Machines" description="Each machine has an explicit state, stage, operation assignment, shift output, and downtime. Only authorized finance readers see rates." actions={<LinkButton href="/production" variant="secondary"><Activity size={15}/> Production board</LinkButton>} meta={<Tag>{data.machines.length} ASSETS · LIVE</Tag>} />
    <div className="stat-grid">{MACHINE_STATUSES.map((status, index) => <div className={`stat-card stat-card--${["indigo", "neem", "turmeric", "madder", "madder", "cotton"][index]}`} key={status}><div className="stat-card__top">{status.replaceAll("_", " ")}</div><strong>{data.machines.filter((machine) => machine.status === status).length}</strong><div className="stat-card__bottom">{status === "BREAKDOWN" ? "reason and recovery required" : "machines"}</div></div>)}</div>
    <div className="filter-row" role="group" aria-label="Filter machine stage">{MACHINE_STAGES.map((item) => <button type="button" key={item} className={`filter-chip${stage === item ? " filter-chip--active" : ""}`} aria-pressed={stage === item} onClick={() => setStage(item)}>{item}</button>)}</div>
    
    {loading && data.machines.length === 0 ? (
      <div style={{ padding: "48px 24px", textAlign: "center", border: "2px dashed var(--color-border, #ccc)", borderRadius: 8, margin: "24px 0", background: "var(--card-bg, #fff)" }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Loading factory machines…</div>
        <p className="cell-secondary" style={{ marginTop: 6 }}>Syncing machine assets with factory ledger.</p>
      </div>
    ) : filtered.length === 0 ? (
      <div style={{ margin: "24px 0" }}>
        <EmptyState
          title={data.machines.length === 0 ? "No machines loaded" : `No machines found for stage "${stage}"`}
          detail={data.machines.length === 0 ? "No machine assets are currently loaded from the database." : "Try selecting a different stage filter above."}
          action={
            <Button variant="secondary" onClick={() => refreshData()}>
              Refresh machine status
            </Button>
          }
        />
      </div>
    ) : (
      <div className="page-grid">{filtered.map((machine) => <article className={`machine-tile machine-tile--${machine.status} col-4`} key={machine.id}>
        <div className="machine-tile__top"><div><span className="machine-tile__code">{machine.code}</span><h3>{machine.name}</h3></div><StatusBadge status={machine.status}/></div>
        <div className="machine-tile__meta"><span>{machine.stage}</span><span>{machine.location}</span></div>
        <div style={{ marginTop: 13 }}>
          <span className="cell-secondary">Current operation / order</span>
          {machine.orderCode ? (() => {
            const order = data.orders.find(o => o.code === machine.orderCode);
            return (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <strong className="cell-primary">{machine.orderCode}</strong>
                <span className="cell-secondary" style={{ fontSize: 12 }}>{order ? `${order.product} · ${order.colour}` : "Product unknown"}</span>
              </div>
            );
          })() : <strong className="cell-primary">Unassigned</strong>}
        </div>
        <div className="page-grid" style={{ marginTop: 10, gap: 8 }}><div className="col-6"><span className="cell-secondary">Good today</span><strong className="num">{formatQty(machine.todayGood, machine.unit, 0)}</strong></div><div className="col-6"><span className="cell-secondary">Downtime</span><strong className="num">{machine.downtimeMinutes} min</strong></div></div>
        <div style={{ marginTop: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><span className="field__hint">{hasPermission(user, "finance.read") ? (machine.costPerHour ? `${formatMoney(machine.costPerHour)}/hr` : "Hourly rate missing") : "Rate · finance only"}</span><Link href={`/machines/${machine.id}`} className="btn btn--secondary btn--sm">Open machine <ArrowRight size={12}/></Link></div>
      </article>)}</div>
    )}
    <InfoStrip tone="info" title="Assignment guardrails.">A machine runs only through its assigned, stage-matched operation. Setup, breakdown, maintenance, or offline state blocks a new start; a second open downtime/maintenance event is prohibited.</InfoStrip>
  </>;
}

function MachineDetail({ id }: { id: string }) {
  const { data, act, user, toast } = useDemo();
  const machine = data.machines.find((candidate) => candidate.id === id || candidate.code === id);
  const [reason, setReason] = useState("");
  const [showDowntime, setShowDowntime] = useState(false);
  const [category, setCategory] = useState("MECHANICAL");
  const [durationMinutes, setDurationMinutes] = useState("15");
  const [downtimeReason, setDowntimeReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [transitionRevision, setTransitionRevision] = useState(1);
  const [downtimeRevision, setDowntimeRevision] = useState(1);
  if (!machine) return <><PageHeader title="Machine not found"/><EmptyState title="No machine record" action={<LinkButton href="/machines">Machine board</LinkButton>}/></>;

  const machineId = machine.id;
  const operation = data.operations.find((candidate) => candidate.id === machine.operationId);
  const canOperate = hasPermission(user, "machines.operate");
  const canSeeRate = hasPermission(user, "finance.read");
  const events = data.machineEvents.filter((event) => event.machineId === machineId).slice().sort((left, right) => right.startedAt.localeCompare(left.startedAt));

  async function transition(status: Machine["status"]) {
    setBusy(true);
    try {
      const res = await fetch("/api/production/machine-status", {
        method: "POST",
        body: JSON.stringify({ machineId, status, reason, actor: user?.name })
      });
      const data = await res.json();
      if (data.success) {
        setTransitionRevision((current) => current + 1); setReason("");
        window.location.reload();
      } else {
        toast("Error", data.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function submitDowntime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/production/record-downtime", {
        method: "POST",
        body: JSON.stringify({ machineId, category, durationMinutes, reason: downtimeReason, actor: user?.name })
      });
      const data = await res.json();
      if (data.success) {
        setDowntimeRevision((current) => current + 1);
        setShowDowntime(false);
        setDowntimeReason("");
        window.location.reload();
      } else {
        toast("Error", data.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <PageHeader eyebrow={`${machine.stage} · asset record`} title={`${machine.code} · ${machine.name}`} description={machine.location} actions={<LinkButton href="/machines" variant="secondary"><ArrowLeft size={14}/> Machine board</LinkButton>} meta={<><StatusBadge status={machine.status}/>{operation && <Tag>{operation.code}</Tag>}</>} />
    <div className="stat-grid">
      <StatCard label="State" value={machine.status.replaceAll("_", " ")} detail="allowed actions depend on current state" tone={machine.status === "BREAKDOWN" ? "madder" : machine.status === "RUNNING" ? "indigo" : "cotton"}/>
      <StatCard label="Good today" value={formatQty(machine.todayGood, machine.unit, 1)} detail={`Unit ${machine.unit}`} tone="neem"/>
      <StatCard label="Downtime" value={`${machine.downtimeMinutes} min`} detail="current shift demo" tone="turmeric"/>
      <StatCard label="Hourly rate" value={canSeeRate ? (machine.costPerHour ? formatMoney(machine.costPerHour) : "Missing") : "Finance only"} detail={canSeeRate ? "Missing rate is not treated as zero" : "finance.read required"} tone="cotton"/>
    </div>
    <div className="two-pane">
      <div className="stack">
        <Card title="Current assignment"><div className="page-grid">
          {(() => {
            const order = machine.orderCode ? data.orders.find(o => o.code === machine.orderCode) : null;
            return (
              <div className="col-12" style={{ marginBottom: 12 }}>
                <span className="cell-secondary">Order & Product</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <strong className="cell-primary">{machine.orderCode ?? "No order"}</strong>
                  {order && <span className="cell-secondary" style={{ fontSize: 13, marginTop: 4 }}>{order.product} · {order.colour}</span>}
                </div>
              </div>
            );
          })()}
          <div className="col-6"><span className="cell-secondary">Operation</span><strong className="cell-primary">{operation?.code ?? "No operation"}</strong></div>
          <div className="col-6"><span className="cell-secondary">Shift</span><strong className="cell-primary">{operation?.shift ?? "No shift"}</strong></div>
          <div className="col-12" style={{ marginTop: 12 }}><span className="cell-secondary">Operators</span><strong className="cell-primary">{operation?.operators.join(" · ") || "Unassigned"}</strong></div>
        </div>{operation && <LinkButton href={`/production/operations/${operation.id}`} variant="secondary">Open operation <ArrowRight size={14}/></LinkButton>}</Card>

        <Card title="Allowed machine actions"><div className="stack-sm">
          {!canOperate ? <InfoStrip tone="warning">This permission profile is view-only. A state or downtime command requires machines.operate.</InfoStrip> : <>
            <p className="field__hint">State commands update the demo event ledger only. Starting a machine directly is not offered: RUNNING must be backed by its operation.</p>
            {machine.status === "IDLE" && <InfoStrip tone="info">An idle asset must be started from a valid assigned operation in the operation console.{operation && <> <Link href={`/production/operations/${operation.id}`} className="inline-link">Open {operation.code}</Link>.</>}</InfoStrip>}
            {machine.status === "RUNNING" && <>
              <Field label="Stop reason · minimum 5 characters"><TextArea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this run stopping?" minLength={5}/></Field>
              <div className="action-row"><Button variant="danger" disabled={busy || reason.trim().length < 5} onClick={() => transition("BREAKDOWN")}><ShieldAlert size={15}/> Record breakdown</Button><Button variant="secondary" disabled={busy || reason.trim().length < 5} onClick={() => transition("MAINTENANCE")}><Wrench size={15}/> Start maintenance</Button></div>
              <InfoStrip tone="warning">A breakdown or maintenance event pauses the linked operation and opens a downtime record. Use the operation console for normal pause or completion.</InfoStrip>
            </>}
            {(machine.status === "BREAKDOWN" || machine.status === "MAINTENANCE") && <>
              <Field label={machine.status === "BREAKDOWN" ? "Repair completion / handover note" : "Maintenance close-out note"}><TextArea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Work performed, checks, and person closing…" minLength={5}/></Field>
              <Button disabled={busy || reason.trim().length < 5} onClick={() => transition("IDLE")}>Close event · return to idle</Button>
            </>}
            {machine.status === "SETUP" && <Button variant="secondary" disabled={busy} onClick={() => transition("IDLE")}>Complete setup</Button>}
            {machine.status === "OFFLINE" && <InfoStrip tone="warning">Offline asset; contact an administrator before putting it into the schedule.</InfoStrip>}
            <Button variant="quiet" onClick={() => setShowDowntime((visible) => !visible)}><Clock3 size={15}/> {showDowntime ? "Close downtime form" : "Record closed downtime"}</Button>
            {showDowntime && <form className="stack" onSubmit={submitDowntime}>
              <Field label="Downtime category"><SelectInput value={category} onChange={(event) => setCategory(event.target.value)}><option value="MECHANICAL">Mechanical</option><option value="ELECTRICAL">Electrical</option><option value="MATERIAL">Material wait</option><option value="CHANGEOVER">Changeover</option><option value="OTHER">Other</option></SelectInput></Field>
              <Field label="Duration · whole minutes"><TextInput inputMode="numeric" type="number" min="1" max="1440" step="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} required/></Field>
              <Field label="Reason · minimum 5 characters"><TextArea value={downtimeReason} onChange={(event) => setDowntimeReason(event.target.value)} minLength={5} required/></Field>
              <Button type="submit" disabled={busy || downtimeReason.trim().length < 5}>Append downtime event</Button>
              <p className="field__hint">This form records a completed historical interval; it cannot create a second open breakdown/maintenance event.</p>
            </form>}
          </>}
        </div></Card>
      </div>

      <div className="stack">
        <Card title="Maintenance register"><DataTable headers={["Field", "Record"]} rows={[
          ["Next maintenance", machine.nextMaintenance ? formatDate(machine.nextMaintenance) : "Not scheduled"],
          ["Downtime this shift", `${machine.downtimeMinutes} minutes`],
          ["Hourly cost", canSeeRate ? (machine.costPerHour ? formatMoney(machine.costPerHour) : "MISSING — not assumed to be 0") : "Restricted · finance.read required"],
          ["Stage", machine.stage],
          ["Location", machine.location],
        ]}/></Card>
        <Card title="Append-only downtime / maintenance events" action={<Tag>{events.length} entries</Tag>}>
          <DataTable headers={["Event", "Type / status", "Reason", "Duration", "Actor", "Started"]} rows={events.map((item) => [<span className="code">{item.code}</span>, <StatusBadge status={item.status === "OPEN" ? "BREAKDOWN" : item.kind} label={`${item.kind} · ${item.status}`}/>, item.reason, `${item.durationMinutes} min`, item.actor, formatDateTime(item.startedAt)])} empty={<EmptyState title="No downtime events" detail="A downtime or maintenance action will create an append-only event." />}/>
        </Card>
        <InfoStrip tone="info">Machine state changes and downtime events are recorded directly with timestamps and operator records.</InfoStrip>
      </div>
    </div>
  </>;
}
