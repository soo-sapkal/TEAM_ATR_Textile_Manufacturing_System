"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { RoleLink as Link } from "@/components/ui/primitives";
import { Activity, AlertTriangle, ArrowLeft, ArrowRight, Check, CircleDollarSign, ClipboardList, FilePlus2, PackageCheck, Plus, Search, Truck } from "lucide-react";
import Decimal from "decimal.js";
import { useDemo } from "@/lib/demo/context";
import { clampPercent, formatDate, formatMoney, formatQty } from "@/lib/domain/format";
import { Button, Card, DataTable, Field, InfoStrip, Kicker, LinkButton, Meter, PageHeader, SelectInput, StatCard, StatusBadge, Tag, TextArea, TextInput } from "@/components/ui/primitives";
import { Can } from "@/components/ui/Can";
import { EmptyState } from "@/components/ui/primitives";
import type { Order } from "@/lib/domain/types";
import { orderDraftSchema } from "@/lib/domain/schemas";
import { hasPermission } from "@/lib/auth/permissions";

function getOrdersPath(user: any) {
  const isBuyer = user?.roles?.includes("BUYER");
  const isOwner = user?.roles?.includes("OWNER");
  return isBuyer ? "/buyer/orders" : isOwner ? "/owner/orders" : "/orders";
}

function getOrderPath(id: string, user: any) {
  const isBuyer = user?.roles?.includes("BUYER");
  const isOwner = user?.roles?.includes("OWNER");
  return `${isBuyer ? "/buyer" : isOwner ? "/owner" : ""}/orders/${id}`;
}

