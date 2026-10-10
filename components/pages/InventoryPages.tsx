"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ClipboardPlus, FileCheck2, History, PackagePlus, Plus, Search } from "lucide-react";
import Decimal from "decimal.js";
import { useDemo } from "@/lib/demo/context";
import { EvidencePicker } from "@/components/ui/EvidencePicker";
import { hasPermission } from "@/lib/auth/permissions";
import { formatDateTime, formatMoney, formatQty } from "@/lib/domain/format";
import { Button, Card, DataTable, EmptyState, Field, InfoStrip, LinkButton, PageHeader, SelectInput, StatCard, StatusBadge, Tag, TextArea, TextInput } from "@/components/ui/primitives";
import type { YarnItem } from "@/lib/domain/types";
import { adjustmentRequestSchema } from "@/lib/domain/schemas";

export function InventoryRoute({ path, id }: { path: string; id?: string }) {
  if (path === "/inventory/receive") return <YarnReceiptPage/>;
  if (path.startsWith("/inventory/batches/")) return <BatchPage id={id ?? ""}/>;
  if (path === "/inventory/reservations") return <ReservationsPage/>;
  if (path === "/inventory/adjustments") return <AdjustmentPage/>;
  if (path === "/inventory/movements") return <MovementsPage/>;
  return <InventoryPage/>;
}

function InventoryPage() {
  const { data, user } = useDemo();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => data.yarnItems.filter((item) => `${item.code} ${item.description} ${item.colour}`.toLowerCase().includes(query.toLowerCase())), [data.yarnItems, query]);
  const totals = [...new Set(data.yarnItems.map((item) => item.unit))].map((unit) => ({ unit, onHand: data.yarnItems.filter((item) => item.unit === unit).reduce((sum, item) => sum.plus(item.onHand), new Decimal(0)), reserved: data.yarnItems.filter((item) => item.unit === unit).reduce((sum, item) => sum.plus(item.reserved), new Decimal(0)), available: data.yarnItems.filter((item) => item.unit === unit).reduce((sum, item) => sum.plus(item.available), new Decimal(0)), held: data.yarnItems.filter((item) => item.unit === unit).reduce((sum, item) => sum.plus(item.held), new Decimal(0)) }));
  const totalFor = (key: "onHand" | "reserved" | "available" | "held") => totals.map((total) => formatQty(total[key].toFixed(3), total.unit, 1)).join(" · ") || "0";
  return <>
    <PageHeader eyebrow="Make & move · yarn store" title="Yarn inventory" description="Physical on-hand, reserved, available, and held stay separate. Quantities are batch-aware and displayed in each item's unit." actions={<><LinkButton href="/inventory/movements" variant="secondary"><History size={14}/> Movement ledger</LinkButton>{hasPermission(user, "inventory.receive") && <LinkButton href="/inventory/receive" variant="primary"><PackagePlus size={14}/> Receive yarn</LinkButton>}</>} meta={<><Tag>WH-YARN · DEMO</Tag><Tag>5 MATERIAL ITEMS</Tag></>} />
    <div className="stat-grid"><div className="stat-card stat-card--cotton"><div className="stat-card__top">On hand · by unit</div><strong>{totalFor("onHand")}</strong><div className="stat-card__bottom">physical accepted + held</div></div><div className="stat-card stat-card--indigo"><div className="stat-card__top">Reserved · by unit</div><strong>{totalFor("reserved")}</strong><div className="stat-card__bottom">linked to plans</div></div><div className="stat-card stat-card--neem"><div className="stat-card__top">Available · by unit</div><strong>{totalFor("available")}</strong><div className="stat-card__bottom">usable for new plans</div></div><div className="stat-card stat-card--turmeric"><div className="stat-card__top">Held · by unit</div><strong>{totalFor("held")}</strong><div className="stat-card__bottom">not available to reserve</div></div></div>
    <div className="filter-row"><label className="search-box"><Search size={14}/><input aria-label="Search yarn items" placeholder="Search code, description, colour…" value={query} onChange={(event) => setQuery(event.target.value)}/></label><LinkButton href="/inventory/reservations" variant="secondary" size="sm">Reservations</LinkButton>{hasPermission(user, "inventory.adjust_request") && <LinkButton href="/inventory/adjustments" variant="secondary" size="sm">Adjustment requests</LinkButton>}</div>
    <Card title="Yarn items" action={<Tag>{filtered.length} items</Tag>}><DataTable headers={["Code / description", "Colour", "On hand", "Reserved", "Available", "Held", "Reorder", "Batches"]} rows={filtered.map((item) => { const low = new Decimal(item.available).lt(item.reorderLevel); const batches = data.yarnBatches.filter((batch) => batch.itemCode === item.code); return [<div><span className="cell-primary code">{item.code}</span><span className="cell-secondary">{item.description}</span></div>, item.colour, <span className="num">{formatQty(item.onHand, item.unit, 1)}</span>, <span className="num">{formatQty(item.reserved, item.unit, 1)}</span>, <span className="num" style={{ color: low ? "var(--madder)" : "inherit", fontWeight: low ? 900 : 700 }}>{formatQty(item.available, item.unit, 1)}</span>, <span className="num">{formatQty(item.held, item.unit, 1)}</span>, <div><span className="num">{formatQty(item.reorderLevel, item.unit, 1)}</span>{low && <div><StatusBadge status="HIGH" label="Below reorder"/></div>}</div>, <Link className="btn btn--quiet btn--sm" href={`/inventory/batches/${batches[0]?.id ?? "batch-01"}`}>{batches.length} lots <ArrowRight size={12}/></Link>]; })} empty={<EmptyState title="No yarn item matches" detail="Adjust the search phrase."/>}/></Card>
    <InfoStrip title="Balance logic" tone="info">Available is not on hand. Reservations belong to production plans; held quantity is excluded from available. Yarn quantities are in KG and are not compared with order length (M).</InfoStrip>
  </>;
}

