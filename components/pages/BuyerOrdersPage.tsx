"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import { RoleLink as Link } from "@/components/ui/primitives";
import { ArrowLeft, ArrowRight, Calendar, Check, Clock, Package, Plus, Search, Truck, ShieldCheck, FileCheck } from "lucide-react";
import { clampPercent, formatDate, formatQty, formatMoney } from "@/lib/domain/format";
import { Card, DataTable, EmptyState, InfoStrip, LinkButton, Meter, PageHeader, StatusBadge, Tag, Field, SelectInput, TextInput, TextArea, Button, StatCard } from "@/components/ui/primitives";
import { useDemo } from "@/lib/demo/context";
import Decimal from "decimal.js";

// 1. ORDER LIST PAGE
export function BuyerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/orders")
      .then(res => res.json())
      .then(resData => {
        if (resData.success) setOrders(resData.data);
        setLoading(false);
      });
  }, []);

  const myOrders = useMemo(() => {
    return orders.filter((order) => {
      const needle = search.toLowerCase();
      const matches = !needle || `${order.code} ${order.product}`.toLowerCase().includes(needle);
      const stateMatches = filter === "ALL" 
        || (filter === "ACTIVE" ? ["CONFIRMED", "PLANNED", "IN_PRODUCTION"].includes(order.displayStatus || order.display_status) : false)
        || (filter === "READY" ? (order.displayStatus || order.display_status) === "READY_FOR_DISPATCH" : false)
        || (filter === "SHIPPED" ? Number(order.dispatched) > 0 : false);
      return matches && stateMatches;
    });
  }, [orders, search, filter]);

  return (
    <>
      <PageHeader 
        eyebrow="B2B Customer Portal · Everest Textile Mills" 
        title="My Orders" 
        description="Track your manufacturing orders in real-time from confirmation to dispatch." 
        actions={
          <LinkButton href="/buyer/orders/new" variant="primary">
            <Plus size={15}/> Place New Order
          </LinkButton>
        } 
      />

      <div className="filter-row" role="group" aria-label="Filter orders">
        {["ALL", "ACTIVE", "READY", "SHIPPED"].map((item) => (
          <button key={item} className={`filter-chip${filter === item ? " filter-chip--active" : ""}`} onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
        <label className="search-box" style={{ width: 230, marginLeft: "auto" }}>
          <Search size={14}/>
          <input aria-label="Search orders" placeholder="Search by Order ID..." value={search} onChange={(event) => setSearch(event.target.value)}/>
        </label>
      </div>

      <Card className="card--table" title="Order Tracking" action={<Tag>{loading ? "..." : myOrders.length} orders</Tag>}>
        <DataTable 
          headers={["Order Ref", "Product", "Status", "Estimated Delivery", "Progress", "Dispatched", ""]} 
          rows={myOrders.map((order) => {
            const percent = clampPercent(order.produced, order.ordered);
            const displayStatus = order.displayStatus || order.display_status;
            const isReady = displayStatus === "READY_FOR_DISPATCH";
            const isShipped = Number(order.dispatched) > 0;
            
            let statusLabel = "Processing";
            if (isReady) statusLabel = "Ready for Dispatch";
            else if (percent > 0) statusLabel = "In Production";
            else if (order.status === "CONFIRMED") statusLabel = "Confirmed";

            return [
              <Link href={`/buyer/orders/${order.id}`} className="cell-primary code" style={{ fontSize: 14 }}>
                {order.code}
              </Link>, 
              <div>
                <span className="cell-primary">{order.product}</span>
                <span className="cell-secondary">Shade: {order.colour}</span>
              </div>, 
              <StatusBadge status={isReady ? "AVAILABLE" : (isShipped ? "HIGH" : "NORMAL")} label={statusLabel}/>,
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={13} style={{ color: "var(--indigo)" }}/>
                <span className="cell-primary" style={{ fontWeight: 600 }}>{formatDate(order.due)}</span>
              </div>,
              <div style={{ minWidth: 120 }}>
                <Meter value={order.produced} total={order.ordered} showNumbers={false} tone={isReady ? "neem" : "indigo"}/>
                <span className="cell-secondary num" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
                  {formatQty(order.produced, order.unit, 0)} / {formatQty(order.ordered, order.unit, 0)}
                </span>
              </div>,
              <span className="num" style={{ color: isShipped ? "var(--indigo)" : "var(--ink-soft)", fontWeight: isShipped ? 800 : 400 }}>
                {formatQty(order.dispatched, order.unit, 0)}
              </span>,
              <Link href={`/buyer/orders/${order.id}`} className="btn btn--secondary btn--sm">
                View Details <ArrowRight size={12}/>
              </Link>
            ];
          })} 
          empty={loading ? <div style={{ padding: 40, textAlign: "center" }}>Loading your orders...</div> : <EmptyState title="No orders found" detail="You have no orders matching these filters." action={<LinkButton href="/buyer/orders/new">Create Order</LinkButton>} />}
        />
      </Card>
      
      <InfoStrip tone="info" title="Transparent Manufacturing">
        Your orders are linked directly to our factory floor. The progress you see reflects real-time machine output and quality inspection events.
      </InfoStrip>
    </>
  );
}


// 2. ORDER DETAIL PAGE
export function BuyerOrderDetailPage({ id }: { id: string }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          const found = resData.data.find((o: any) => o.id === id);
          setOrder(found);
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading details...</div>;
  if (!order) return <EmptyState title="Order Not Found" detail="This order may not belong to your account." />;

  const displayStatus = order.displayStatus || order.display_status;
  const isReady = displayStatus === "READY_FOR_DISPATCH";
  const isShipped = Number(order.dispatched) > 0;
  
  let statusLabel = "Processing in Mill";
  if (isReady) statusLabel = "Quality Approved · Ready for Dispatch";
  else if (order.produced > 0) statusLabel = "Active Manufacturing";
  else if (order.status === "CONFIRMED") statusLabel = "Order Scheduled";
  
  const percent = clampPercent(order.produced, order.ordered);

  return (
    <>
      <PageHeader 
        eyebrow={`Purchase Order · ${order.buyer}`} 
        title={order.code} 
        description={`Status: ${statusLabel}`} 
        actions={<LinkButton href="/buyer/orders" variant="secondary"><ArrowLeft size={14}/> Back to Orders</LinkButton>}
        meta={
          <>
            <Tag>DUE {formatDate(order.due)}</Tag>
            <StatusBadge status={isReady ? "AVAILABLE" : (isShipped ? "HIGH" : "NORMAL")} label={isReady ? "READY" : "ACTIVE"}/>
          </>
        }
      />

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Total Ordered" value={formatQty(order.ordered, order.unit, 0)} detail={`${order.product} (${order.colour})`} icon={Package} tone="indigo" />
        <StatCard label="Manufacturing Progress" value={`${Math.round(percent)}%`} detail={`${formatQty(order.produced, order.unit, 0)} completed`} icon={ShieldCheck} tone="cotton" />
        <StatCard label="Quality Passed" value={formatQty(order.accepted, order.unit, 0)} detail="Passed 4-point visual inspection" icon={Check} tone="neem" />
        <StatCard label="Dispatched / Shipped" value={formatQty(order.dispatched, order.unit, 0)} detail="Currently with carrier" icon={Truck} tone="turmeric" />
      </div>

      <Card title="Manufacturing Lifecycle Tracker">
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontWeight: 800, color: "var(--ink)", fontSize: 14 }}>Order Execution Timeline</span>
            <span className="num" style={{ fontSize: 13, color: "var(--indigo)" }}>{formatQty(order.produced, order.unit, 0)} / {formatQty(order.ordered, order.unit, 0)}</span>
          </div>
          <Meter value={order.produced} total={order.ordered} tone={isReady ? "neem" : "indigo"} />
          
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusBadge status="AVAILABLE" />
              <span>Order Confirmed</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusBadge status={order.produced > 0 ? "AVAILABLE" : "DRAFT"} />
              <span style={{ color: order.produced > 0 ? "inherit" : "var(--ink-soft)", fontWeight: order.produced > 0 && order.accepted === 0 ? 800 : 400 }}>Being Woven</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusBadge status={order.accepted > 0 ? "AVAILABLE" : "DRAFT"} />
              <span style={{ color: order.accepted > 0 ? "inherit" : "var(--ink-soft)", fontWeight: order.accepted > 0 && !isReady ? 800 : 400 }}>Being Checked (QC)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusBadge status={isReady ? "AVAILABLE" : "DRAFT"} />
              <span style={{ color: isReady ? "inherit" : "var(--ink-soft)", fontWeight: isReady && !isShipped ? 800 : 400 }}>Ready to Ship</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusBadge status={isShipped ? "AVAILABLE" : "DRAFT"} />
              <span style={{ color: isShipped ? "inherit" : "var(--ink-soft)", fontWeight: isShipped ? 800 : 400 }}>Shipped</span>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="card" style={{ marginTop: 24 }}>
         <div className="card__head">
           <h2>Product Specifications</h2>
         </div>
         <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, fontSize: 13 }}>
           <div>
             <div style={{ color: "var(--ink-soft)", marginBottom: 4 }}>Product Reference</div>
             <strong style={{ fontSize: 16 }}>{order.product}</strong>
           </div>
           <div>
             <div style={{ color: "var(--ink-soft)", marginBottom: 4 }}>Color / Shade matching</div>
             <strong style={{ fontSize: 16 }}>{order.colour}</strong>
           </div>
         </div>
      </div>
    </>
  );
}