export function OrdersPage() {
  const { data, user } = useDemo();
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const orders = useMemo(() => data.orders.filter((order) => {
    const needle = search.toLowerCase();
    const matches = !needle || `${order.code} ${order.buyer} ${order.product}`.toLowerCase().includes(needle);
    const stateMatches = filter === "ALL" 
      || (filter === "SHORTAGE" ? order.materialShortage 
      : filter === "MATERIAL_READY" ? !order.materialShortage 
      : filter === "AT_RISK" ? order.atRisk 
      : order.displayStatus === filter);
    return matches && stateMatches;
  }), [data.orders, search, filter]);

  const openByUnit = [...new Set(data.orders.map((order) => order.unit))].map((unit) => formatQty(data.orders.filter((order) => order.unit === unit).reduce((sum, order) => sum.plus(order.remaining), new Decimal(0)).toFixed(3), unit, 0));
  const shortageCount = data.orders.filter((order) => order.materialShortage).length;
  const readyCount = data.orders.length - shortageCount;

  return <>
    <PageHeader eyebrow="Make & move · customer commitment" title="Orders" description="Order quantities stay in their own unit. Live BOM material checks indicate whether enough yarn is in stock to start each order or if yarn must be ordered first." actions={<Can perm="orders.create"><LinkButton href={`${user?.roles?.includes("BUYER") ? "/buyer" : ""}/orders/new`} variant="primary"><FilePlus2 size={15}/> Create order</LinkButton></Can>} />
    
    <div className="stat-grid">
      <div className="stat-card stat-card--indigo"><div className="stat-card__top">Active orders</div><strong>{data.orders.length}</strong><div className="stat-card__bottom">total customer orders</div></div>
      <div className="stat-card stat-card--neem"><div className="stat-card__top">Ready to start</div><strong>{readyCount}</strong><div className="stat-card__bottom">sufficient yarn in stock</div></div>
      <div className="stat-card stat-card--madder"><div className="stat-card__top">Yarn shortage</div><strong>{shortageCount}</strong><div className="stat-card__bottom">must order yarn first</div></div>
      <div className="stat-card stat-card--cotton"><div className="stat-card__top">Open balance</div><strong>{openByUnit.join(" · ")}</strong><div className="stat-card__bottom">each unit totals separately</div></div>
    </div>

    <div className="filter-row" role="group" aria-label="Filter orders">
      {["ALL", "SHORTAGE", "MATERIAL_READY", "AT_RISK", "CONFIRMED", "IN_PRODUCTION", "READY_FOR_DISPATCH"].map((item) => (
        <button key={item} className={`filter-chip${filter === item ? " filter-chip--active" : ""}`} onClick={() => setFilter(item)}>
          {item === "SHORTAGE" ? "⚠️ Yarn Shortage" : item === "MATERIAL_READY" ? "✅ Yarn Ready" : item.replaceAll("_", " ")}
        </button>
      ))}
      <label className="search-box" style={{ width: 230, marginLeft: "auto" }}>
        <Search size={14}/><input aria-label="Search orders" placeholder="Find an order…" value={search} onChange={(event) => setSearch(event.target.value)}/>
      </label>
    </div>

    <Card className="card--table" title="Order book" action={<Tag>{orders.length} shown</Tag>}>
      <DataTable headers={["Order / buyer", "Product", "Due", "Priority", "Yarn Readiness", "Production", "Accepted", "State", ""]} rows={orders.map((order) => [
        <div>
          <Link href={getOrderPath(order.id, user)} className="cell-primary code">{order.code}</Link>
          <span className="cell-secondary">{order.buyer}</span>
        </div>, 
        <div>
          <span className="cell-primary">{order.product}</span>
          <span className="cell-secondary">{order.colour}</span>
        </div>, 
        <div>
          <span className="cell-primary">{formatDate(order.due)}</span>
          {order.atRisk && <span className="cell-secondary" style={{ color: "var(--madder)" }}>At risk</span>}
        </div>, 
        <StatusBadge status={order.priority}/>,
        <div>
          {order.materialShortage ? (
            <div>
              <StatusBadge status="HIGH" label="Shortage · Order Yarn"/>
              <span className="cell-secondary" style={{ color: "var(--madder)", fontWeight: 700, display: "block", fontSize: 11, marginTop: 2 }}>
                {order.materialReadiness?.deficitSummary?.replace("Shortage: ", "") || "Short yarn stock"}
              </span>
            </div>
          ) : (
            <div>
              <StatusBadge status="AVAILABLE" label="Sufficient Yarn"/>
              <span className="cell-secondary" style={{ color: "var(--neem)", display: "block", fontSize: 11, marginTop: 2 }}>
                Ready to start
              </span>
            </div>
          )}
        </div>,
        <div style={{ minWidth: 112 }}>
          <Meter value={order.produced} total={order.ordered} label="Produced" showNumbers={false}/>
          <span className="cell-secondary num">{formatQty(order.produced, order.unit, 0)} / {formatQty(order.ordered, order.unit, 0)}</span>
        </div>, 
        formatQty(order.accepted, order.unit, 0), 
        <StatusBadge status={order.displayStatus}/>, 
        <Link href={getOrderPath(order.id, user)} className="btn btn--secondary btn--sm">
          Open <ArrowRight size={12}/>
        </Link>
      ])} empty={<EmptyState title="No matching order" detail="Change filters or search for another order."/>}/>
    </Card>
    <InfoStrip tone="info" title="Raw material readiness logic">Before a manufacturing plan can be released to machines, yarn availability is checked in KG against product BOMs. Shortages trigger alerts to purchase yarn first.</InfoStrip>
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
    const yarn = data.yarnItems.find(y => y.id === b.yarn_item_id || y.code === b.yarn_code);
    const available = new Decimal(yarn?.available || 0);
    const isShort = available.lt(requiredTotal);
    const deficit = Decimal.max(0, requiredTotal.minus(available));
    if (isShort) hasShortage = true;
    return { ...b, requiredTotal, available, isShort, deficit };
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = orderDraftSchema.safeParse({ buyer, product: productName, colour, quantity, unit, due, priority, terms });
    if (!parsed.success) { toast("Order draft needs correction", parsed.error.issues[0]?.message ?? "Review the order fields.", "error"); return; }
    
    setSubmitted(true);
    
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer, product: productName, productId, colour, quantity, unit, due, priority, terms })
      });
      const resData = await res.json();
      if (resData.success) {
        if (hasShortage) {
          toast("Order created with Material Shortage", `Order ${resData.data.code} recorded. Raw material shortage flagged — order yarn before starting production.`, "warning");
        } else {
          toast("Order created", `Successfully created draft order ${resData.data.code}. All raw materials in stock.`, "success");
        }
        window.location.href = getOrdersPath(user);
      } else {
        toast("Failed to create order", resData.error, "error");
        setSubmitted(false);
      }
    } catch (e: any) {
      toast("Error", e.message, "error");
      setSubmitted(false);
    }
  }
  
  return <>
    <PageHeader eyebrow="Customer commitment" title="Create an order" description="Capture the buyer's request. Automated BOM check verifies whether sufficient yarn exists to start immediately or if more yarn must be ordered." actions={<LinkButton href={getOrdersPath(user)} variant="secondary"><ArrowLeft size={14}/> Order book</LinkButton>} />
    <div className="two-pane"><form onSubmit={submit} className="card stack"><div className="card__head"><h2>Order terms</h2><StatusBadge status="DRAFT"/></div>
      <div className="form-grid">
        <Field label="Buyer"><SelectInput value={buyer} onChange={(event) => setBuyer(event.target.value)}><option>Mysore House Textiles</option><option>Kaveri Apparel Co.</option><option>FabIndia Export</option><option>Saffron Living</option></SelectInput></Field><Field label="Requested due date"><TextInput type="date" value={due} onChange={(event) => setDue(event.target.value)} required/></Field>
        
        <Field label="Product / style (from Catalog)">
          <SelectInput value={productId} onChange={(event) => setProductId(event.target.value)} required>
            {products.length === 0 && <option value="">Loading products...</option>}
            {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Colour / shade"><TextInput value={colour} onChange={(event) => setColour(event.target.value)} required/></Field>
        
        <Field label="Order quantity"><TextInput inputMode="decimal" pattern="\d+(\.\d{1,3})?" value={quantity} onChange={(event) => setQuantity(event.target.value)} required/><span className="field__hint">Exact decimal string; recipe evaluates required raw yarn in KG.</span></Field><Field label="Unit"><SelectInput value={unit} onChange={(event) => setUnit(event.target.value as "M" | "KG")}><option value="M">M — metres</option><option value="KG">KG — kilograms</option></SelectInput></Field>
        <Field label="Priority"><SelectInput value={priority} onChange={(event) => setPriority(event.target.value)}><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option><option value="LOW">Low</option></SelectInput></Field><Field label="Buyer reference"><TextInput placeholder="Optional purchase order number"/></Field>
        <Field label="Terms / notes" className="" hint="This note is saved with the order record."><TextArea value={terms} onChange={(event) => setTerms(event.target.value)} placeholder="Finish, packaging, or delivery notes…"/></Field></div>
      <div className="form-actions">
        <span className="field__hint">Created by {user?.name} · material check runs live</span>
        <Button type="submit" variant={hasShortage ? "secondary" : "primary"}>
          <Plus size={14}/> {hasShortage ? "Create Order (Flag Yarn Shortage)" : "Create Order (Materials Ready)"}
        </Button>
      </div>
      {hasShortage && (
        <InfoStrip tone="warning" title="Raw Material Shortage Flagged">
          This order will be created with a Material Shortage status. You will need to order additional raw yarn before the supervisor can release this order to the factory floor.
        </InfoStrip>
      )}
    </form>
    <aside className="stack sticky-summary">
      <Card title="Live Material Check (BOM)" action={
        bom.length > 0 && (hasShortage ? <StatusBadge status="HIGH" label="Shortage Alert"/> : <StatusBadge status="AVAILABLE" label="Sufficient Stock"/>)
      }>
        <div className="stack-sm">
          {bom.length === 0 ? <EmptyState title="No BOM defined" detail="This product has no yarn recipe attached to it." /> : materialChecks.map((item) => (
            <div className="permission-note" key={item.yarn_item_id || item.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong className="code">{item.yarn_code}</strong>
                <StatusBadge status={!item.isShort ? "AVAILABLE" : "HIGH"} label={!item.isShort ? "Sufficient" : `Short: -${item.deficit.toFixed(1)} ${item.unit}`}/>
              </div>
              <span className="cell-secondary">{item.yarn_name}</span>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                <span className="num" style={{ color: item.isShort ? "var(--madder)" : "inherit", fontWeight: 700 }}>
                  {formatQty(item.requiredTotal.toFixed(1), item.unit, 1)} req
                </span>
                <span className="num">
                  {formatQty(item.available.toFixed(1), item.unit, 1)} avail
                </span>
              </div>
            </div>
          ))}
          {hasShortage && (
            <InfoStrip tone="danger" title="Order Yarn First">
              Available yarn in stock is lower than this order requires ({materialChecks.filter(m => m.isShort).map(m => `-${m.deficit.toFixed(1)} ${m.unit} ${m.yarn_code}`).join(", ")}). Reorder raw material to fulfill this order.
            </InfoStrip>
          )}
          {!hasShortage && bom.length > 0 && (
            <InfoStrip tone="success" title="Ready to Start!">
              All raw material requirements are in stock. This order can be scheduled for production immediately upon submission.
            </InfoStrip>
          )}
        </div>
      </Card>
      <div className="permission-note"><strong>Live Factory Inventory</strong><p className="cell-secondary">Calculates required yarn weight based on product recipe yield and compares against real-time Supabase warehouse balances.</p></div>
    </aside></div>
  </>;
}

export function OrderDetailPage({ id }: { id: string }) {
  const { data, toast, user } = useDemo();
  const order = data.orders.find((item) => item.id === id || item.code === id);
  const [reason, setReason] = useState("");
  if (!order) return <><PageHeader title="Order not found" description="We could not find that demo order."/><EmptyState title="No order record" action={<LinkButton href={getOrdersPath(user)}>Return to order book</LinkButton>}/></>;
  const percent = clampPercent(order.produced, order.ordered);
  const costComplete = new Decimal(order.recordedCost).gt(0);
  
  async function updateStatus(status: string, displayStatus: string, stage?: string) {
    if (!order) return;
    if (status === "IN_PRODUCTION" && order.materialShortage) {
      toast("Blocked by Material Shortage", "Cannot release production plan because required yarn raw material is short in warehouse.", "error");
      return;
    }
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
    <PageHeader eyebrow="Order command page" title={order.code} description={`${order.buyer} · ${order.product} · ${order.colour}`} actions={<><LinkButton href={getOrdersPath(user)} variant="secondary"><ArrowLeft size={14}/> Orders</LinkButton><Can perm="finance.read"><LinkButton href="/finance" variant="secondary"><CircleDollarSign size={14}/> Cost view</LinkButton></Can></>} meta={<><StatusBadge status={order.displayStatus}/><StatusBadge status={order.priority}/><Tag>Due {formatDate(order.due)}</Tag>{order.materialShortage ? <StatusBadge status="HIGH" label="Yarn Shortage"/> : <StatusBadge status="AVAILABLE" label="Yarn Ready"/>}</>} />
    
    {order.materialShortage ? (
      <div style={{ marginBottom: 16 }}>
        <InfoStrip tone="danger" title="🚨 Cannot Start Production — Raw Material Shortage Alert">
          This order requires more raw material than is currently available in the yarn warehouse! A yarn purchase order must be placed and received before this order can be released to machines. <strong>{order.materialReadiness?.deficitSummary}</strong>.
          <div style={{ marginTop: 8 }}>
            {hasPermission(user, "inventory.receive") && (
              <LinkButton href="/inventory/receive" variant="primary" size="sm">
                Go to Yarn Receipt / Purchase Form →
              </LinkButton>
            )}
          </div>
        </InfoStrip>
      </div>
    ) : (
      <div style={{ marginBottom: 16 }}>
        <InfoStrip tone="success" title="✅ Raw Material Verified — Ready to Start">
          Sufficient yarn raw material is in stock to fulfill this order's BOM requirements. The production plan can be released to factory floor machinery without raw material delays.
        </InfoStrip>
      </div>
    )}

    <div className="stat-grid">
      <StatCard label="Ordered" value={formatQty(order.ordered, order.unit, 0)} detail="Buyer commitment" icon={ClipboardList}/>
      <StatCard label="Raw material check" value={order.materialShortage ? "Shortage" : "Sufficient"} detail={order.materialShortage ? "Purchase yarn first" : "100% yarn available"} icon={AlertTriangle} tone={order.materialShortage ? "madder" : "neem"}/>
      <StatCard label="Produced" value={formatQty(order.produced, order.unit, 0)} detail={`${percent}% of requested quantity`} icon={Activity}/>
      <StatCard label="Available for dispatch" value={formatQty(order.available, order.unit, 0)} detail={`${order.reserved} reserved · ${order.dispatched} dispatched`} icon={Truck} tone={order.hasQualityHold ? "turmeric" : "cotton"}/>
    </div>

    <div className="page-grid">
      <Card className="col-12" title="Raw Material & BOM Feasibility Breakdown" action={
        order.materialShortage ? <StatusBadge status="HIGH" label="Needs Yarn Order"/> : <StatusBadge status="AVAILABLE" label="Ready to Start"/>
      }>
        {order.materialReadiness?.details && order.materialReadiness.details.length > 0 ? (
          <div>
            <p className="cell-secondary" style={{ marginBottom: 12 }}>
              Based on the product BOM for <strong>{order.product}</strong>, manufacturing {formatQty(order.ordered, order.unit, 0)} requires the following raw materials:
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid #e0dbce" }}>
                    <th style={{ padding: "8px 8px" }}>Yarn Material</th>
                    <th style={{ padding: "8px 8px" }}>Order Requirement</th>
                    <th style={{ padding: "8px 8px" }}>Available in Mill</th>
                    <th style={{ padding: "8px 8px" }}>Stock Balance</th>
                    <th style={{ padding: "8px 8px" }}>Feasibility Status</th>
                    <th style={{ padding: "8px 8px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {order.materialReadiness.details.map((item) => {
                    const surplus = item.availableQty - item.requiredQty;
                    return (
                      <tr key={item.yarnCode} style={{ borderBottom: "1px solid #ebe6d9" }}>
                        <td style={{ padding: "10px 8px" }}>
                          <strong className="code">{item.yarnCode}</strong>
                          <div className="cell-secondary">{item.yarnName}</div>
                        </td>
                        <td style={{ padding: "10px 8px", fontWeight: 700 }}>
                          {formatQty(item.requiredQty.toFixed(1), item.unit as any, 1)}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          {formatQty(item.availableQty.toFixed(1), item.unit as any, 1)}
                        </td>
                        <td style={{ padding: "10px 8px", fontWeight: 700, color: item.isShort ? "var(--madder)" : "var(--neem)" }}>
                          {item.isShort ? `Deficit: -${item.deficitQty.toFixed(1)} ${item.unit}` : `Surplus: +${surplus.toFixed(1)} ${item.unit}`}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          {item.isShort ? (
                            <StatusBadge status="HIGH" label="Short — Order First"/>
                          ) : (
                            <StatusBadge status="AVAILABLE" label="In Stock — Ready"/>
                          )}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          {item.isShort && hasPermission(user, "inventory.receive") ? (
                            <LinkButton href={`/inventory/receive?item=${item.yarnCode}&needed=${item.deficitQty.toFixed(1)}`} variant="primary" size="sm">
                              Reorder {item.deficitQty.toFixed(1)} {item.unit}
                            </LinkButton>
                          ) : (
                            <span className="cell-secondary">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="permission-note">
            Standard fabric recipe without specific individual BOM lines.
          </div>
        )}
      </Card>

      <Card className="col-8" title="Thread through production"><Meter value={order.produced} total={order.ordered} label="Produced vs order quantity"/><div style={{ marginTop: 20 }}><ThreadForOrder order={order}/></div><div className="page-grid" style={{ marginTop: 20 }}><div className="col-4"><Kicker>Plan</Kicker><div className="num" style={{ fontSize: 18, marginTop: 5 }}>{formatQty(order.planned, order.unit, 0)}</div></div><div className="col-4"><Kicker>Remaining</Kicker><div className="num" style={{ fontSize: 18, marginTop: 5 }}>{formatQty(order.remaining, order.unit, 0)}</div></div><div className="col-4"><Kicker>Quality hold</Kicker><div style={{ marginTop: 6 }}><StatusBadge status={order.hasQualityHold ? "QUARANTINED" : "ACCEPTED"} label={order.hasQualityHold ? "Review required" : "Clear"}/></div></div></div></Card>
      
      <Card className="col-4" title="Buyer and production milestones"><div className="stack-sm">{[
        ["Order raised", "2026-10-04T09:00:00Z", "done"], ["Approved", "2026-10-04T11:20:00Z", "done"], ["Material reserved", order.materialShortage ? "Shortage · order needed" : "Reservation recorded", order.materialShortage ? "blocked" : "done"], ["Production", order.stage ? `${order.stage.toLowerCase()} · in progress` : "Awaiting plan", order.stage ? "current" : "todo"], ["Quality", order.hasQualityHold ? "Hold · disposition needed" : `${order.accepted} ${order.unit} accepted`, order.hasQualityHold ? "blocked" : "todo"], ["Dispatch", `${order.dispatched} ${order.unit} dispatched`, "todo"],
      ].map(([label, detail, status]) => <div key={label} style={{ display: "grid", gridTemplateColumns: "110px 1fr auto", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #d4cfbd" }}><span className="cell-primary" style={{ fontSize: 12 }}>{label}</span><span className="cell-secondary" style={{ fontSize: 11 }}>{detail}</span><StatusBadge status={status === "done" ? "COMPLETED" : status === "current" ? "IN_PROGRESS" : status === "blocked" ? "QUARANTINED" : "PLANNED"} label={status}/></div>)}</div></Card>

      <Can perm="finance.read" fallback={<Card className="col-6" title="Cost visibility"><InfoStrip tone="info">Cost amounts and allocation details are restricted to finance.read. Ask Finance for the approved view.</InfoStrip></Card>}><Card className="col-6" title="Cost visibility"><div className="page-grid"><div className="col-6"><Kicker>Recorded actual/allocated</Kicker><strong style={{ display: "block", font: "900 23px var(--font-display)", marginTop: 8 }}>{formatMoney(order.recordedCost, order.currency)}</strong><span className="cell-secondary">Includes posted direct cost and assigned overhead.</span></div><div className="col-6"><Kicker>Estimate / pending</Kicker><strong style={{ display: "block", font: "900 23px var(--font-display)", marginTop: 8 }}>{formatMoney(order.estimatedCost, order.currency)}</strong><span className="cell-secondary">Estimate is not actual booked cost.</span></div></div><InfoStrip tone={costComplete ? "success" : "warning"} title={costComplete ? "Cost has recorded rows." : "Cost incomplete."}>Missing machine rate or yarn cost stays flagged.</InfoStrip><Link href={`/finance/orders/${order.id}`} className="btn btn--secondary btn--sm">Open detailed cost <ArrowRight size={12}/></Link></Card></Can>
      
      <Card className="col-6" title="Allowed next steps"><div className="page-grid"><div className="col-6"><Can perm="orders.approve" fallback={<span className="permission-note">Approval requires orders.approve.</span>}><Button variant="secondary" onClick={() => updateStatus("APPROVED", "APPROVED")}>Approve order <Check size={14}/></Button></Can><p className="field__hint">Only an authorized person other than the creator can approve.</p></div><div className="col-6"><Can perm="production.plan" fallback={<span className="permission-note">Plan release requires production.plan.</span>}><Button disabled={order.materialShortage || order.hasQualityHold} onClick={() => updateStatus("IN_PRODUCTION", "IN_PRODUCTION", "SPINNING")}>Release production plan <ArrowRight size={14}/></Button></Can><p className="field__hint">{order.materialShortage ? "⛔ Disabled: Raw yarn is short. Order yarn first before releasing plan." : "Disabled while yarn is short or a quality hold is open."}</p></div><div className="col-12"><Field label="Reason for change (required by server for cancellation/reversal)" hint="5+ characters. No append-only event should be edited or deleted."><TextInput value={reason} minLength={5} onChange={(event) => setReason(event.target.value)} placeholder="Explain what changed and why…"/></Field></div></div></Card>
      
      <Card className="col-12" title="Live System Boundary"><InfoStrip tone="warning">This page dynamically reads and updates orders from the live Supabase API! Material checks are synchronized with warehouse stock.</InfoStrip><LinkButton href={`/rolls?order=${encodeURIComponent(order.code)}`} variant="quiet">Related rolls <ArrowRight size={12}/></LinkButton></Card>
    </div>
  </>;
}

function ThreadForOrder({ order }: { order: Order }) {
  const status = order.stage === "DYEING" ? 3 : order.stage === "WEAVING" ? 2 : order.produced !== "0.000" ? 2 : 1;
  const labels = ["Order", "Yarn", "Spinning", "Weaving", "Dyeing", "Quality", "Dispatch"];
  return <ol className="thread" aria-label="Order manufacturing and dispatch thread">{labels.map((label, index) => { const done = index < status; const current = index === status; return <li className={`thread__item thread__item--${done ? "done" : current ? "current" : "todo"}`} key={label}><span className="thread__node" aria-hidden="true">{done ? <Check size={14}/> : index + 1}</span><span className="thread__label">{label}</span>{index < labels.length - 1 && <span className="thread__wire" aria-hidden="true"/>}</li>; })}</ol>;
}
