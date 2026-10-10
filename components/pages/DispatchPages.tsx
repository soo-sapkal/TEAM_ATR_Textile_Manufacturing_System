"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { RoleLink as Link } from "@/components/ui/primitives";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, PackageCheck, Printer, ShieldAlert, Truck } from "lucide-react";
import Decimal from "decimal.js";
import { useDemo } from "@/lib/demo/context";
import { hasPermission } from "@/lib/auth/permissions";
import { formatDate, formatDateTime, formatMoney, formatQty } from "@/lib/domain/format";
import { BrandMark, Button, Card, DataTable, EmptyState, Field, InfoStrip, Kicker, LinkButton, PageHeader, SelectInput, StatusBadge, Tag, TextInput, Thread } from "@/components/ui/primitives";
import type { FabricRoll } from "@/lib/domain/types";
import { Can } from "@/components/ui/Can";

export function SupervisorDispatchDashboard() {
  const { data, toast } = useDemo();
  const [timeframe, setTimeframe] = useState("Today");

  const filteredShipments = data.shipments;
  
  const pending = filteredShipments.filter(s => s.status !== "DISPATCHED");
  const completed = filteredShipments.filter(s => s.status === "DISPATCHED");
  
  const fulfillmentRate = filteredShipments.length ? (completed.length / filteredShipments.length * 100).toFixed(0) : "0";
  const totalVolume = completed.reduce((sum, s) => sum.plus(s.qty), new Decimal(0));
  const totalRolls = completed.reduce((sum, s) => sum + (s.rolls || 0), 0);
  
  const now = Date.now();
  const delayedShipments = pending.filter(s => new Date(s.plannedAt).getTime() < now);

  return (
    <>
      <PageHeader 
        eyebrow="Logistics Oversight" 
        title="Dispatch Dashboard" 
        description="Monitor daily shipments, volume, and dispatch performance." 
        actions={<Button variant="primary" onClick={() => { toast("Manifest Generated", "Daily dispatch manifest ready for printing.", "success"); window.print(); }} style={{ border: "2px solid #000", boxShadow: "3px 3px 0 #000" }}><Printer size={16}/> Daily Manifest</Button>} 
      />

      <div className="filter-row" role="group" style={{ marginBottom: 24 }}>
        {["Today", "Yesterday", "This Week", "This Month", "Custom Range"].map(t => (
          <button key={t} className={`filter-chip ${timeframe === t ? "filter-chip--active" : ""}`} style={{ border: "2px solid #000", fontWeight: "bold" }} onClick={() => setTimeframe(t)}>{t}</button>
        ))}
      </div>

      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--neem)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Fulfillment Rate</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{fulfillmentRate}%</div>
          <div style={{ fontSize: "0.85rem", color: "#444", fontWeight: 600 }}>{completed.length} completed / {pending.length} pending</div>
        </div>
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--cotton)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Dispatched Volume</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{formatQty(totalVolume.toFixed(0), "M", 0)}</div>
          <div style={{ fontSize: "0.85rem", color: "#444", fontWeight: 600 }}>{totalRolls} total rolls</div>
        </div>
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: delayedShipments.length > 0 ? "var(--madder)" : "var(--indigo)", display: "flex", flexDirection: "column", gap: "8px", color: delayedShipments.length > 0 ? "#fff" : "inherit" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Urgent / Delayed</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{delayedShipments.length}</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Missed scheduled slots</div>
        </div>
      </div>

      <section className="card" style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", background: "#fff" }}>
        <div className="card__head">
          <h2>Today's Shipments</h2>
          <Tag>{filteredShipments.length} records</Tag>
        </div>
        <DataTable 
          headers={["Shipment", "Order / Buyer", "Planned", "Volume", "Vehicle", "Status", "Actions"]} 
          rows={filteredShipments.map(shipment => {
            const isDelayed = shipment.status !== "DISPATCHED" && new Date(shipment.plannedAt).getTime() < now;
            return [
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isDelayed && <ShieldAlert size={16} color="var(--madder)" />}
                <Link href={`/dispatch/${shipment.id}`} className="code" style={{ fontWeight: 700, color: isDelayed ? "var(--madder)" : "inherit", textDecoration: "none" }}>{shipment.code}</Link>
              </div>,
              <div>
                <Link href={`/orders/${encodeURIComponent(shipment.orderCode)}`} className="cell-primary">{shipment.orderCode}</Link>
                <span className="cell-secondary">{shipment.buyer}</span>
              </div>,
              <span style={{ color: isDelayed ? "var(--madder)" : "inherit", fontWeight: isDelayed ? "bold" : "normal" }}>{formatDateTime(shipment.plannedAt)}</span>,
              <span>{shipment.rolls} rolls <span className="cell-secondary">· {formatQty(shipment.qty, shipment.unit, 0)}</span></span>,
              shipment.vehicle || "—",
              isDelayed ? <StatusBadge status="QUARANTINED" label="DELAYED" /> : <StatusBadge status={shipment.status} />,
              <Link href={`/dispatch/${shipment.id}`} className="btn btn--secondary btn--sm" style={{ border: isDelayed ? "2px solid var(--madder)" : "2px solid #000", boxShadow: "2px 2px 0px #000", fontWeight: "bold" }}>View <ArrowRight size={12}/></Link>
            ];
          })}
        />
      </section>
    </>
  );
}