function YarnReceiptPage() {
  const { data, act, toast, user } = useDemo();
  type ReceiptLine = { id: string; itemCode: string; docketQty: string; received: string; accepted: string; damaged: string; held: string; unitCost: string; acceptedManual: boolean };
  const newLine = (id: string, itemCode: string): ReceiptLine => ({ id, itemCode, docketQty: "100.000", received: "100.000", accepted: "94.000", damaged: "2.000", held: "4.000", unitCost: "", acceptedManual: false });
  const parseQty = (value: string): Decimal | null => {
    if (!/^\d{1,11}(\.\d{1,3})?$/.test(value)) return null;
    try { const parsed = new Decimal(value); return parsed.isFinite() ? parsed : null; } catch { return null; }
  };
  const [lines, setLines] = useState<ReceiptLine[]>([newLine("line-1", data.yarnItems[0]?.code ?? "")]);
  const [supplier, setSupplier] = useState("Karnataka Spinners");
  const [supplierLot, setSupplierLot] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [location, setLocation] = useState("WH-YARN-A1");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const canReceive = hasPermission(user, "inventory.receive");

  const validation = lines.map((line) => {
    const item = data.yarnItems.find((candidate) => candidate.code === line.itemCode);
    const docket = parseQty(line.docketQty);
    const received = parseQty(line.received);
    const accepted = parseQty(line.accepted);
    const damaged = parseQty(line.damaged);
    const held = parseQty(line.held);
    const balanced = Boolean(received && accepted && damaged && held && accepted.plus(damaged).plus(held).eq(received));
    const variance = Boolean(docket && received && !docket.eq(received));
    const costValid = !line.unitCost || /^\d{1,12}(\.\d{1,4})?$/.test(line.unitCost);
    return { line, item, docket, received, accepted, damaged, held, balanced, variance, valid: Boolean(item && docket?.gt(0) && received?.gt(0) && accepted && damaged && held && accepted.plus(damaged).plus(held).eq(received) && costValid) };
  });
  const allLinesValid = validation.length > 0 && validation.every((line) => line.valid);
  const hasVariance = validation.some((line) => line.variance);
  const varianceReasonValid = !hasVariance || reason.trim().length >= 5;
  const canPost = Boolean(canReceive && allLinesValid && supplier.trim() && supplierLot.trim() && location.trim() && receivedAt && !Number.isNaN(new Date(receivedAt).getTime()) && varianceReasonValid && notes.length <= 500 && !busy);

  function updateLine(id: string, changes: Partial<ReceiptLine>) {
    setLines((current) => current.map((line) => {
      if (line.id !== id) return line;
      const next = { ...line, ...changes };
      if (Object.hasOwn(changes, "accepted")) next.acceptedManual = true;
      else if (!line.acceptedManual && ["received", "damaged", "held"].some((key) => Object.hasOwn(changes, key))) {
        const received = parseQty(next.received) ?? new Decimal(0);
        const damaged = parseQty(next.damaged) ?? new Decimal(0);
        const held = parseQty(next.held) ?? new Decimal(0);
        next.accepted = Decimal.max(0, received.minus(damaged).minus(held)).toFixed(3);
      }
      return next;
    }));
  }

  function fillRemainder(id: string) {
    setLines((current) => current.map((line) => {
      if (line.id !== id) return line;
      const received = parseQty(line.received) ?? new Decimal(0);
      const damaged = parseQty(line.damaged) ?? new Decimal(0);
      const held = parseQty(line.held) ?? new Decimal(0);
      return { ...line, accepted: Decimal.max(0, received.minus(damaged).minus(held)).toFixed(3), acceptedManual: false };
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReceive) { toast("Receiving is not available", "This action requires inventory.receive.", "error"); return; }
    if (!allLinesValid) { toast("Receipt quantities do not balance", "Every received amount must equal accepted + damaged + held, exactly and in the item's unit.", "error"); return; }
    if (hasVariance && reason.trim().length < 5) { toast("Supplier docket variance needs a reason", "Add at least five characters before posting the receipt.", "error"); return; }
    if (!receivedAt || Number.isNaN(new Date(receivedAt).getTime())) { toast("Receipt date and time required", "Enter the physical date and time shown by the receiving record.", "error"); return; }
    setBusy(true);
    const response = await act("receive-yarn", {
      commandKey: idempotencyKey,
      supplier,
      supplierLot,
      location,
      orderCode,
      receivedAt: new Date(receivedAt).toISOString(),
      notes,
      lines: lines.map(({ itemCode, received, accepted, damaged, held, unitCost }) => ({ itemCode, received, accepted, damaged, held, unitCost })),
    });
    setBusy(false);
    if (response.ok) {
      setSupplierLot("");
      setReason("");
      setNotes("");
      setReceivedAt("");
      setLines([newLine(`line-${crypto.randomUUID()}`, data.yarnItems[0]?.code ?? "")]);
      setIdempotencyKey(crypto.randomUUID());
    }
  }

  const byUnit = validation.reduce((totals, row) => {
    if (!row.item || !row.accepted || !row.held) return totals;
    const current = totals.get(row.item.unit) ?? { accepted: new Decimal(0), held: new Decimal(0) };
    current.accepted = current.accepted.plus(row.accepted);
    current.held = current.held.plus(row.held);
    totals.set(row.item.unit, current);
    return totals;
  }, new Map<string, { accepted: Decimal; held: Decimal }>());

  return <>
    <PageHeader eyebrow="Gatehouse · stock receipt" title="Receive yarn" description="Record the physical receipt, reconcile the supplier docket, and keep every disposition in the item's unit." actions={<LinkButton href="/inventory" variant="secondary"><ArrowLeft size={14}/> Inventory</LinkButton>} meta={<Tag>Floor flow · large controls</Tag>} />
    <div className="two-pane"><form className="card stack" onSubmit={submit}>
      <div className="card__head"><h2>1 · Supplier docket</h2><StatusBadge status={canReceive ? "DRAFT" : "FORBIDDEN"} label={canReceive ? "Receipt draft" : "Read-only"}/></div>
      <div className="form-grid"><Field label="Supplier"><TextInput value={supplier} onChange={(event) => setSupplier(event.target.value)} required/></Field><Field label="Supplier lot / challan"><TextInput value={supplierLot} onChange={(event) => setSupplierLot(event.target.value)} placeholder="Supplier batch ID" required/></Field><Field label="Physical receipt date and time"><TextInput type="datetime-local" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} required/></Field><Field label="Put-away location"><TextInput value={location} onChange={(event) => setLocation(event.target.value)} required/></Field><Field label="Intended order · optional" hint="This tag does not reserve or allocate the yarn."><SelectInput value={orderCode} onChange={(event) => setOrderCode(event.target.value)}><option value="">No intended order</option>{data.orders.map((order) => <option key={order.id} value={order.code}>{order.code} · {order.buyer}</option>)}</SelectInput></Field></div>
      <div className="card__head" style={{ marginTop: 14 }}><h2>2 · Reconcile repeatable yarn lines</h2><span className="field__hint">Received = accepted + damaged + held, exact to 0.001.</span></div>
      {lines.map((line, index) => {
        const item = data.yarnItems.find((candidate) => candidate.code === line.itemCode);
        const check = validation[index];
        const unit = item?.unit ?? "KG";
        return <section className="receipt-line" key={line.id} aria-labelledby={`receipt-line-${line.id}`}>
          <div className="card__head"><h3 id={`receipt-line-${line.id}`}>Line {index + 1} · {item?.code ?? "Select yarn"}</h3><div className="action-row">{check?.balanced ? <StatusBadge status="AVAILABLE" label="Reconciled"/> : <StatusBadge status="QUARANTINED" label="Balance required"/>}{lines.length > 1 && <Button type="button" variant="quiet" onClick={() => setLines((current) => current.filter((row) => row.id !== line.id))}>Remove line</Button>}</div></div>
          <div className="form-grid"><Field label="Yarn item"><SelectInput value={line.itemCode} onChange={(event) => updateLine(line.id, { itemCode: event.target.value })}>{data.yarnItems.map((candidate) => <option key={candidate.code} value={candidate.code}>{candidate.code} · {candidate.description}</option>)}</SelectInput></Field><Field label={`Supplier docket · ${unit}`}><TextInput inputMode="decimal" pattern="\d+(\.\d{1,3})?" value={line.docketQty} onChange={(event) => updateLine(line.id, { docketQty: event.target.value })} required/></Field><Field label={`Physical received · ${unit}`}><TextInput inputMode="decimal" pattern="\d+(\.\d{1,3})?" value={line.received} onChange={(event) => updateLine(line.id, { received: event.target.value })} required/></Field></div>
          <div className="form-grid form-grid--3"><Field label={`Accepted · ${unit}`}><TextInput inputMode="decimal" pattern="\d+(\.\d{1,3})?" value={line.accepted} onChange={(event) => updateLine(line.id, { accepted: event.target.value })} required/><Button type="button" variant="quiet" size="sm" onClick={() => fillRemainder(line.id)}>Use received less damaged and held</Button></Field><Field label={`Damaged · ${unit}`}><TextInput inputMode="decimal" pattern="\d+(\.\d{1,3})?" value={line.damaged} onChange={(event) => updateLine(line.id, { damaged: event.target.value })} required/></Field><Field label={`Held / quarantine · ${unit}`}><TextInput inputMode="decimal" pattern="\d+(\.\d{1,3})?" value={line.held} onChange={(event) => updateLine(line.id, { held: event.target.value })} required/></Field></div>
          <div className="form-grid"><Field label={`Unit cost · INR / ${unit}`} hint="Optional. Blank stays missing; it is never treated as zero."><TextInput inputMode="decimal" pattern="\d+(\.\d{1,4})?" value={line.unitCost} onChange={(event) => updateLine(line.id, { unitCost: event.target.value })} placeholder="Missing"/></Field></div>
          {check?.variance && <InfoStrip tone="warning">Physical received quantity differs from the supplier docket. A reason of at least five characters is required.</InfoStrip>}
        </section>;
      })}
      <Button type="button" variant="secondary" onClick={() => setLines((current) => [...current, newLine(`line-${crypto.randomUUID()}`, data.yarnItems[0]?.code ?? "")])}><Plus size={15}/> Add yarn line</Button>
      <div className="info-strip" role="status" aria-live="polite" style={{ background: allLinesValid ? "var(--neem-soft)" : "var(--madder-soft)" }}><FileCheck2 size={17}/><div><strong>{allLinesValid ? "All receipt lines reconcile" : "Receipt total does not balance"}</strong><div>{lines.length} line{lines.length === 1 ? "" : "s"} · quantities are balanced per item and unit, not across units.</div></div></div>
      <div className="form-grid"><Field label="Reason / supplier discrepancy" hint="Required when any physical quantity differs from its supplier docket."><TextArea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What explains the variance?" minLength={hasVariance ? 5 : undefined} required={hasVariance}/></Field><Field label="Receipt notes" hint="Optional · 500 characters maximum."><TextArea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Handling, seal, or inspection notes…"/></Field></div>
      <EvidencePicker label="Receipt evidence"/>
      <div className="form-actions"><div className="field__hint">Recorded by {user?.name ?? "no active user"} · batch & movement rows are append-only.</div><Button type="submit" size="lg" disabled={!canPost}><PackagePlus size={17}/>{busy ? "Staging…" : "Record receipt · demo"}</Button></div>
    </form>
    <aside className="stack sticky-summary"><Card title="What changes when recorded"><div className="stack-sm"><div className="permission-note"><strong>Accepted quantity</strong><span className="cell-secondary">Adds to available and on-hand; eligible for plan reservation after quality is clear.</span></div><div className="permission-note"><strong>Held quantity</strong><span className="cell-secondary">Adds to on-hand and held; not to available.</span></div><div className="permission-note"><strong>Damaged quantity</strong><span className="cell-secondary">Recorded in the receipt disposition; not counted as usable stock.</span></div>{Array.from(byUnit.entries()).map(([unit, totals]) => <div key={unit}><h3 className="cell-primary">This draft · {unit}</h3><span className="num">{formatQty(totals.accepted.toFixed(3), unit as YarnItem["unit"], 1)} accepted · {formatQty(totals.held.toFixed(3), unit as YarnItem["unit"], 1)} held</span></div>)}<InfoStrip tone="warning">A live request needs an Idempotency-Key so retries cannot create a second receipt. This frontend action remains session-only.</InfoStrip></div></Card><Card title="Separation of duties"><InfoStrip tone="info">A different person with inventory.adjust_approve must approve an adjustment request. This receipt&apos;s physical count remains append-only.</InfoStrip><CanReceivePermission/></Card></aside></div>
  </>;
}

function CanReceivePermission() {
  const { user } = useDemo();
  const can = hasPermission(user, "inventory.receive");
  return <div className="permission-note">{can ? "This demo role has inventory.receive." : "Receiving requires inventory.receive."}</div>;
}

function BatchPage({ id }: { id: string }) {
  const { data } = useDemo();
  const batch = data.yarnBatches.find((candidate) => candidate.id === id || candidate.code === id);
  if (!batch) return <><PageHeader title="Yarn batch not found"/><EmptyState title="No lot record" action={<LinkButton href="/inventory">Return to inventory</LinkButton>}/></>;
  const item = data.yarnItems.find((candidate) => candidate.code === batch.itemCode);
  return <><PageHeader eyebrow="Batch genealogy" title={batch.code} description={`${batch.supplier} · supplier lot ${batch.supplierLot}`} actions={<LinkButton href="/inventory" variant="secondary"><ArrowLeft size={14}/> Inventory</LinkButton>} meta={<StatusBadge status={batch.status}/>} /><div className="stat-grid"><StatCard label="On hand" value={formatQty(batch.onHand, batch.unit, 1)}/><StatCard label="Reserved" value={formatQty(batch.reserved, batch.unit, 1)} tone="indigo"/><StatCard label="Available" value={formatQty(batch.available, batch.unit, 1)} tone="neem"/><StatCard label="Held" value={formatQty(batch.held, batch.unit, 1)} tone="turmeric"/></div><div className="page-grid"><Card className="col-7" title="Batch record"><DataTable headers={["Field", "Recorded value"]} rows={[["Yarn item", <Link href={`/inventory?item=${encodeURIComponent(batch.itemCode)}`} className="code">{batch.itemCode}</Link>],["Description", item?.description ?? "Unknown item"],["Supplier lot", batch.supplierLot],["Received at", formatDateTime(batch.receivedAt)],["Put-away location", batch.location],["Unit cost basis", batch.unitCost === null ? <StatusBadge status="MISSING" label="Missing"/> : formatMoney(batch.unitCost)], ["Reservation", batch.orderCode ? <Link href={`/orders/${encodeURIComponent(batch.orderCode)}`}>{batch.orderCode}</Link> : "Unreserved"]]}/></Card><Card className="col-5" title="Immutable stock movement"><InfoStrip tone="info">Receipt, reservation, issue, adjustment, and reversal are distinct ledger events. No edit/delete control is available here.</InfoStrip><LinkButton href="/inventory/movements" variant="secondary"><History size={15}/> Movement ledger</LinkButton></Card></div></>;
}

function ReservationsPage() {
  const { data } = useDemo();
  const rows = data.yarnBatches.filter((batch) => new Decimal(batch.reserved).gt(0));
  return <><PageHeader eyebrow="Production material allocation" title="Reservations" description="Reserved amounts remain assigned to their plan/order. They are not available to a second plan." actions={<LinkButton href="/inventory" variant="secondary"><ArrowLeft size={14}/> Inventory</LinkButton>} /><Card title="Open reservations"><DataTable headers={["Batch / item", "Plan or order", "Reserved", "Available in batch", "Status"]} rows={rows.map((batch) => [<Link className="cell-primary code" href={`/inventory/batches/${batch.id}`}>{batch.code}</Link>, batch.orderCode ? <Link href={`/orders/${encodeURIComponent(batch.orderCode)}`}>{batch.orderCode}</Link> : "No link in sample", formatQty(batch.reserved,batch.unit,1), formatQty(batch.available,batch.unit,1), <StatusBadge status={batch.status}/>])}/></Card><InfoStrip tone="warning" title="No implicit release.">Changing or cancelling a plan does not silently return a reservation; the backend must record a separate release or reversal with actor and reason.</InfoStrip></>;
}

function AdjustmentPage() {
  const { user, toast, data } = useDemo();
  const [itemCode, setItemCode] = useState("YN-30-WHT");
  const [delta, setDelta] = useState("-5.000");
  const [reason, setReason] = useState("");
  const [staged, setStaged] = useState(false);
  const item = data.yarnItems.find((candidate) => candidate.code === itemCode);
  function submit(event: FormEvent) { event.preventDefault(); const parsed = adjustmentRequestSchema.safeParse({ itemCode, delta, reason }); if (!parsed.success) { toast("Adjustment request needs correction", parsed.error.issues[0]?.message ?? "Review the request.", "error"); return; } if (!hasPermission(user, "inventory.adjust_request")) { toast("Adjustment request is read-only", "This action requires inventory.adjust_request.", "error"); return; } setStaged(true); toast("Adjustment request staged", "It is pending a different approver; this demo did not change stock.", "warning"); }
  return <><PageHeader eyebrow="Controlled stock correction" title="Adjustment requests" description="An adjustment is a request with a reason and second-person approval—not an editable balance." actions={<LinkButton href="/inventory" variant="secondary"><ArrowLeft size={14}/> Inventory</LinkButton>} /><div className="two-pane"><form className="card stack" onSubmit={submit}><div className="card__head"><h2>Request a correction</h2><StatusBadge status={staged ? "PENDING" : "DRAFT"}/></div><Field label="Yarn item"><SelectInput value={itemCode} onChange={(event) => setItemCode(event.target.value)}>{data.yarnItems.map((candidate) => <option key={candidate.code} value={candidate.code}>{candidate.code} · {candidate.description}</option>)}</SelectInput></Field><Field label={`Quantity delta · ${item?.unit ?? "unit"}`} hint="Signed exact decimal; the backend rejects a result below reserved stock."><TextInput inputMode="decimal" value={delta} onChange={(event) => setDelta(event.target.value)} required/></Field><Field label="Reason · at least five characters"><TextArea value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} required placeholder="Cycle count, damage, correction…"/></Field><Button type="submit" disabled={!hasPermission(user, "inventory.adjust_request")}><ClipboardPlus size={14}/> Submit for approval</Button>{staged && <InfoStrip tone="warning">Created by {user?.name}. Approval by the same user is not allowed.</InfoStrip>}</form><Card title="Current control values"><DataTable headers={["Balance", "Value"]} rows={[["On hand", item ? formatQty(item.onHand,item.unit,1) : "—"],["Reserved", item ? formatQty(item.reserved,item.unit,1) : "—"],["Available", item ? formatQty(item.available,item.unit,1) : "—"],["Held", item ? formatQty(item.held,item.unit,1) : "—"]]}/><InfoStrip tone="danger">This demo leaves stock unchanged. The actual server must lock and validate the current balance at approval.</InfoStrip></Card></div></>;
}