// 3. NEW ORDER PAGE
export function BuyerNewOrderPage() {
  const { toast } = useDemo();
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [colour, setColour] = useState("");
  const [quantity, setQuantity] = useState("5000");
  const [due, setDue] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21); // default 3 weeks
    return d.toISOString().split("T")[0];
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data.length > 0) {
          const fabrics = resData.data; // Use all products in the catalog
          setProducts(fabrics);
          if (fabrics.length > 0) {
            setProductId(fabrics[0].id);
            setProductName(fabrics[0].name);
            setColour(fabrics[0].available_colors?.[0] || "");
          }
        }
      });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    
    // Note: Buyer identity is now strictly enforced by the backend using the JWT token!
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          product: productName, 
          colour, 
          quantity, 
          unit: "M", 
          due, 
          priority: "NORMAL" 
        })
      });
      
      const resData = await res.json();
      if (resData.success) {
        toast("Order Placed Successfully", `Your order ${resData.data.code} has been securely transmitted to the mill.`, "success");
        window.location.href = "/buyer/orders";
      } else {
        toast("Failed to place order", resData.error, "error");
        setSubmitted(false);
      }
    } catch (e: any) {
      toast("Connection Error", e.message, "error");
      setSubmitted(false);
    }
  }

  return (
    <>
      <PageHeader 
        eyebrow="B2B Customer Portal" 
        title="Place New Purchase Order" 
        description="Select from our certified catalog. Real-time factory routing will automatically schedule your order upon submission." 
        actions={<LinkButton href="/buyer/orders" variant="secondary"><ArrowLeft size={14}/> Cancel</LinkButton>} 
      />
      
      <div className="page-grid">
        <form onSubmit={submit} className="card stack col-8">
          <div className="card__head">
            <h2>Order Details</h2>
          </div>
          
          <div className="form-grid">
            <Field label="Fabric Selection (from Catalog)" className="col-12">
              <SelectInput 
                value={productId} 
                onChange={(e) => {
                  setProductId(e.target.value);
                  const selected = products.find(p => p.id === e.target.value);
                  setProductName(selected?.name || "");
                  setColour(selected?.available_colors?.[0] || "");
                }} 
                required
              >
                {products.length === 0 && <option value="">Loading catalog...</option>}
                {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </SelectInput>
            </Field>
            
            <Field label="Required Shade / Colour">
              <SelectInput value={colour} onChange={(e) => setColour(e.target.value)} required>
                {products.find(p => p.id === productId)?.available_colors?.length > 0 
                  ? products.find(p => p.id === productId).available_colors.map((c: string) => <option key={c} value={c}>{c}</option>)
                  : <option value="Standard Finish">Standard Finish</option>
                }
              </SelectInput>
            </Field>
            
            <Field label="Requested Delivery Date">
              <TextInput type="date" value={due} onChange={(e) => setDue(e.target.value)} required/>
            </Field>
            
            <Field label="Total Quantity (Metres)">
              <TextInput type="number" min="1000" step="100" value={quantity} onChange={(e) => setQuantity(e.target.value)} required/>
              <span className="field__hint">Minimum order quantity: 1,000 M</span>
            </Field>
          </div>
          
          <div className="form-actions" style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <Button type="submit" variant="primary" disabled={submitted} size="lg">
              <Check size={16}/> {submitted ? "Transmitting..." : "Confirm & Place Order"}
            </Button>
          </div>
        </form>
        
        <aside className="col-4 stack">
          <InfoStrip tone="success" title="Secure B2B Portal">
            Your organization's identity and billing details are securely attached to this order automatically via your verified session token.
          </InfoStrip>
          <Card title="Order Support">
            <div style={{ padding: "16px 20px", fontSize: 13, color: "var(--ink-soft)" }}>
              <p style={{ margin: "0 0 12px 0" }}>If you require custom sampling or a fabric specification not listed in the catalog, please contact your account manager directly.</p>
              <Button variant="secondary" size="sm" type="button" style={{ width: "100%", justifyContent: "center" }}>
                Request Custom Shade
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