export function DispatchRoute({ path, id }: { path: string; id?: string }) {
  if (path === "/dispatch/new") return <NewShipmentPage/>;
  if (path === "/dispatch/stock") return <FinishedStockPage/>;
  if (path.startsWith("/print/dispatch/")) return <PrintDispatchPage id={id ?? ""}/>;
  if (path.startsWith("/print/roll-tag/")) return <PrintRollTagPage id={id ?? ""}/>;
  if (path.startsWith("/dispatch/") && id) return <ShipmentPage id={id}/>;
  return <DispatchListPage/>;
}

function DispatchListPage() {
  const { data } = useDemo();
  const pending = data.shipments.filter((shipment) => shipment.status === "DRAFT").length;
  const dispatched = data.shipments.filter((shipment) => shipment.status === "DISPATCHED").length;
  const readyRolls = data.rolls.filter((roll) => roll.status === "ACCEPTED");
  const availableByUnit = [...new Set(readyRolls.map((roll) => roll.unit))].map((unit) => formatQty(readyRolls.filter((roll) => roll.unit === unit).reduce((sum, roll) => sum.plus(roll.qty), new Decimal(0)).toFixed(3), unit, 0));
  const availableLabel = availableByUnit.join(" · ") || "0";
  return <><PageHeader eyebrow="Order fulfilment · outbound" title="Dispatch" description="Only accepted rolls may be allocated. A load stays draft until the reserved list is revalidated at confirmation." actions={<><LinkButton href="/dispatch/stock" variant="secondary"><PackageCheck size={14}/> Finished stock</LinkButton><Can perm="dispatch.create"><LinkButton href="/dispatch/new" variant="primary"><Truck size={14}/> Build shipment</LinkButton></Can></>} meta={<><Tag>{readyRolls.length} ACCEPTED ROLLS</Tag><Tag>{availableLabel} ELIGIBLE</Tag></>} /><div className="stat-grid"><div className="stat-card stat-card--neem"><div className="stat-card__top">Finished stock · eligible</div><strong>{readyRolls.length}</strong><div className="stat-card__bottom">ACCEPTED only</div></div><div className="stat-card stat-card--indigo"><div className="stat-card__top">Eligible quantity</div><strong>{availableLabel}</strong><div className="stat-card__bottom">grouped by order</div></div><div className="stat-card stat-card--turmeric"><div className="stat-card__top">Draft loads</div><strong>{pending}</strong><div className="stat-card__bottom">not yet confirmed</div></div><div className="stat-card stat-card--cotton"><div className="stat-card__top">Dispatch records</div><strong>{dispatched}</strong><div className="stat-card__bottom">seeded history</div></div></div><div className="page-grid"><Card className="col-8" title="Shipment register" action={<Tag>{data.shipments.length} examples</Tag>}><DataTable headers={["Shipment", "Order / buyer", "Plan time", "Rolls · qty", "Vehicle", "State", "Invoice", ""]} rows={data.shipments.map((shipment) => [<Link href={`/dispatch/${shipment.id}`} className="cell-primary code">{shipment.code}</Link>, <div><Link href={`/orders/${encodeURIComponent(shipment.orderCode)}`} className="cell-primary">{shipment.orderCode}</Link><span className="cell-secondary">{shipment.buyer}</span></div>, formatDateTime(shipment.plannedAt), <span className="num">{shipment.rolls} · {formatQty(shipment.qty,shipment.unit,0)}</span>, shipment.vehicle || "Not set", <StatusBadge status={shipment.status}/>, shipment.invoice ?? <StatusBadge status="MISSING" label="Not created"/>, <Link href={`/dispatch/${shipment.id}`} className="btn btn--secondary btn--sm">Load <ArrowRight size={12}/></Link>])}/></Card><Card className="col-4" title="Dispatch guardrails"><div className="stack-sm"><InfoStrip tone="success">Accepted only. Rework, reject, quarantine, awaiting inspection, and already dispatched are all ineligible.</InfoStrip><InfoStrip tone="warning">A roll must belong to the same order as the shipment. Quantity tolerance and remaining buyer commitment are rechecked by the live server.</InfoStrip><InfoStrip>Confirmation creates one session-only demo invoice reference; it is not a tax invoice or external record.</InfoStrip></div></Card></div></>;
}

