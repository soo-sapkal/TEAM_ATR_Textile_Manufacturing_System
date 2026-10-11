"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { RoleLink as Link } from "@/components/ui/primitives";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, PackageCheck, Printer, ShieldAlert, Truck, CheckCircle2, Clock, FileText, X } from "lucide-react";
import Decimal from "decimal.js";
import { useDemo } from "@/lib/demo/context";
import { hasPermission } from "@/lib/auth/permissions";
import { formatDate, formatDateTime, formatMoney, formatQty } from "@/lib/domain/format";
import { BrandMark, Button, Card, DataTable, EmptyState, Field, InfoStrip, Kicker, LinkButton, Meter, PageHeader, SelectInput, StatusBadge, Tag, TextInput, Thread } from "@/components/ui/primitives";
import type { FabricRoll, Order } from "@/lib/domain/types";
import { Can } from "@/components/ui/Can";

export function SupervisorDispatchDashboard() {
  const { data, toast } = useDemo();
  const [timeframe, setTimeframe] = useState("Today");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, READY, PARTIAL, COMPLETED

  // Shipments
  const filteredShipments = data.shipments.filter(s => s.status === "DISPATCHED" || s.status === "DRAFT");
  const completedShipments = filteredShipments.filter(s => s.status === "DISPATCHED");
  const recentDispatches = [...completedShipments].sort((a, b) => new Date(b.plannedAt).getTime() - new Date(a.plannedAt).getTime()).slice(0, 5);

  // Orders Analysis
  const activeOrders = data.orders.filter(o => o.status !== "CANCELLED");
  const fullyDispatchedOrders = activeOrders.filter(o => o.displayStatus === "COMPLETED" || new Decimal(o.remaining || 0).lte(0));
  const partiallyDispatchedOrders = activeOrders.filter(o => new Decimal(o.dispatched || 0).gt(0) && new Decimal(o.remaining || 0).gt(0));

  // Determine readiness based on ACCEPTED rolls
  const acceptedRolls = data.rolls.filter(r => r.status === "ACCEPTED");
  
  const ordersWithReadiness = activeOrders.filter(o => new Decimal(o.remaining || 0).gt(0)).map(o => {
    const orderRolls = acceptedRolls.filter(r => r.orderCode === o.code);
    const eligibleQty = orderRolls.reduce((sum, r) => sum.plus(r.qty), new Decimal(0));
    const remaining = new Decimal(o.remaining || 0);
    const isReady = eligibleQty.gte(remaining);
    const isPartiallyReady = eligibleQty.gt(0) && eligibleQty.lt(remaining);
    return { ...o, eligibleQty, isReady, isPartiallyReady, orderRolls };
  });

  const readyOrders = ordersWithReadiness.filter(o => o.isReady || o.isPartiallyReady);
  const totalOrdersAwaitingDispatch = ordersWithReadiness.length;

  const totalEligibleQuantityByUnit = acceptedRolls.reduce((acc, roll) => {
    acc[roll.unit] = (acc[roll.unit] || new Decimal(0)).plus(roll.qty);
    return acc;
  }, {} as Record<string, Decimal>);

  // Filtering for the table
  const displayedOrders = ordersWithReadiness.filter(o => {
    const matchesSearch = !search || `${o.code} ${o.buyer} ${o.product}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "ALL" 
      || (filter === "READY" && o.isReady)
      || (filter === "PARTIAL" && o.isPartiallyReady);
    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <PageHeader 
        eyebrow="Logistics Oversight" 
        title="Dispatch Dashboard" 
        description="Monitor outbound shipments and final-goods inventory readiness for fulfillment." 
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <LinkButton href="/dispatch/orders" variant="primary">
              <Truck size={16}/> Start Dispatch
            </LinkButton>
            <Button variant="secondary" onClick={() => { toast("Manifest Generated", "Daily dispatch manifest ready for printing.", "success"); window.print(); }} style={{ border: "2px solid #000", boxShadow: "3px 3px 0 #000" }}>
              <Printer size={16}/> Daily Manifest
            </Button>
          </div>
        } 
      />

      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--turmeric)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Awaiting Dispatch</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{totalOrdersAwaitingDispatch}</div>
          <div style={{ fontSize: "0.85rem", color: "#444", fontWeight: 600 }}>Total orders pending fulfillment</div>
        </div>
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--neem)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Ready / Partial Ready</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{readyOrders.length}</div>
          <div style={{ fontSize: "0.85rem", color: "#444", fontWeight: 600 }}>Orders with eligible stock</div>
        </div>
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--cotton)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Partially / Fully Dispatched</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{partiallyDispatchedOrders.length} / {fullyDispatchedOrders.length}</div>
          <div style={{ fontSize: "0.85rem", color: "#444", fontWeight: 600 }}>Orders shipped</div>
        </div>
        <div style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", padding: "20px", background: "var(--indigo)", display: "flex", flexDirection: "column", gap: "8px", color: "#fff" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>Eligible Final Goods</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, lineHeight: 1.2 }}>
            {Object.entries(totalEligibleQuantityByUnit).map(([unit, qty]) => (
              <div key={unit}>{formatQty(qty.toFixed(0), unit, 0)}</div>
            ))}
            {Object.keys(totalEligibleQuantityByUnit).length === 0 && "0"}
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Awaiting shipment</div>
        </div>
      </div>

      <div className="page-grid">
        <section className="col-8 card" style={{ border: "3px solid #000", boxShadow: "4px 4px 0px #000", background: "#fff" }}>
          <div className="card__head" style={{ borderBottom: "2px solid #000", paddingBottom: 16, marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 8px 0" }}>Dispatch-Ready Orders</h2>
              <div className="filter-row" role="group">
                {["ALL", "READY", "PARTIAL"].map(t => (
                  <button 
                    key={t} 
                    className={`filter-chip ${filter === t ? "filter-chip--active" : ""}`} 
                    style={{ border: "2px solid #000", fontWeight: "bold" }} 
                    onClick={() => setFilter(t)}
                  >
                    {t === "READY" ? "Fully Ready" : t === "PARTIAL" ? "Partially Ready" : "All Pending"}
                  </button>
                ))}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                  <input 
                    type="text" 
                    placeholder="Search order or buyer..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    style={{ border: "2px solid #000", padding: "6px 12px", background: "#fff", fontWeight: 500 }}
                  />
                </div>
              </div>
            </div>
          </div>
          <DataTable 
            headers={["Order", "Buyer", "Remaining", "Eligible Stock", "Status", ""]} 
            rows={displayedOrders.map(order => {
              const remaining = new Decimal(order.remaining || 0);
              return [
                <Link href={`/orders/${encodeURIComponent(order.code)}`} className="code" style={{ fontWeight: 700 }}>{order.code}</Link>,
                order.buyer,
                <span className="num">{formatQty(remaining.toFixed(2), order.unit, 0)}</span>,
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span className="num" style={{ fontWeight: 700, color: order.isReady ? "var(--neem)" : order.isPartiallyReady ? "var(--turmeric-dark, #b45309)" : "var(--madder)" }}>
                    {formatQty(order.eligibleQty.toFixed(2), order.unit as any, 0)}
                  </span>
                  <span style={{ fontSize: 11, color: "#666" }}>{order.orderRolls.length} rolls</span>
                </div>,
                order.isReady ? <StatusBadge status="COMPLETED" label="FULLY READY" /> : order.isPartiallyReady ? <StatusBadge status="IN_PROGRESS" label="PARTIAL STOCK" /> : <StatusBadge status="AWAITING_INSPECTION" label="WAITING PRODUCTION" />,
                <Link href={`/dispatch/orders`} className="btn btn--secondary btn--sm" style={{ border: "2px solid #000", boxShadow: "2px 2px 0px #000", fontWeight: "bold", whiteSpace: "nowrap" }}>Process <ArrowRight size={12}/></Link>
              ];
            })}
            empty={<EmptyState title="No orders match your filters" />}
          />
        </section>

        <section className="col-4 stack">
          <Card title="Recent Dispatches">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {recentDispatches.map(shipment => (
                <div key={shipment.id} style={{ borderBottom: "1px solid #ddd", paddingBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <Link href={`/dispatch/${shipment.id}`} className="code" style={{ fontWeight: 700 }}>{shipment.code}</Link>
                    <span style={{ fontSize: 12, color: "#666" }}>{formatDate(shipment.plannedAt)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>{shipment.orderCode}</span>
                    <span className="num" style={{ fontWeight: 700 }}>{formatQty(shipment.qty, shipment.unit, 0)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    Vehicle: {shipment.vehicle || "N/A"}
                  </div>
                </div>
              ))}
              {recentDispatches.length === 0 && <span style={{ color: "#666" }}>No recent dispatches found.</span>}
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}

export function DispatchActiveOrdersPage() {
  const { data, user, toast } = useDemo();
  const [shippingOrder, setShippingOrder] = useState<Order | null>(null);
  
  // Modal form states
  const [vehicle, setVehicle] = useState("");
  const [driverName, setDriverName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [transportAgency, setTransportAgency] = useState("");
  const [ewayBillNumber, setEwayBillNumber] = useState("");
  const [plannedAt, setPlannedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [invoiceMode, setInvoiceMode] = useState(true);
  const [selectedRollIds, setSelectedRollIds] = useState<Set<string>>(new Set());
  const [scannedRollCode, setScannedRollCode] = useState("");

  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, READY, PARTIAL, COMPLETED, PRODUCTION

  const activeOrders = data.orders.filter(o => o.status !== "CANCELLED");
  const acceptedRolls = data.rolls.filter(r => r.status === "ACCEPTED");

  // Augment orders with readiness
  const ordersWithReadiness = activeOrders.map(o => {
    const orderRolls = acceptedRolls.filter(r => r.orderCode === o.code);
    const eligibleQty = orderRolls.reduce((sum, r) => sum.plus(r.qty), new Decimal(0));
    const remaining = new Decimal(o.remaining || 0);
    const isCompleted = o.displayStatus === "COMPLETED" || remaining.lte(0);
    const isReady = !isCompleted && eligibleQty.gte(remaining);
    const isPartiallyReady = !isCompleted && eligibleQty.gt(0) && eligibleQty.lt(remaining);
    const inProduction = !isCompleted && !isReady && !isPartiallyReady;

    return { ...o, eligibleQty, isReady, isPartiallyReady, isCompleted, inProduction, orderRolls };
  });

  const filteredOrders = ordersWithReadiness.filter(order => {
    const matchesSearch = !search || `${order.code} ${order.buyer} ${order.product}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "ALL" 
      || (filter === "READY" && order.isReady)
      || (filter === "PARTIAL" && order.isPartiallyReady)
      || (filter === "PRODUCTION" && order.inProduction)
      || (filter === "COMPLETED" && order.isCompleted);
    return matchesSearch && matchesFilter;
  });

  const openShipModal = (order: any) => {
    setShippingOrder(order);
    setSelectedRollIds(new Set()); // Require manual selection
    setVehicle("");
    setDriverName("");
    setLicensePlate("");
    setTransportAgency("");
    setEwayBillNumber("");
    setScannedRollCode("");
    setPlannedAt(new Date().toISOString().slice(0, 16));
  };

  const closeShipModal = () => {
    setShippingOrder(null);
  };

  // Derive selection stats
  const eligibleRollsForModal = shippingOrder ? acceptedRolls.filter(r => r.orderCode === shippingOrder.code) : [];
  const selectedRolls = eligibleRollsForModal.filter(r => selectedRollIds.has(r.id));
  const selectedQty = selectedRolls.reduce((sum, r) => sum.plus(r.qty), new Decimal(0));
  const orderRemaining = shippingOrder ? new Decimal(shippingOrder.remaining || 0) : new Decimal(0);
  const exceedsRemaining = selectedQty.gt(orderRemaining);
  const validSelection = selectedRolls.length > 0 && !exceedsRemaining;

  const handleScanRoll = () => {
    const code = scannedRollCode.trim().toUpperCase();
    if (!code) return;
    const found = eligibleRollsForModal.find(r => r.code.toUpperCase() === code);
    if (found) {
      const next = new Set(selectedRollIds);
      if (!next.has(found.id)) {
        next.add(found.id);
        setSelectedRollIds(next);
        setScannedRollCode("");
      } else {
        toast("Already selected", `Roll ${found.code} is already added to load.`, "warning");
      }
    } else {
      toast("Invalid Roll", `Roll ${code} is not eligible for this order. It must be ACCEPTED and belong to ${shippingOrder?.code}.`, "error");
    }
  };

  const toggleRoll = (rollId: string) => {
    const next = new Set(selectedRollIds);
    if (next.has(rollId)) next.delete(rollId);
    else next.add(rollId);
    setSelectedRollIds(next);
  };

  async function handleFulfillOrder(e: FormEvent) {
    e.preventDefault();
    if (!shippingOrder) return;
    if (!validSelection) {
      toast("Invalid Selection", "You must select at least one roll, and total quantity cannot exceed order remaining.", "error");
      return;
    }
    if (!vehicle.trim() && !licensePlate.trim()) {
      toast("Vehicle required", "Please enter vehicle / license plate details.", "error");
      return;
    }

    setBusy(true);

    try {
      const rollIds = Array.from(selectedRollIds);
      const invoiceCode = invoiceMode ? `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` : undefined;

      const res = await fetch("/api/dispatch/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode: shippingOrder.code,
          rollIds: rollIds,
          buyer: shippingOrder.buyer,
          vehicle: vehicle.trim() || licensePlate.trim(),
          driverName: driverName.trim(),
          licensePlate: licensePlate.trim() || vehicle.trim(),
          transportAgency: transportAgency.trim(),
          ewayBillNumber: ewayBillNumber.trim(),
          plannedAt: new Date(plannedAt).toISOString(),
          invoice: invoiceCode,
          actor: user?.name || "Dispatch Officer"
        })
      });

      const resData = await res.json();
      if (resData.success) {
        toast("Dispatch Confirmed!", invoiceCode ? `Order ${shippingOrder.code} shipped. Invoice ${invoiceCode} generated.` : `Order ${shippingOrder.code} shipped successfully.`, "success");
        closeShipModal();
        window.location.reload();
      } else {
        toast("Shipment failed", resData.error || "Failed to dispatch order", "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader 
        eyebrow="Outbound Logistics" 
        title="Fulfillment Queue" 
        description="Select orders with eligible stock, assign specific rolls to the shipment, and dispatch to generate invoices."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <LinkButton href="/dispatch/dashboard" variant="secondary">
              <ArrowLeft size={14}/> Dashboard
            </LinkButton>
            <LinkButton href="/dispatch/stock" variant="quiet">
              Finished Goods Shelf
            </LinkButton>
          </div>
        }
      />

      <div className="filter-row" role="group" style={{ marginBottom: 20 }}>
        {["READY", "PARTIAL", "PRODUCTION", "COMPLETED", "ALL"].map(t => (
          <button 
            key={t} 
            className={`filter-chip ${filter === t ? "filter-chip--active" : ""}`} 
            style={{ border: "2px solid #000", fontWeight: "bold" }} 
            onClick={() => setFilter(t)}
          >
            {t === "READY" ? "Fully Ready" : t === "PARTIAL" ? "Partially Ready" : t === "PRODUCTION" ? "In Production" : t === "COMPLETED" ? "Shipped" : "All Orders"}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <input 
            type="text" 
            placeholder="Search order or buyer..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ border: "2px solid #000", padding: "6px 12px", background: "#fff", fontWeight: 500 }}
          />
        </div>
      </div>

      <Card title="Order Dispatch Queue" action={<Tag>{filteredOrders.length} orders</Tag>}>
        <DataTable 
          headers={["Order", "Buyer", "Due Date", "Progress", "Balance", "Eligible", "Status", "Action"]}
          rows={filteredOrders.map(order => {
            return [
              <div>
                <Link href={`/orders/${encodeURIComponent(order.code)}`} className="cell-primary code" style={{ fontWeight: 700 }}>
                  {order.code}
                </Link>
                <span className="cell-secondary">{order.priority} PRIORITY</span>
              </div>,
              <strong>{order.buyer}</strong>,
              <span>{formatDate(order.due)}</span>,
              <div style={{ minWidth: 120 }}>
                <Meter value={order.dispatched} total={order.ordered} label="Dispatched" showNumbers={false}/>
                <span className="cell-secondary num" style={{ fontSize: 11 }}>
                  {formatQty(order.dispatched, order.unit as any, 0)} / {formatQty(order.ordered, order.unit as any, 0)}
                </span>
              </div>,
              <span className="num" style={{ fontWeight: order.isCompleted ? "normal" : "bold", color: order.isCompleted ? "#888" : "inherit" }}>
                {formatQty(order.remaining, order.unit as any, 0)} remaining
              </span>,
              <span className="num" style={{ color: order.isReady ? "var(--neem)" : order.isPartiallyReady ? "var(--turmeric-dark, #b45309)" : "inherit" }}>
                {formatQty(order.eligibleQty.toFixed(2), order.unit as any, 0)} ready
              </span>,
              order.isCompleted ? <StatusBadge status="COMPLETED" label="COMPLETED"/> : order.isReady ? <StatusBadge status="COMPLETED" label="READY"/> : order.isPartiallyReady ? <StatusBadge status="IN_PROGRESS" label="PARTIAL STOCK"/> : <StatusBadge status="AWAITING_INSPECTION" label="IN PRODUCTION"/>,
              order.isCompleted ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--neem)", fontWeight: 700, fontSize: 12 }}>
                  <CheckCircle2 size={16}/> Shipped
                </span>
              ) : (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => openShipModal(order)}
                  disabled={order.eligibleQty.lte(0)}
                  style={{ border: "2px solid #000", boxShadow: "2px 2px 0 #000", fontWeight: 800 }}
                >
                  <Truck size={14}/> {order.isReady ? "Ship Order" : "Ship Partial"}
                </Button>
              )
            ];
          })}
          empty={<EmptyState title="No orders found" detail="No orders match your filter criteria."/>}
        />
      </Card>

      {/* Ship Order Modal */}
      {shippingOrder && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20
        }}>
          <div style={{
            background: "#fff", border: "4px solid #000", boxShadow: "8px 8px 0px #000",
            maxWidth: 1000, width: "100%", maxHeight: "90vh", overflowY: "auto",
            display: "flex", flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #000", padding: "16px 24px", background: "var(--paper)" }}>
              <div>
                <span className="kicker" style={{ color: "var(--indigo)" }}>Fulfillment Selection</span>
                <h2 style={{ margin: "4px 0 0", font: "900 24px var(--font-display)" }}>Dispatch: {shippingOrder.code}</h2>
              </div>
              <button onClick={closeShipModal} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24}/></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px" }}>
              <div style={{ padding: 24, borderRight: "2px solid #000" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>Select Rolls to Dispatch</h3>
                
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <TextInput 
                    placeholder="Scan or type roll code..." 
                    value={scannedRollCode}
                    onChange={(e) => setScannedRollCode(e.target.value)}
                    onKeyDown={(e) => { if(e.key === "Enter") { e.preventDefault(); handleScanRoll(); } }}
                    style={{ flex: 1 }}
                  />
                  <Button variant="secondary" onClick={handleScanRoll} type="button">Add Roll</Button>
                </div>

                <DataTable
                  headers={["Pick", "Roll Code", "Lot/Shade", "Quantity", "Location"]}
                  rows={eligibleRollsForModal.map(r => [
                    <input 
                      type="checkbox" 
                      checked={selectedRollIds.has(r.id)} 
                      onChange={() => toggleRoll(r.id)} 
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />,
                    <span className="code">{r.code}</span>,
                    `${r.dyeLot || ''} ${r.colour || ''}`,
                    <span className="num">{formatQty(r.qty, r.unit, 2)}</span>,
                    r.location
                  ])}
                  empty={<EmptyState title="No eligible rolls" detail="No ACCEPTED rolls in final-goods for this order." />}
                />
              </div>

              <div style={{ padding: 24, background: "var(--cotton)" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>Dispatch Confirmation</h3>
                
                <div style={{ background: "#fff", border: "2px solid #000", padding: 12, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "#666", fontWeight: 700, textTransform: "uppercase" }}>
                    <span>Selected</span>
                    <span>Remaining Limit</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 24, fontWeight: 900, color: exceedsRemaining ? "var(--madder)" : "var(--indigo)" }}>
                      {formatQty(selectedQty.toFixed(2), shippingOrder.unit as any, 0)}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#444" }}>
                      / {formatQty(orderRemaining.toFixed(2), shippingOrder.unit as any, 0)}
                    </span>
                  </div>
                  {exceedsRemaining && (
                    <div style={{ marginTop: 8, color: "var(--madder)", fontWeight: 700, fontSize: 12 }}>
                      <ShieldAlert size={14} style={{ verticalAlign: "middle", marginRight: 4 }}/> Exceeds order remainder
                    </div>
                  )}
                  {!exceedsRemaining && selectedQty.gt(0) && selectedQty.lt(orderRemaining) && (
                    <div style={{ marginTop: 8, color: "var(--turmeric-dark, #b45309)", fontWeight: 700, fontSize: 12 }}>
                      Partial Dispatch ({(orderRemaining.minus(selectedQty)).toFixed(2)} left)
                    </div>
                  )}
                  {!exceedsRemaining && selectedQty.eq(orderRemaining) && selectedQty.gt(0) && (
                    <div style={{ marginTop: 8, color: "var(--neem)", fontWeight: 700, fontSize: 12 }}>
                      <CheckCircle2 size={14} style={{ verticalAlign: "middle", marginRight: 4 }}/> Full Dispatch
                    </div>
                  )}
                </div>

                <form onSubmit={handleFulfillOrder} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Field label="Vehicle Registration / ID *">
                    <TextInput value={vehicle} onChange={e => { setVehicle(e.target.value); setLicensePlate(e.target.value); }} placeholder="MH-12-AB-1234" required />
                  </Field>
                  <Field label="Transport Agency">
                    <TextInput value={transportAgency} onChange={e => setTransportAgency(e.target.value)} placeholder="VRL Logistics" />
                  </Field>
                  <Field label="Driver Name">
                    <TextInput value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Name (Optional)" />
                  </Field>
                  <Field label="E-Way Bill Number">
                    <TextInput value={ewayBillNumber} onChange={e => setEwayBillNumber(e.target.value)} placeholder="EWB-..." />
                  </Field>
                  <Field label="Dispatch Date & Time *">
                    <TextInput type="datetime-local" value={plannedAt} onChange={e => setPlannedAt(e.target.value)} required />
                  </Field>

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
                    <input type="checkbox" checked={invoiceMode} onChange={e => setInvoiceMode(e.target.checked)} style={{ width: 16, height: 16 }} />
                    Auto-generate Accounts Receivable Invoice
                  </label>

                  <Button type="submit" variant="primary" size="lg" disabled={busy || !validSelection} style={{ border: "2px solid #000", boxShadow: "3px 3px 0 #000", fontWeight: 900, marginTop: 12 }}>
                    <Truck size={18}/> {busy ? "Processing…" : "Confirm Dispatch"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DispatchRoute({ path, id }: { path: string; id?: string }) {
  if (path === "/dispatch/orders") return <DispatchActiveOrdersPage/>;
  if (path === "/dispatch/new") return <NewShipmentPage/>;
  if (path === "/dispatch/stock") return <FinishedStockPage/>;
  if (path.startsWith("/print/dispatch/")) return <PrintDispatchPage id={id ?? ""}/>;
  if (path.startsWith("/print/roll-tag/")) return <PrintRollTagPage id={id ?? ""}/>;
  if (path.startsWith("/dispatch/") && id) return <ShipmentPage id={id}/>;
  return <SupervisorDispatchDashboard/>;
}

function DispatchListPage() {
  const { data } = useDemo();
  const pending = data.shipments.filter((shipment) => shipment.status === "DRAFT").length;
  const dispatched = data.shipments.filter((shipment) => shipment.status === "DISPATCHED").length;
  const readyRolls = data.rolls.filter((roll) => roll.status === "ACCEPTED");
  const availableByUnit = [...new Set(readyRolls.map((roll) => roll.unit))].map((unit) => formatQty(readyRolls.filter((roll) => roll.unit === unit).reduce((sum, roll) => sum.plus(roll.qty), new Decimal(0)).toFixed(3), unit, 0));
  const availableLabel = availableByUnit.join(" · ") || "0";
  return <><PageHeader eyebrow="Order fulfilment · outbound" title="Dispatch" description="Only accepted rolls may be allocated. A load stays draft until the reserved list is revalidated at confirmation." actions={<><LinkButton href="/dispatch/orders" variant="primary"><Truck size={14}/> Active & Pending Orders</LinkButton><LinkButton href="/dispatch/stock" variant="secondary"><PackageCheck size={14}/> Finished stock</LinkButton><Can perm="dispatch.create"><LinkButton href="/dispatch/new" variant="primary"><Truck size={14}/> Build shipment</LinkButton></Can></>} meta={<><Tag>{readyRolls.length} ACCEPTED ROLLS</Tag><Tag>{availableLabel} ELIGIBLE</Tag></>} /><div className="stat-grid"><div className="stat-card stat-card--neem"><div className="stat-card__top">Finished stock · eligible</div><strong>{readyRolls.length}</strong><div className="stat-card__bottom">ACCEPTED only</div></div><div className="stat-card stat-card--indigo"><div className="stat-card__top">Eligible quantity</div><strong>{availableLabel}</strong><div className="stat-card__bottom">grouped by order</div></div><div className="stat-card stat-card--turmeric"><div className="stat-card__top">Draft loads</div><strong>{pending}</strong><div className="stat-card__bottom">not yet confirmed</div></div><div className="stat-card stat-card--cotton"><div className="stat-card__top">Dispatch records</div><strong>{dispatched}</strong><div className="stat-card__bottom">seeded history</div></div></div><div className="page-grid"><Card className="col-8" title="Shipment register" action={<Tag>{data.shipments.length} examples</Tag>}><DataTable headers={["Shipment", "Order / buyer", "Plan time", "Rolls · qty", "Vehicle", "State", "Invoice", ""]} rows={data.shipments.map((shipment) => [<Link href={`/dispatch/${shipment.id}`} className="cell-primary code">{shipment.code}</Link>, <div><Link href={`/orders/${encodeURIComponent(shipment.orderCode)}`} className="cell-primary">{shipment.orderCode}</Link><span className="cell-secondary">{shipment.buyer}</span></div>, formatDateTime(shipment.plannedAt), <span className="num">{shipment.rolls} · {formatQty(shipment.qty,shipment.unit,0)}</span>, shipment.vehicle || "Not set", <StatusBadge status={shipment.status}/>, shipment.invoice ?? <StatusBadge status="MISSING" label="Not created"/>, <Link href={`/dispatch/${shipment.id}`} className="btn btn--secondary btn--sm">Load <ArrowRight size={12}/></Link>])}/></Card><Card className="col-4" title="Dispatch guardrails"><div className="stack-sm"><InfoStrip tone="success">Accepted only. Rework, reject, quarantine, awaiting inspection, and already dispatched are all ineligible.</InfoStrip><InfoStrip tone="warning">A roll must belong to the same order as the shipment. Quantity tolerance and remaining buyer commitment are rechecked by the live server.</InfoStrip><InfoStrip>Confirmation creates one session-only demo invoice reference; it is not a tax invoice or external record.</InfoStrip></div></Card></div></>;
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
        toast("Shipment Confirmed", `Shipment ${shipment?.code || shipmentId} has been dispatched.`, "success");
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
