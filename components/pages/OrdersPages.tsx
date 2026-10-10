"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, ArrowRight, Check, CircleDollarSign, ClipboardList, FilePlus2, PackageCheck, Plus, Search, Truck } from "lucide-react";
import Decimal from "decimal.js";
import { useDemo } from "@/lib/demo/context";
import { clampPercent, formatDate, formatMoney, formatQty } from "@/lib/domain/format";
import { Button, Card, DataTable, Field, InfoStrip, Kicker, LinkButton, Meter, PageHeader, SelectInput, StatCard, StatusBadge, Tag, TextArea, TextInput } from "@/components/ui/primitives";
import { Can } from "@/components/ui/Can";
import { EmptyState } from "@/components/ui/primitives";
import type { Order } from "@/lib/domain/types";
import { orderDraftSchema } from "@/lib/domain/schemas";

export function OrdersPage() {
  const { data, user } = useDemo();
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const orders = useMemo(() => data.orders.filter((order) => {
    const needle = search.toLowerCase();
    const matches = !needle || `${order.code} ${order.buyer} ${order.product}`.toLowerCase().includes(needle);
    const stateMatches = filter === "ALL" || (filter === "AT_RISK" ? order.atRisk : order.displayStatus === filter);
    return matches && stateMatches;
  }), [data.orders, search, filter]);
  const openByUnit = [...new Set(data.orders.map((order) => order.unit))].map((unit) => formatQty(data.orders.filter((order) => order.unit === unit).reduce((sum, order) => sum.plus(order.remaining), new Decimal(0)).toFixed(3), unit, 0));
  return <>
    <PageHeader eyebrow="Make & move · customer commitment" title="Orders" description="Order quantities stay in their own unit. Track due date, production, accepted fabric, reservations, and dispatched balance without guessing." actions={<Can perm="orders.create"><LinkButton href={`${user?.role === "BUYER" ? "/buyer" : ""}/orders/new`} variant="primary"><FilePlus2 size={15}/> Create order</LinkButton></Can>} />
    <div className="stat-grid"><div className="stat-card stat-card--indigo"><div className="stat-card__top">Active orders</div><strong>{data.orders.length}</strong><div className="stat-card__bottom">all seeded examples</div></div><div className="stat-card stat-card--madder"><div className="stat-card__top">At risk</div><strong>{data.orders.filter((order) => order.atRisk).length}</strong><div className="stat-card__bottom">date or yarn readiness</div></div><div className="stat-card stat-card--neem"><div className="stat-card__top">Ready to dispatch</div><strong>{data.orders.filter((order) => order.displayStatus === "READY_FOR_DISPATCH").length}</strong><div className="stat-card__bottom">accepted rolls only</div></div><div className="stat-card stat-card--cotton"><div className="stat-card__top">Open balance</div><strong>{openByUnit.join(" · ")}</strong><div className="stat-card__bottom">each unit totals separately</div></div></div>
    <div className="filter-row" role="group" aria-label="Filter orders">{["ALL", "AT_RISK", "CONFIRMED", "IN_PRODUCTION", "READY_FOR_DISPATCH", "PLANNED"].map((item) => <button key={item} className={`filter-chip${filter === item ? " filter-chip--active" : ""}`} onClick={() => setFilter(item)}>{item.replaceAll("_", " ")}</button>)}<label className="search-box" style={{ width: 230, marginLeft: "auto" }}><Search size={14}/><input aria-label="Search orders" placeholder="Find an order…" value={search} onChange={(event) => setSearch(event.target.value)}/></label></div>
    <Card className="card--table" title="Order book" action={<Tag>{orders.length} shown</Tag>}>
      <DataTable headers={["Order / buyer", "Product", "Due", "Priority", "Production", "Accepted", "State", ""]} rows={orders.map((order) => [<div><Link href={`${user?.role === "BUYER" ? "/buyer" : user?.role === "OWNER" ? "/owner" : ""}/orders/${order.id}`} className="cell-primary code">{order.code}</Link><span className="cell-secondary">{order.buyer}</span></div>, <div><span className="cell-primary">{order.product}</span><span className="cell-secondary">{order.colour}</span></div>, <div><span className="cell-primary">{formatDate(order.due)}</span>{order.atRisk && <span className="cell-secondary" style={{ color: "var(--madder)" }}>At risk</span>}</div>, <StatusBadge status={order.priority}/>, <div style={{ minWidth: 112 }}><Meter value={order.produced} total={order.ordered} label="Produced" showNumbers={false}/><span className="cell-secondary num">{formatQty(order.produced, order.unit, 0)} / {formatQty(order.ordered, order.unit, 0)}</span></div>, formatQty(order.accepted, order.unit, 0), <StatusBadge status={order.displayStatus}/>, <Link href={`${user?.role === "BUYER" ? "/buyer" : user?.role === "OWNER" ? "/owner" : ""}/orders/${order.id}`} className="btn btn--secondary btn--sm">Open <ArrowRight size={12}/></Link>])} empty={<EmptyState title="No matching order" detail="Change filters or search for another order."/>}/>
    </Card>
    <InfoStrip tone="info" title="Quantities never cross units.">Meters (M) and kilograms (KG) have separate balances and progress bars. Yarn availability is checked independently in KG before plan release.</InfoStrip>
  </>;
}