function NewShipmentPage() {
  const router = useRouter();
  const { data, act, toast, user } = useDemo();
  const orders = data.orders.filter((order) => new Decimal(order.available).gt(0));
  const [orderCode, setOrderCode] = useState(orders.find((order) => order.displayStatus === "READY_FOR_DISPATCH")?.code ?? orders[0]?.code ?? "");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [vehicle, setVehicle] = useState("KA-01-AB-1234");
  const [plannedAt, setPlannedAt] = useState("2026-10-11T11:00");
  const [busy, setBusy] = useState(false);
  const order = data.orders.find((candidate) => candidate.code === orderCode);
  const eligible = data.rolls.filter((roll) => roll.status === "ACCEPTED" && roll.orderCode === orderCode && roll.unit === (order?.unit ?? "M"));
  const chosen = eligible.filter((roll) => Object.hasOwn(selected, roll.id));
  const total = chosen.reduce((sum, roll) => {
    const qtyStr = selected[roll.id];
    const parsed = parseFloat(qtyStr);
    return sum.plus(Number.isFinite(parsed) ? parsed : 0);
  }, new Decimal(0));
  const withinBalance = Boolean(order && total.lte(order.available));
  const selectionValid = chosen.length > 0 && chosen.every((roll) => roll.status === "ACCEPTED" && roll.orderCode === orderCode) && new Set(chosen.map((roll) => roll.unit)).size === 1 && withinBalance;
  function changeOrder(value: string) { setOrderCode(value); setSelected({}); }
  function toggle(id: string, fullQty: string) {
    setSelected((current) => {
      const next = { ...current };
      if (Object.hasOwn(next, id)) delete next[id];
      else next[id] = fullQty;
      return next;
    });
  }
  function updateQty(id: string, qty: string) {
    if (!Object.hasOwn(selected, id)) return;
    setSelected((current) => ({ ...current, [id]: qty }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectionValid) { toast("Load is not eligible", "Select accepted rolls from one order and keep the total at or below the remaining available quantity.", "error"); return; }
    if (!vehicle.trim()) { toast("Vehicle details required", "Enter the vehicle/transport reference.", "error"); return; }
    const time = new Date(plannedAt);
    if (!Number.isFinite(time.getTime())) { toast("Planned load time is invalid", "Choose a valid local date and time.", "error"); return; }
    if (!hasPermission(user, "dispatch.create")) { toast("Shipment creation is read-only", "This action requires dispatch.create.", "error"); return; }
    
    setBusy(true);
    try {
      const res = await fetch("/api/dispatch/create-draft", {
        method: "POST",
        body: JSON.stringify({
          orderCode,
          rollIds: Object.keys(selected),
          vehicle: vehicle.trim(),
          plannedAt: time.toISOString(),
          actor: user?.name
        })
      });
      const data = await res.json();
      
      if (data.success && data.reference) {
        toast("Draft created", "The shipment draft has been saved to the database.", "success");
        router.push(`/dispatch/${encodeURIComponent(data.reference)}`);
      } else {
        toast("Creation failed", data.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return <><PageHeader eyebrow="Build a load · allocation" title="New shipment" description="Choose an order, then allocate only rolls in ACCEPTED state. The same-order, exact-unit and available-balance checks are repeated at submit." actions={<LinkButton href="/dispatch" variant="secondary"><ArrowLeft size={14}/> Dispatch desk</LinkButton>} meta={<><Tag>RECORDER · {user?.name}</Tag><Tag>LIVE DISPATCH</Tag></>} /><div className="two-pane"><form className="stack" onSubmit={submit}><Card title="1 · Choose order and truck"><div className="form-grid"><Field label="Order"><SelectInput value={orderCode} onChange={(event) => changeOrder(event.target.value)}>{orders.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.buyer}</option>)}</SelectInput></Field><Field label="Vehicle / transport reference"><TextInput value={vehicle} onChange={(event) => setVehicle(event.target.value)} required/></Field><Field label="Planned load time"><TextInput type="datetime-local" value={plannedAt} onChange={(event) => setPlannedAt(event.target.value)} required/></Field><Field label="Buyer balance"><TextInput value={order ? formatQty(order.available, order.unit, 1) : "—"} readOnly/></Field></div></Card><Card title="2 · Pick accepted rolls" action={<Tag>{eligible.length} eligible</Tag>}><DataTable headers={["Pick", "Roll", "Colour / lot", "Qty", "Dispatch Qty", "Location", "State"]} rows={eligible.map((roll) => [<input aria-label={`Select ${roll.code}`} type="checkbox" checked={Object.hasOwn(selected, roll.id)} onChange={() => toggle(roll.id, String(roll.qty))} style={{ width: 20, height: 20 }}/>, <Link href={`/rolls/${roll.code}`} className="code">{roll.code}</Link>, `${roll.colour} · ${roll.dyeLot}`, formatQty(roll.qty,roll.unit,1), Object.hasOwn(selected, roll.id) ? <TextInput type="number" step="0.1" max={String(roll.qty)} value={selected[roll.id]} onChange={(e) => updateQty(roll.id, e.target.value)} style={{ width: "100px" }} /> : "—", roll.location, <StatusBadge status={roll.status}/>])} empty={<EmptyState title="No accepted rolls for this order" detail="Complete inspection and create accepted finished stock first."/>}/><div className="info-strip info-strip--warning"><ShieldAlert size={17}/><div><strong>Allocation check</strong><div>{chosen.length} selected · {formatQty(total.toFixed(3),order?.unit ?? "M",1)} · available {order ? formatQty(order.available,order.unit,1) : "—"} · {withinBalance ? "within balance" : "exceeds available"}</div></div></div></Card><div className="form-actions"><span className="field__hint">Shipments are verified and issued directly to database.</span><Button type="submit" size="lg" disabled={busy || !selectionValid || !hasPermission(user,"dispatch.create")}>{busy ? "Creating…" : "Create draft shipment"} <ArrowRight size={16}/></Button></div></form><aside className="stack sticky-summary"><Card title="Load preview"><Kicker>Selected rolls</Kicker><strong style={{ display: "block", marginTop: 8, font: "900 28px var(--font-display)" }}>{chosen.length}</strong><div className="num" style={{ fontSize: 19, marginTop: 3 }}>{formatQty(total.toFixed(3),order?.unit ?? "M",1)}</div><div className="stack-sm" style={{ marginTop: 12 }}>{chosen.map((roll) => <div className="permission-note" key={roll.id}><Link className="code" href={`/rolls/${roll.code}`}>{roll.code}</Link><span className="cell-secondary">{roll.orderCode} · {formatQty(selected[roll.id] || "0",roll.unit,1)} {Number(selected[roll.id]) < Number(roll.qty) && "(Partial)"}</span></div>)}</div>{chosen.length === 0 && <p className="cell-secondary">Select rolls to prepare a load.</p>}</Card><Card title="Policy notes"><InfoStrip tone="info">The server should create the shipment and reserve rolls atomically, with idempotency, state checks, same-order validation, unit checks, and remaining-tolerance check. For partial dispatch, remaining quantity is returned as an offcut.</InfoStrip><InfoStrip tone="warning">After creation, reload before confirmation. The list of reserved rolls must still match this draft; don&apos;t optimistically show dispatched status.</InfoStrip></Card></aside></div></>;
}

function FinishedStockPage() {
  const { data, user } = useDemo();
  const accepted = data.rolls.filter((roll) => roll.status === "ACCEPTED");
  const groups = data.orders.map((order) => ({ order, rolls: accepted.filter((roll) => roll.orderCode === order.code), qty: accepted.filter((roll) => roll.orderCode === order.code).reduce((sum, roll) => sum.plus(roll.qty), new Decimal(0)) })).filter((group) => group.rolls.length > 0);
  return <><PageHeader eyebrow="Warehouse · finished goods" title="Finished stock" description="Only ACCEPTED rolls are dispatch-eligible. Reservations and prior failures are visible and excluded from pick lists." actions={<LinkButton href="/dispatch" variant="secondary"><ArrowLeft size={14}/> Dispatch desk</LinkButton>} /><Card title="Accepted rolls by order"><DataTable headers={["Order", "Buyer", "Accepted rolls", "Eligible quantity", "Order balance", "Create load"]} rows={groups.map(({ order, rolls, qty }) => [<Link className="code" href={`/orders/${order.id}`}>{order.code}</Link>, order.buyer, rolls.length, formatQty(qty.toFixed(3),order.unit,1), formatQty(order.available,order.unit,1), hasPermission(user, "dispatch.create") ? <Link href={`/dispatch/new?order=${encodeURIComponent(order.code)}`} className="btn btn--primary btn--sm">Allocate <ArrowRight size={12}/></Link> : <span className="field__hint">dispatch.create required</span>])}/></Card><Card title="Pickable roll list"><DataTable headers={["Roll", "Order", "Shade", "Qty", "Current location", "QC state"]} rows={accepted.map((roll) => [<Link className="code" href={`/rolls/${roll.code}`}>{roll.code}</Link>, roll.orderCode, `${roll.colour} · ${roll.dyeLot}`, formatQty(roll.qty,roll.unit,1), roll.location, <StatusBadge status={roll.status}/>])}/></Card><InfoStrip tone="warning">Rework, quarantined, rejected, waiting inspection, already-reserved, and previously-dispatched rolls are not listed as eligible finished stock.</InfoStrip></>;
}

function ShipmentPage({ id }: { id: string }) {
  const { data, act, toast, user } = useDemo();
  const [busy, setBusy] = useState(false);
  const shipment = data.shipments.find((candidate) => candidate.id === id || candidate.code === id);
  if (!shipment) return <><PageHeader title="Shipment not found"/><EmptyState title="No shipment record" action={<LinkButton href="/dispatch">Dispatch desk</LinkButton>}/></>;
  const shipmentId = shipment.id;
  const rolls = (shipment.rollIds ?? []).map((rollId) => data.rolls.find((roll) => roll.id === rollId)).filter((roll): roll is FabricRoll => Boolean(roll));
  const valid = rolls.length === shipment.rolls && rolls.length > 0 && rolls.every((roll) => roll.status === "RESERVED" && roll.orderCode === shipment.orderCode && roll.unit === shipment.unit);
  async function confirm() { 
    if (!valid) { toast("Load no longer matches", "Refresh the reserved roll list and correct the draft before confirming.", "error"); return; } 
    if (!hasPermission(user, "dispatch.confirm")) { toast("Dispatch confirmation is read-only", "This action requires dispatch.confirm.", "error"); return; } 
    
    setBusy(true); 
    try {
      const res = await fetch("/api/dispatch/confirm", {
        method: "POST",
        body: JSON.stringify({
          shipmentId: shipmentId,
          actor: user?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        toast("Shipment Confirmed", `Shipment ${shipment.code} has been dispatched.`, "success");
        window.location.reload();
      } else {
        toast("Confirmation failed", data.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setBusy(false); 
    }
  }
  return <><PageHeader eyebrow="Load the truck · dispatch confirmation" title={shipment.code} description={`${shipment.orderCode} · ${shipment.buyer}`} actions={<><LinkButton href="/dispatch" variant="secondary"><ArrowLeft size={14}/> Dispatch desk</LinkButton><LinkButton href={`/print/dispatch/${shipment.id}`} variant="quiet"><Printer size={14}/> Print note</LinkButton></>} meta={<><StatusBadge status={shipment.status}/><Tag>{formatQty(shipment.qty,shipment.unit,1)}</Tag></>} /><div className="two-pane"><div className="stack"><Card title="Reserved load list"><DataTable headers={["Roll", "Order", "Colour / dye", "Quantity", "Current state"]} rows={rolls.map((roll) => [<Link href={`/rolls/${roll.code}`} className="code">{roll.code}</Link>, roll.orderCode, `${roll.colour} · ${roll.dyeLot}`, formatQty(roll.qty,roll.unit,1), <StatusBadge status={roll.status}/>])} empty={<EmptyState title="No roll membership attached" detail="This historic sample shipment has no selected rolls; create a new load to exercise the validated flow." action={<LinkButton href="/dispatch/new">Build a shipment</LinkButton>}/>} /></Card><Card title="Confirmation"><InfoStrip tone={shipment.status === "DRAFT" ? "warning" : "success"} title={shipment.status === "DRAFT" ? "Draft — not dispatched." : "Dispatch state recorded."}>{shipment.status === "DRAFT" ? "The final confirmation revalidates that every listed roll is reserved, accepted earlier, belongs to this order, and retains the same unit." : "The preview staged this state in memory only. A non-statutory demo invoice reference is not an external record."}</InfoStrip><div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{shipment.status === "DRAFT" && <Button size="lg" disabled={busy || !valid || !hasPermission(user,"dispatch.confirm")} onClick={confirm}><Truck size={17}/>{busy ? "Confirming…" : "Confirm dispatch · demo"}</Button>}{shipment.status === "DISPATCHED" && <StatusBadge status="DISPATCHED" label="Confirmed · demo state"/>}<span className="field__hint">Demo invoice reference: {shipment.invoice ?? "not issued"}</span>{hasPermission(user, "finance.read") ? <span className="field__hint">Amount: {shipment.amount ? formatMoney(shipment.amount) : "not calculated"}</span> : <span className="field__hint">Amount restricted · finance.read required</span>}</div></Card></div><aside className="stack sticky-summary"><Card title="Truck and shipment"><DataTable headers={["Field", "Value"]} rows={[["Planned",formatDateTime(shipment.plannedAt)],["Vehicle",shipment.vehicle || "Not recorded"],["Order",<Link href={`/orders/${encodeURIComponent(shipment.orderCode)}`}>{shipment.orderCode}</Link>],["Roll count",String(shipment.rolls)],["Load quantity",formatQty(shipment.qty,shipment.unit,1)],["Invoice",shipment.invoice ?? "Not issued"],["Total amount",hasPermission(user, "finance.read") ? (shipment.amount ? formatMoney(shipment.amount) : "Basis unavailable") : "Restricted · finance.read"]]}/></Card><Thread orientation="vertical" stages={[{key:"accepted",label:"Roll accepted by QC",state:shipment.status === "DRAFT" ? "done" : "done"},{key:"reserved",label:"Reserved to shipment",state:shipment.status === "DRAFT" ? "current" : "done"},{key:"dispatch",label:"Truck departed",state:shipment.status === "DISPATCHED" ? "done" : "todo"},{key:"invoice",label:"Invoice linked",state:shipment.invoice ? "done" : "todo"}]}/></aside></div></>;
}

function PrintDispatchPage({ id }: { id: string }) {
  const { data, user } = useDemo();
  const shipment = data.shipments.find((candidate) => candidate.id === id || candidate.code === id);
  if (!shipment) return <><PageHeader title="Dispatch note unavailable"/><EmptyState title="No shipment"/></>;
  const rolls = (shipment.rollIds ?? []).map((rollId) => data.rolls.find((roll) => roll.id === rollId)).filter((roll): roll is FabricRoll => Boolean(roll));
  return <><PageHeader eyebrow="Print / review" title="Dispatch note" description="Preview artifact only — not an official tax invoice or legal dispatch record." actions={<Button variant="secondary" onClick={() => window.print()}><Printer size={14}/> Print</Button>} /><section className="print-page"><div className="print-heading"><div><span className="kicker">Everest Textile Mills</span><h1 style={{ font: "900 28px var(--font-display)" }}>Dispatch note · DEMO</h1><p>DO NOT USE AS TAX INVOICE</p></div><div style={{ textAlign: "right" }}><strong className="code">{shipment.code}</strong><p>{formatDate(shipment.plannedAt)}</p><StatusBadge status={shipment.status}/></div></div><div className="page-grid" style={{ marginTop: 20 }}><div className="col-6"><strong>Ship to</strong><p>{shipment.buyer}<br/>Buyer reference: {shipment.orderCode}</p></div><div className="col-6"><strong>Transport</strong><p>{shipment.vehicle || "Not recorded"}<br/>Demo reference: {shipment.invoice ?? "Not issued"}</p></div></div><table className="print-table"><thead><tr><th>Roll code</th><th>Order</th><th>Shade / lot</th><th>Quantity</th><th>QC state</th></tr></thead><tbody>{rolls.map((roll) => <tr key={roll.id}><td>{roll.code}</td><td>{roll.orderCode}</td><td>{roll.colour} / {roll.dyeLot}</td><td>{formatQty(roll.qty,roll.unit,1)}</td><td>{roll.status}</td></tr>)}</tbody></table><p><strong>Total:</strong> {shipment.rolls} rolls · {formatQty(shipment.qty,shipment.unit,1)}{user?.permissions.includes("finance.read") ? ` · amount basis ${shipment.amount ? formatMoney(shipment.amount) : "not calculated"}` : " · amount restricted · finance.read required"}</p><div className="signature-row"><span>Prepared by</span><span>Gate pass checked</span><span>Received by buyer</span></div></section></>;
}

function PrintRollTagPage({ id }: { id: string }) {
  const { data } = useDemo();
  const roll = data.rolls.find((candidate) => candidate.id === id || candidate.code === id);
  if (!roll) return <><PageHeader title="Roll tag unavailable"/><EmptyState title="No roll"/></>;
  return <><PageHeader eyebrow="Print / review" title="Roll tag" description="Demo label; a public QR is intentionally disabled until the backend issues a signed opaque token." actions={<Button variant="secondary" onClick={() => window.print()}><Printer size={14}/> Print</Button>} /><div className="print-page" style={{ maxWidth: 460, border: "3px solid #111" }}><div className="print-heading"><BrandMark/><StatusBadge status={roll.status}/></div><h1 style={{ font: "900 29px var(--font-mono)" }}>{roll.code}</h1><div className="page-grid"><div className="col-6"><strong>Order</strong><p>{roll.orderCode}</p></div><div className="col-6"><strong>Quantity</strong><p>{formatQty(roll.qty,roll.unit,1)}</p></div><div className="col-6"><strong>Colour</strong><p>{roll.colour}</p></div><div className="col-6"><strong>Dye lot</strong><p>{roll.dyeLot}</p></div><div className="col-6"><strong>Machine</strong><p>{roll.machineCode}</p></div><div className="col-6"><strong>Location</strong><p>{roll.location}</p></div></div><p className="code">PUBLIC QR · NOT ENABLED IN DEMO · SIGNED TOKEN REQUIRED</p></div></>;
}