function MovementsPage() {
  const { data } = useDemo();
  const moves = [...data.yarnMovements].reverse();
  return <><PageHeader eyebrow="Append-only stock history" title="Yarn movement ledger" description="Each movement has its own human-readable code, batch, quantity and unit, actor, and linked reference." actions={<LinkButton href="/inventory" variant="secondary"><ArrowLeft size={14}/> Inventory</LinkButton>} /><Card title="Movement journal" action={<Tag>Append-only</Tag>}><DataTable headers={["Movement", "Kind", "Batch", "Yarn", "Quantity", "Reference", "Actor", "Recorded"]} rows={moves.map((move) => [<span className="code">{move.code}</span>, <StatusBadge status={move.kind === "RECEIPT" ? "AVAILABLE" : move.kind === "HOLD" ? "QUARANTINED" : "IN_PROGRESS"} label={move.kind}/>, <Link className="code" href={`/inventory/batches/${data.yarnBatches.find((candidate) => candidate.id === move.batchId)?.id ?? "batch-01"}`}>{move.batchCode}</Link>, <span className="code">{move.itemCode}</span>, <span className="num">{new Decimal(move.quantity).gt(0) ? "+" : ""}{formatQty(move.quantity,move.unit,1)}</span>, move.reference, move.actor, formatDateTime(move.recordedAt)])}/></Card><InfoStrip tone="info" title="No edit or delete actions.">Fixes should append a reversing movement and a new movement with linked reason; the original line remains intact.</InfoStrip></>;
}