export function NewOrderPage() {
  const { data, toast, user } = useDemo();
  const [buyer, setBuyer] = useState("Mysore House Textiles");
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [bom, setBom] = useState<any[]>([]);
  const [colour, setColour] = useState("");
  const [quantity, setQuantity] = useState("500.000");
  const [unit, setUnit] = useState<"M" | "KG">("M");
  const [due, setDue] = useState("2026-10-26");
  const [priority, setPriority] = useState("NORMAL");
  const [terms, setTerms] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Fetch product catalog on mount
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data.length > 0) {
          setProducts(resData.data);
          setProductId(resData.data[0].id);
          setProductName(resData.data[0].name);
        }
      });
  }, []);

  // Fetch BOM when product changes
  useEffect(() => {
    if (!productId) return;
    const selected = products.find(p => p.id === productId);
    if (selected) setProductName(selected.name);
    
    fetch(`/api/products/${productId}/bom`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) setBom(resData.data);
      });
  }, [productId, products]);

  // Calculate material readiness
  const orderQty = new Decimal(quantity || 0);
  let hasShortage = false;
  const materialChecks = bom.map(b => {
    const requiredTotal = new Decimal(b.quantity_required).times(orderQty);
    const yarn = data.yarnItems.find(y => y.id === b.yarn_item_id);
    const available = new Decimal(yarn?.available || 0);
    const isShort = available.lt(requiredTotal);
    if (isShort) hasShortage = true;
    return { ...b, requiredTotal, available, isShort };
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = orderDraftSchema.safeParse({ buyer, product: productName, colour, quantity, unit, due, priority, terms });
    if (!parsed.success) { toast("Order draft needs correction", parsed.error.issues[0]?.message ?? "Review the order fields.", "error"); return; }
    if (hasShortage) { toast("Material Shortage", "Cannot create order with missing yarn dependencies.", "error"); return; }
    
    setSubmitted(true);
    
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({ buyer, product: productName, colour, quantity, unit, due, priority, terms })
      });
      const data = await res.json();
      if (data.success) {
        toast("Order created", `Successfully created draft order ${data.data.code}`, "success");
        // Reload to show the new order in context
        window.location.href = user?.role === "BUYER" ? "/buyer/orders" : (user?.role === "OWNER" ? "/owner/orders" : "/orders");
      } else {
        toast("Failed to create order", data.error, "error");
        setSubmitted(false);
      }
    } catch (e: any) {
      toast("Error", e.message, "error");
      setSubmitted(false);
    }
  }
  
  return <>
    <PageHeader eyebrow="Customer commitment" title="Create an order" description="Capture the buyer's request first. Approval, material reservation, and production planning remain separate steps." actions={<LinkButton href={`${user?.role === "BUYER" ? "/buyer" : user?.role === "OWNER" ? "/owner" : ""}/orders`} variant="secondary"><ArrowLeft size={14}/> Order book</LinkButton>} />
    <div className="two-pane"><form onSubmit={submit} className="card stack"><div className="card__head"><h2>Order terms</h2><StatusBadge status="DRAFT"/></div>
      <div className="form-grid">
        <Field label="Buyer"><SelectInput value={buyer} onChange={(event) => setBuyer(event.target.value)}><option>Mysore House Textiles</option><option>Kaveri Apparel Co.</option><option>Saffron Living</option></SelectInput></Field><Field label="Requested due date"><TextInput type="date" value={due} onChange={(event) => setDue(event.target.value)} required/></Field>
        
        <Field label="Product / style (from Catalog)">
          <SelectInput value={productId} onChange={(event) => setProductId(event.target.value)} required>
            {products.length === 0 && <option value="">Loading products...</option>}
            {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Colour / shade"><TextInput value={colour} onChange={(event) => setColour(event.target.value)} required/></Field>
        
        <Field label="Order quantity"><TextInput inputMode="decimal" pattern="\d+(\.\d{1,3})?" value={quantity} onChange={(event) => setQuantity(event.target.value)} required/><span className="field__hint">Exact decimal string; no conversion from weight to length.</span></Field><Field label="Unit"><SelectInput value={unit} onChange={(event) => setUnit(event.target.value as "M" | "KG")}><option value="M">M — metres</option><option value="KG">KG — kilograms</option></SelectInput></Field>
        <Field label="Priority"><SelectInput value={priority} onChange={(event) => setPriority(event.target.value)}><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option><option value="LOW">Low</option></SelectInput></Field><Field label="Buyer reference"><TextInput placeholder="Optional purchase order number"/></Field>
        <Field label="Terms / notes" className="" hint="This note is internal in the prototype; a buyer-visible note needs an explicit API field."><TextArea value={terms} onChange={(event) => setTerms(event.target.value)} placeholder="Finish, packaging, or delivery notes…"/></Field></div>
      <div className="form-actions"><span className="field__hint">Created by {user?.name} · approval not implied</span><Button type="submit" disabled={hasShortage}><Plus size={14}/> Save draft (demo)</Button></div>
      {submitted && <InfoStrip tone="warning" title="Draft is only in this preview session.">No order was written to a database or sent for approval.</InfoStrip>}
    </form>
    <aside className="stack sticky-summary">
      <Card title="Live Material Check (BOM)">
        <div className="stack-sm">
          {bom.length === 0 ? <EmptyState title="No BOM defined" detail="This product has no yarn recipe attached to it." /> : materialChecks.map((item) => (
            <div className="permission-note" key={item.yarn_item_id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong className="code">{item.yarn_code}</strong>
                <StatusBadge status={!item.isShort ? "AVAILABLE" : "QUARANTINED"} label={!item.isShort ? "Available" : "Shortage"}/>
              </div>
              <span className="cell-secondary">{item.yarn_name}</span>
              <span className="num" style={{ color: item.isShort ? "var(--madder)" : "inherit" }}>
                {formatQty(item.requiredTotal.toFixed(3), item.unit, 1)} req / {formatQty(item.available.toFixed(3), item.unit, 1)} avail
              </span>
            </div>
          ))}
          {hasShortage && <InfoStrip tone="danger" title="Material Shortage">Order cannot be placed because the required yarn based on the product BOM is not available in inventory.</InfoStrip>}
          {!hasShortage && bom.length > 0 && <InfoStrip tone="success" title="All materials available">Yarn inventory is sufficient to fulfill this order's BOM requirements.</InfoStrip>}
        </div>
      </Card>
      <div className="permission-note"><strong>Live system boundary</strong><p className="cell-secondary">Order numbers and unit-specific material check now dynamically fetch from Supabase product definitions.</p></div>
    </aside></div>
  </>;
}

export function OrderDetailPage({ id }: { id: string }) {
  const { data, toast, user } = useDemo();
  const order = data.orders.find((item) => item.id === id || item.code === id);
  const [reason, setReason] = useState("");
  if (!order) return <><PageHeader title="Order not found" description="We could not find that demo order."/><EmptyState title="No order record" action={<LinkButton href={`${user?.role === "BUYER" ? "/buyer" : user?.role === "OWNER" ? "/owner" : ""}/orders`}>Return to order book</LinkButton>}/></>;
  const percent = clampPercent(order.produced, order.ordered);
  const costComplete = new Decimal(order.recordedCost).gt(0);
  
  async function updateStatus(status: string, displayStatus: string, stage?: string) {
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, displayStatus, stage })
      });
      const resData = await res.json();
      if (resData.success) {
        toast("Order updated", `Order ${order.code} updated`, "success");
        window.location.reload();
      } else {
        toast("Failed to update order", resData.error, "error");
      }
    } catch (e: any) {
      toast("Error", e.message, "error");
    }
  }

  return <>
    <PageHeader eyebrow="Order command page" title={order.code} description={`${order.buyer} · ${order.product} · ${order.colour}`} actions={<><LinkButton href={`${user?.role === "BUYER" ? "/buyer" : user?.role === "OWNER" ? "/owner" : ""}/orders`} variant="secondary"><ArrowLeft size={14}/> Orders</LinkButton><Can perm="finance.read"><LinkButton href="/finance" variant="secondary"><CircleDollarSign size={14}/> Cost view</LinkButton></Can></>} meta={<><StatusBadge status={order.displayStatus}/><StatusBadge status={order.priority}/><Tag>Due {formatDate(order.due)}</Tag>{order.atRisk && <StatusBadge status="HIGH" label="At risk"/>}</>} />
    {order.atRisk && <InfoStrip tone="danger" title="Commitment at risk.">Material readiness is short, due date is earlier than expected completion, or both. Review the active plan and record an owner decision.</InfoStrip>}
    <div className="stat-grid"><StatCard label="Ordered" value={formatQty(order.ordered, order.unit, 0)} detail="Buyer commitment" icon={ClipboardList}/><StatCard label="Produced" value={formatQty(order.produced, order.unit, 0)} detail={`${percent}% of requested quantity`} icon={Activity}/><StatCard label="Accepted" value={formatQty(order.accepted, order.unit, 0)} detail="QC accepted only" icon={PackageCheck} tone="neem"/><StatCard label="Available for dispatch" value={formatQty(order.available, order.unit, 0)} detail={`${order.reserved} reserved · ${order.dispatched} dispatched`} icon={Truck} tone={order.hasQualityHold ? "turmeric" : "cotton"}/></div>
    <div className="page-grid">
      <Card className="col-8" title="Thread through production"><Meter value={order.produced} total={order.ordered} label="Produced vs order quantity"/><div style={{ marginTop: 20 }}><ThreadForOrder order={order}/></div><div className="page-grid" style={{ marginTop: 20 }}><div className="col-4"><Kicker>Plan</Kicker><div className="num" style={{ fontSize: 18, marginTop: 5 }}>{formatQty(order.planned, order.unit, 0)}</div></div><div className="col-4"><Kicker>Remaining</Kicker><div className="num" style={{ fontSize: 18, marginTop: 5 }}>{formatQty(order.remaining, order.unit, 0)}</div></div><div className="col-4"><Kicker>Quality hold</Kicker><div style={{ marginTop: 6 }}><StatusBadge status={order.hasQualityHold ? "QUARANTINED" : "ACCEPTED"} label={order.hasQualityHold ? "Review required" : "Clear"}/></div></div></div></Card>
      <Card className="col-4" title="Material readiness"><div className="stack-sm">{data.yarnItems.slice(0, 3).map((item) => <div className="permission-note" key={item.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong className="code">{item.code}</strong><StatusBadge status={new Decimal(item.available).gte(100) ? "AVAILABLE" : "QUARANTINED"} label={new Decimal(item.available).gte(100) ? "Available" : "Short"}/></div><span className="cell-secondary">{item.description}</span><span className="num">{formatQty(item.available, item.unit, 1)} available / {formatQty(item.reserved, item.unit, 1)} reserved</span></div>)}{order.materialShortage && <InfoStrip tone="danger" title="Do not release a plan.">Insufficient available yarn for the approved bill of material. Do not infer conversion from metres to kilograms.</InfoStrip>}</div></Card>
      <Card className="col-6" title="Buyer and production milestones"><div className="stack-sm">{[
        ["Order raised", "2026-10-04T09:00:00Z", "done"], ["Approved", "2026-10-04T11:20:00Z", "done"], ["Material reserved", order.materialShortage ? "Shortage · not released" : "Reservation recorded", order.materialShortage ? "blocked" : "done"], ["Production", order.stage ? `${order.stage.toLowerCase()} · in progress` : "Awaiting plan", order.stage ? "current" : "todo"], ["Quality", order.hasQualityHold ? "Hold · disposition needed" : `${order.accepted} ${order.unit} accepted`, order.hasQualityHold ? "blocked" : "todo"], ["Dispatch", `${order.dispatched} ${order.unit} dispatched`, "todo"],
      ].map(([label, detail, status]) => <div key={label} style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", alignItems: "center", gap: 9, padding: "8px 0", borderBottom: "1px solid #d4cfbd" }}><span className="cell-primary">{label}</span><span className="cell-secondary">{detail}</span><StatusBadge status={status === "done" ? "COMPLETED" : status === "current" ? "IN_PROGRESS" : status === "blocked" ? "QUARANTINED" : "PLANNED"} label={status}/></div>)}</div></Card>
      <Can perm="finance.read" fallback={<Card className="col-6" title="Cost visibility"><InfoStrip tone="info">Cost amounts and allocation details are restricted to finance.read. Ask Finance for the approved view.</InfoStrip></Card>}><Card className="col-6" title="Cost visibility"><div className="page-grid"><div className="col-6"><Kicker>Recorded actual/allocated</Kicker><strong style={{ display: "block", font: "900 23px var(--font-display)", marginTop: 8 }}>{formatMoney(order.recordedCost, order.currency)}</strong><span className="cell-secondary">Includes posted direct cost and assigned overhead.</span></div><div className="col-6"><Kicker>Estimate / pending</Kicker><strong style={{ display: "block", font: "900 23px var(--font-display)", marginTop: 8 }}>{formatMoney(order.estimatedCost, order.currency)}</strong><span className="cell-secondary">Estimate is not actual booked cost.</span></div></div><InfoStrip tone={costComplete ? "success" : "warning"} title={costComplete ? "Cost has recorded rows." : "Cost incomplete."}>Missing machine rate or yarn cost stays flagged.</InfoStrip><Link href={`/finance/orders/${order.id}`} className="btn btn--secondary btn--sm">Open detailed cost <ArrowRight size={12}/></Link></Card></Can>
      <Card className="col-8" title="Allowed next steps"><div className="page-grid"><div className="col-6"><Can perm="orders.approve" fallback={<span className="permission-note">Approval requires orders.approve.</span>}><Button variant="secondary" onClick={() => updateStatus("APPROVED", "APPROVED")}>Approve order <Check size={14}/></Button></Can><p className="field__hint">Only an authorized person other than the creator can approve.</p></div><div className="col-6"><Can perm="production.plan" fallback={<span className="permission-note">Plan release requires production.plan.</span>}><Button disabled={order.materialShortage || order.hasQualityHold} onClick={() => updateStatus("IN_PRODUCTION", "IN_PRODUCTION", "SPINNING")}>Release production plan <ArrowRight size={14}/></Button></Can><p className="field__hint">Disabled while yarn is short or a quality hold is open.</p></div><div className="col-12"><Field label="Reason for change (required by server for cancellation/reversal)" hint="5+ characters. No append-only event should be edited or deleted."><TextInput value={reason} minLength={5} onChange={(event) => setReason(event.target.value)} placeholder="Explain what changed and why…"/></Field></div></div></Card>
      <Card className="col-4" title="Live System Boundary"><InfoStrip tone="warning">This page dynamically reads and updates orders from the live Supabase API!</InfoStrip><LinkButton href={`/rolls?order=${encodeURIComponent(order.code)}`} variant="quiet">Related rolls <ArrowRight size={12}/></LinkButton></Card>
    </div>
  </>;
}

function ThreadForOrder({ order }: { order: Order }) {
  const status = order.stage === "DYEING" ? 3 : order.stage === "WEAVING" ? 2 : order.produced !== "0.000" ? 2 : 1;
  const labels = ["Order", "Yarn", "Spinning", "Weaving", "Dyeing", "Quality", "Dispatch"];
  return <ol className="thread" aria-label="Order manufacturing and dispatch thread">{labels.map((label, index) => { const done = index < status; const current = index === status; return <li className={`thread__item thread__item--${done ? "done" : current ? "current" : "todo"}`} key={label}><span className="thread__node" aria-hidden="true">{done ? <Check size={14}/> : index + 1}</span><span className="thread__label">{label}</span>{index < labels.length - 1 && <span className="thread__wire" aria-hidden="true"/>}</li>; })}</ol>;
}
