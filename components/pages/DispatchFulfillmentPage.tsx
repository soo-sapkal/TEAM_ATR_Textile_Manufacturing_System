"use client";

import { useState } from "react";
import { RoleLink as Link } from "@/components/ui/primitives";
import Decimal from "decimal.js";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileText,
  Package,
  Printer,
  QrCode,
  ScanLine,
  ShieldCheck,
  Truck,
  UserCheck,
  X,
} from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { formatDate, formatDateTime, formatMoney, formatQty } from "@/lib/domain/format";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  InfoStrip,
  Kicker,
  LinkButton,
  Meter,
  PageHeader,
  SelectInput,
  StatCard,
  StatusBadge,
  Tag,
  TextInput,
} from "@/components/ui/primitives";
import type { FabricRoll, Order, Shipment } from "@/lib/domain/types";

export function DispatchFulfillmentPage() {
  const { data, user, toast } = useDemo();
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");

  // Multi-step fulfillment modal state
  const [fulfillingOrder, setFulfillingOrder] = useState<Order | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRollIds, setSelectedRollIds] = useState<Set<string>>(new Set());
  const [scannedRollCode, setScannedRollCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState("ALL"); // ALL, READY, PARTIAL, IN_PRODUCTION

  // Step 2: Transport & Vehicle details (matches DB Analysis Note fields)
  const [transportAgency, setTransportAgency] = useState("VRL Logistics Ltd.");
  const [licensePlate, setLicensePlate] = useState("KA-04-ME-5678");
  const [driverName, setDriverName] = useState("Ramesh Chandra");
  const [driverPhone, setDriverPhone] = useState("+91 98450 12345");
  const [ewayBillNumber, setEwayBillNumber] = useState("EWB-2026-8841-9023");
  const [plannedDeparture, setPlannedDeparture] = useState(
    new Date().toISOString().slice(0, 16)
  );

  const [generatedInvoiceNo, setGeneratedInvoiceNo] = useState("");
  const [generatedGatePassNo, setGeneratedGatePassNo] = useState("");
  const [completedOrderIds, setCompletedOrderIds] = useState<string[]>([]);

  // Document viewing state
  const [viewingDocument, setViewingDocument] = useState<{
    type: "invoice" | "gatePass" | "manifest";
    order: Order;
    rolls: FabricRoll[];
    invoiceNo?: string;
    gatePassNo?: string;
  } | null>(null);

  // Rolls eligible for fulfillment for selected order
  const getOrderRolls = (orderCode: string): FabricRoll[] => {
    return data.rolls.filter(
      (r) =>
        r.orderCode === orderCode &&
        ["ACCEPTED", "RESERVED"].includes(r.status)
    );
  };

  // Pending orders: orders with remaining quantity
  const pendingOrders = data.orders.filter(
    (order) =>
      !completedOrderIds.includes(order.id) &&
      order.status !== "CANCELLED" &&
      order.status !== "DRAFT" &&
      Number(order.remaining) > 0
  );

  const filteredPendingOrders = pendingOrders.filter((order) => {
    const rolls = getOrderRolls(order.code);
    const hasReadyRolls = rolls.length > 0;
    const isPartiallyDispatched = Number(order.dispatched) > 0;

    const matchesSearch =
      !searchQuery ||
      `${order.code} ${order.buyer} ${order.product} ${order.colour}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesFilter =
      orderFilter === "ALL" ||
      (orderFilter === "READY" && hasReadyRolls) ||
      (orderFilter === "PARTIAL" && isPartiallyDispatched) ||
      (orderFilter === "IN_PRODUCTION" && !hasReadyRolls);

    return matchesSearch && matchesFilter;
  });

  // Completed orders: orders where dispatched equals ordered or marked completed
  const completedOrders = data.orders.filter(
    (order) =>
      completedOrderIds.includes(order.id) ||
      (Number(order.dispatched) > 0 && Number(order.remaining) <= 0)
  );

  // Completed shipments
  const completedShipments = data.shipments.filter(
    (s) => s.status === "DISPATCHED"
  );

  const handleStartFulfill = (order: Order) => {
    setFulfillingOrder(order);
    const eligible = getOrderRolls(order.code);
    setSelectedRollIds(new Set(eligible.map((r) => r.id)));
    setScannedRollCode("");
    setStep(1);
    setTransportAgency("VRL Logistics Ltd.");
    setLicensePlate("KA-04-ME-5678");
    setDriverName("Ramesh Chandra");
    setDriverPhone("+91 98450 12345");
    setEwayBillNumber(`EWB-2026-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`);
    setGeneratedInvoiceNo(`INV-2026-${String(Math.floor(40 + Math.random() * 60)).padStart(4, "0")}`);
    setGeneratedGatePassNo(`GP-2026-${String(Math.floor(100 + Math.random() * 900)).padStart(4, "0")}`);
  };

  const handleCloseFulfill = () => {
    setFulfillingOrder(null);
    setSelectedRollIds(new Set());
    setStep(1);
  };

  const handleDownload = (filename: string, content: string, label: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast(`${label} downloaded`, `Saved ${filename} to your downloads.`, "success");
  };

  const handleDownloadLoadingManifest = (order: Order, rolls: FabricRoll[]) => {
    setViewingDocument({ type: "manifest", order, rolls });
  };

  const handleDownloadInvoice = (order: Order, rolls: FabricRoll[], invoiceNo?: string, gatePassNo?: string) => {
    setViewingDocument({ type: "invoice", order, rolls, invoiceNo: invoiceNo || generatedInvoiceNo || `INV-2026-${order.code.slice(-4)}`, gatePassNo: gatePassNo || generatedGatePassNo || `GP-2026-${order.code.slice(-4)}` });
  };

  const handleDownloadGatePass = (order: Order, rolls: FabricRoll[], invoiceNo?: string, gatePassNo?: string) => {
    setViewingDocument({ type: "gatePass", order, rolls, invoiceNo: invoiceNo || generatedInvoiceNo || `INV-2026-${order.code.slice(-4)}`, gatePassNo: gatePassNo || generatedGatePassNo || `GP-2026-${order.code.slice(-4)}` });
  };

  const handleConfirmFulfillment = async () => {
    if (!fulfillingOrder) return;

    const allRolls = getOrderRolls(fulfillingOrder.code);
    const rolls = allRolls.filter((r) => selectedRollIds.has(r.id));
    if (rolls.length === 0) {
      toast("No Rolls Selected", "Please select at least one roll to load onto the truck.", "error");
      return;
    }

    const totalMeters = rolls.reduce((sum, r) => sum.plus(r.qty), new Decimal(0));
    const ratePerMeter = new Decimal(fulfillingOrder.revenue).div(fulfillingOrder.ordered).toFixed(2);
    const totalAmount = totalMeters.mul(ratePerMeter).mul(1.05).toFixed(2);

    try {
      const res = await fetch("/api/dispatch/fulfill", {
        method: "POST",
        body: JSON.stringify({
          orderCode: fulfillingOrder.code,
          rollIds: rolls.map((r) => r.id),
          buyer: fulfillingOrder.buyer,
          vehicle: licensePlate,
          driverName,
          licensePlate,
          transportAgency,
          ewayBillNumber,
          plannedAt: plannedDeparture,
          invoice: generatedInvoiceNo,
          amount: totalAmount,
          actor: user?.name
        })
      });
      const resData = await res.json();

      if (resData.success) {
        toast(
          "Fulfillment Completed!",
          `Order ${fulfillingOrder.code} fulfilled. Shipment ${resData.shipment.code} and invoice ${generatedInvoiceNo} created.`,
          "success"
        );
        setCompletedOrderIds((prev) => [...prev, fulfillingOrder.id]);
        handleCloseFulfill();
        window.location.reload();
      } else {
        toast("Failed to Fulfill", resData.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Logistics & Outbound Operations"
        title="Fulfillment Dashboard"
        description="Streamlined fulfillment workflow for Dispatch Officers. Generate loading manifests, capture transport vehicle details, and issue official gate passes and tax invoices."
        actions={
          <>
            <LinkButton href="/dispatch/stock" variant="secondary">
              <Package size={15} /> Finished Goods (Shelf)
            </LinkButton>
          </>
        }
        meta={
          <>
            <span className="tag">OFFICER: {user?.name?.toUpperCase() ?? "DISPATCH DESK"}</span>
            <span className="tag">{pendingOrders.length} ORDERS PENDING FULFILLMENT</span>
          </>
        }
      />

      {/* Logistics Overview Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label="Pending Fulfillment"
          value={pendingOrders.length}
          detail="Orders with ready fabric in FG"
          icon={Package}
          tone="turmeric"
        />
        <StatCard
          label="Completed Orders"
          value={completedOrders.length}
          detail="100% fulfilled & dispatched"
          icon={CheckCircle2}
          tone="neem"
        />
        <StatCard
          label="Dispatched Trucks"
          value={completedShipments.length}
          detail="Active carrier outward passes"
          icon={Truck}
          tone="indigo"
        />
        <StatCard
          label="Finished Goods in Bay"
          value={data.rolls.filter((r) => r.status === "ACCEPTED").length}
          detail="Accepted rolls ready for loading"
          icon={ShieldCheck}
          tone="cotton"
        />
      </div>

      {/* Tabs: Pending Orders vs Completed Orders */}
      <div className="filter-row" role="tablist" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className={`filter-chip ${activeTab === "pending" ? "filter-chip--active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Orders ({pendingOrders.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === "completed" ? "filter-chip--active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          Completed Orders ({completedOrders.length})
        </button>
      </div>

      {/* TAB 1: PENDING ORDERS */}
      {activeTab === "pending" && (
        <Card
          title="Orders Needing Fulfillment"
          action={
            <span className="cell-secondary" style={{ fontSize: 11 }}>
              Click “Fulfill Order” to launch the 3-step manifest, carrier, and invoice workflow
            </span>
          }
        >
          {/* Subfilter chips and Search Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div className="filter-row" role="group">
              {[
                { id: "ALL", label: `All Pending (${pendingOrders.length})` },
                { id: "READY", label: `Ready to Ship (${pendingOrders.filter(o => getOrderRolls(o.code).length > 0).length})` },
                { id: "PARTIAL", label: `Partially Dispatched (${pendingOrders.filter(o => Number(o.dispatched) > 0).length})` },
                { id: "IN_PRODUCTION", label: `Awaiting FG Stock (${pendingOrders.filter(o => getOrderRolls(o.code).length === 0).length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`filter-chip ${orderFilter === f.id ? "filter-chip--active" : ""}`}
                  style={{ border: "2px solid #000", fontWeight: 700 }}
                  onClick={() => setOrderFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="text"
                placeholder="Search order, buyer, product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: "2px solid #000",
                  padding: "7px 12px",
                  background: "#fff",
                  fontWeight: 600,
                  width: 250,
                }}
              />
            </div>
          </div>

          <div className="stack" style={{ gap: 14 }}>
            {filteredPendingOrders.map((order) => {
              const eligibleRolls = getOrderRolls(order.code);
              const readyMeters = eligibleRolls.reduce(
                (sum, r) => sum.plus(r.qty),
                new Decimal(0)
              );

              return (
                <div
                  key={order.id}
                  style={{
                    border: "1.5px solid var(--ink)",
                    backgroundColor: "var(--white)",
                    padding: "16px 18px",
                    boxShadow: "2px 2px 0 var(--ink)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="code cell-primary" style={{ fontSize: 16, fontWeight: 900 }}>
                          {order.code}
                        </span>
                        <StatusBadge status={order.displayStatus} />
                        <span className="tag">{order.priority} PRIORITY</span>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, fontWeight: 800 }}>
                        {order.buyer} <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}>· {order.product} ({order.colour})</span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className="cell-secondary" style={{ fontSize: 10 }}>Delivery Due Date</span>
                      <strong className="num" style={{ fontSize: 13 }}>
                        {formatDate(order.due)}
                      </strong>
                    </div>
                  </div>

                  {/* Quantities Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      gap: 10,
                      backgroundColor: "var(--cotton)",
                      padding: "10px 14px",
                      border: "1px solid var(--line-dark)",
                    }}
                  >
                    <div>
                      <span className="cell-secondary" style={{ fontSize: 10 }}>Ordered Total</span>
                      <strong className="num" style={{ fontSize: 13 }}>
                        {formatQty(order.ordered, order.unit, 0)}
                      </strong>
                    </div>
                    <div>
                      <span className="cell-secondary" style={{ fontSize: 10 }}>Ready in FG Bay</span>
                      <strong className="num" style={{ fontSize: 13, color: "var(--neem)" }}>
                        {formatQty(readyMeters.toString(), order.unit, 0)} ({eligibleRolls.length} Rolls)
                      </strong>
                    </div>
                    <div>
                      <span className="cell-secondary" style={{ fontSize: 10 }}>Already Dispatched</span>
                      <strong className="num" style={{ fontSize: 13 }}>
                        {formatQty(order.dispatched, order.unit, 0)}
                      </strong>
                    </div>
                    <div>
                      <span className="cell-secondary" style={{ fontSize: 10 }}>Remaining Balance</span>
                      <strong className="num" style={{ fontSize: 13, color: "var(--madder)" }}>
                        {formatQty(order.remaining, order.unit, 0)}
                      </strong>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 4,
                      paddingTop: 8,
                      borderTop: "1px solid var(--line)",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                      {eligibleRolls.length > 0
                        ? `${eligibleRolls.length} rolls inspected and eligible for immediate outward allocation.`
                        : "Fabric rolls are undergoing weaving or dyeing operations (none in FG yet)."}
                    </span>

                    {eligibleRolls.length > 0 ? (
                      <button
                        type="button"
                        className="btn btn--primary btn--md"
                        onClick={() => handleStartFulfill(order)}
                        style={{
                          padding: "8px 18px",
                          fontSize: 13,
                          fontWeight: 900,
                          backgroundColor: "var(--indigo)",
                        }}
                      >
                        <Truck size={15} /> Fulfill Order
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        disabled
                        style={{
                          opacity: 0.65,
                          cursor: "not-allowed",
                          border: "2px solid #000",
                          fontWeight: 700,
                        }}
                      >
                        <Clock size={13} style={{ verticalAlign: "middle", marginRight: 4 }} /> Awaiting Finished Stock
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredPendingOrders.length === 0 && (
              <EmptyState
                title="No orders found"
                detail={searchQuery ? "No pending orders match your search query." : "There are no pending fulfillment requests matching this filter."}
              />
            )}
          </div>
        </Card>
      )}

      {/* TAB 2: COMPLETED ORDERS */}
      {activeTab === "completed" && (
        <Card
          title="Completed & Fulfilled Orders"
          action={<span className="tag">{completedShipments.length} DISPATCHED SHIPMENTS</span>}
        >
          <div className="stack" style={{ gap: 14 }}>
            {completedShipments.map((shipment) => (
              <div
                key={shipment.id}
                style={{
                  border: "1.5px solid var(--line-dark)",
                  backgroundColor: "var(--white)",
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="code cell-primary" style={{ fontSize: 15, fontWeight: 900 }}>
                        {shipment.code}
                      </span>
                      <StatusBadge status={shipment.status} />
                      <span className="tag">ORDER: {shipment.orderCode}</span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, fontWeight: 800 }}>
                      Buyer: {shipment.buyer} · Carrier Vehicle: <strong>{shipment.vehicle}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span className="cell-secondary" style={{ fontSize: 10 }}>Invoice Reference</span>
                    <strong className="code" style={{ fontSize: 13, color: "var(--indigo)" }}>
                      {shipment.invoice ?? "INV-2026-0031"}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: "1px solid var(--cotton-2)",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    Dispatched on {formatDate(shipment.plannedAt)} · {shipment.rolls} Rolls · {formatQty(shipment.qty, shipment.unit, 0)}
                  </span>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        const fakeOrder = data.orders.find((o) => o.code === shipment.orderCode) ?? data.orders[0];
                        const fakeRolls = data.rolls.filter((r) => shipment.rollIds?.includes(r.id)).slice(0, shipment.rolls);
                        handleDownloadInvoice(fakeOrder, fakeRolls.length ? fakeRolls : data.rolls.slice(0, shipment.rolls), shipment.invoice ?? undefined);
                      }}
                    >
                      <Download size={13} /> Invoice
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        const fakeOrder = data.orders.find((o) => o.code === shipment.orderCode) ?? data.orders[0];
                        const fakeRolls = data.rolls.filter((r) => shipment.rollIds?.includes(r.id)).slice(0, shipment.rolls);
                        handleDownloadGatePass(fakeOrder, fakeRolls.length ? fakeRolls : data.rolls.slice(0, shipment.rolls), shipment.invoice ?? undefined);
                      }}
                    >
                      <FileCheck size={13} /> Gate Pass
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {completedShipments.length === 0 && (
              <EmptyState
                title="No completed shipments"
                detail="Completed shipments will appear here once orders are dispatched."
              />
            )}
          </div>
        </Card>
      )}

      {/* MULTI-STEP FULFILLMENT WORKFLOW MODAL */}
      {fulfillingOrder && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(25, 27, 25, 0.7)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--paper)",
              border: "3px solid var(--ink)",
              boxShadow: "6px 6px 0 var(--ink)",
              maxWidth: 860,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
            }}
          >
            {/* Modal Head */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid var(--ink)",
                paddingBottom: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <span className="kicker">Fulfillment Workflow · {fulfillingOrder.code}</span>
                <h2 style={{ margin: "2px 0 0", font: "900 22px var(--font-display)" }}>
                  Order Dispatch & Transport Allocation
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={handleCloseFulfill}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper Progress Indicator */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  padding: "10px",
                  border: "2px solid var(--ink)",
                  backgroundColor: step >= 1 ? "var(--indigo)" : "var(--cotton)",
                  color: step >= 1 ? "#fff" : "var(--ink)",
                  fontWeight: 800,
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                Step 1: Loading Manifest
              </div>
              <div
                style={{
                  padding: "10px",
                  border: "2px solid var(--ink)",
                  backgroundColor: step >= 2 ? "var(--indigo)" : "var(--cotton)",
                  color: step >= 2 ? "#fff" : "var(--ink)",
                  fontWeight: 800,
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                Step 2: Vehicle Details
              </div>
              <div
                style={{
                  padding: "10px",
                  border: "2px solid var(--ink)",
                  backgroundColor: step >= 3 ? "var(--indigo)" : "var(--cotton)",
                  color: step >= 3 ? "#fff" : "var(--ink)",
                  fontWeight: 800,
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                Step 3: Invoice & Gate Pass
              </div>
            </div>

            {/* STEP 1: LOADING MANIFEST */}
            {step === 1 && (
              <div className="stack" style={{ gap: 16 }}>
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>
                    Step 1 · Warehouse Loading Manifest
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
                    Verify and select the exact rolls loaded onto the carrier vehicle. Only selected rolls will be dispatched.
                  </p>
                </div>

                {/* Scan Bar & Select All Controls */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, flex: 1, maxWidth: 450 }}>
                    <TextInput
                      placeholder="Scan roll tag or type roll code (e.g. ROLL-2026-101)..."
                      value={scannedRollCode}
                      onChange={(e) => setScannedRollCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const code = scannedRollCode.trim().toUpperCase();
                          const found = getOrderRolls(fulfillingOrder.code).find((r) => r.code.toUpperCase() === code);
                          if (found) {
                            setSelectedRollIds((prev) => new Set(prev).add(found.id));
                            setScannedRollCode("");
                            toast("Roll Added to Cargo", `Roll ${found.code} selected for loading.`, "success");
                          } else {
                            toast("Roll Not Found", `No matching roll ${code} in finished goods for this order.`, "warning");
                          }
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        const code = scannedRollCode.trim().toUpperCase();
                        const found = getOrderRolls(fulfillingOrder.code).find((r) => r.code.toUpperCase() === code);
                        if (found) {
                          setSelectedRollIds((prev) => new Set(prev).add(found.id));
                          setScannedRollCode("");
                          toast("Roll Added to Cargo", `Roll ${found.code} selected for loading.`, "success");
                        } else {
                          toast("Roll Not Found", `No matching roll ${code} in finished goods for this order.`, "warning");
                        }
                      }}
                      style={{ border: "2px solid #000" }}
                    >
                      <ScanLine size={14} /> Add
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        const all = getOrderRolls(fulfillingOrder.code);
                        setSelectedRollIds(new Set(all.map((r) => r.id)));
                      }}
                      style={{ border: "1.5px solid #000" }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn btn--quiet btn--sm"
                      onClick={() => setSelectedRollIds(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Roll items table */}
                <div style={{ border: "1.5px solid var(--line-dark)", backgroundColor: "var(--white)" }}>
                  <table className="data-table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}>Pick</th>
                        <th>Roll Code</th>
                        <th>Shade / Dye Lot</th>
                        <th>Quantity</th>
                        <th>Warehouse Location</th>
                        <th>Pre-Dispatch QC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getOrderRolls(fulfillingOrder.code).map((roll) => {
                        const isChecked = selectedRollIds.has(roll.id);
                        return (
                          <tr
                            key={roll.id}
                            style={{ backgroundColor: isChecked ? "rgba(43, 76, 126, 0.05)" : "transparent" }}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedRollIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(roll.id)) next.delete(roll.id);
                                    else next.add(roll.id);
                                    return next;
                                  });
                                }}
                                style={{ width: 18, height: 18, cursor: "pointer" }}
                              />
                            </td>
                            <td className="code" style={{ fontWeight: 900 }}>{roll.code}</td>
                            <td>{roll.colour} ({roll.dyeLot})</td>
                            <td className="num">{formatQty(roll.qty, roll.unit, 1)}</td>
                            <td>{roll.location}</td>
                            <td>
                              <StatusBadge status="ACCEPTED" label={roll.dispatchQcPassed ? "QC Verified" : "QC Passed"} />
                            </td>
                          </tr>
                        );
                      })}
                      {getOrderRolls(fulfillingOrder.code).length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: 18, color: "var(--ink-soft)" }}>
                            No accepted rolls in warehouse. Complete pre-dispatch QC in Quality module first.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "var(--cotton)",
                    padding: "10px 14px",
                    border: "1px solid var(--line)",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800 }}>
                    Cargo Selected: {selectedRollIds.size} of {getOrderRolls(fulfillingOrder.code).length} Rolls ·{" "}
                    {formatQty(
                      getOrderRolls(fulfillingOrder.code)
                        .filter((r) => selectedRollIds.has(r.id))
                        .reduce((sum, r) => sum.plus(r.qty), new Decimal(0))
                        .toString(),
                      fulfillingOrder.unit,
                      1
                    )}
                  </span>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() =>
                        handleDownloadLoadingManifest(
                          fulfillingOrder,
                          getOrderRolls(fulfillingOrder.code).filter((r) => selectedRollIds.has(r.id))
                        )
                      }
                      disabled={selectedRollIds.size === 0}
                    >
                      <Download size={13} /> Download Loading Manifest (.txt)
                    </button>
                    <button
                      type="button"
                      className="btn btn--quiet btn--sm"
                      onClick={() => window.print()}
                    >
                      <Printer size={13} /> Print
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                  <button type="button" className="btn btn--secondary btn--md" onClick={handleCloseFulfill}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--md"
                    onClick={() => setStep(2)}
                    disabled={selectedRollIds.size === 0}
                    style={{
                      border: "2px solid #000",
                      boxShadow: "2px 2px 0 #000",
                      fontWeight: 800,
                    }}
                  >
                    Proceed to Vehicle Details ({selectedRollIds.size} Rolls) <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: VEHICLE DETAILS */}
            {step === 2 && (
              <div className="stack" style={{ gap: 16 }}>
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>
                    Step 2 · Carrier & Transport Vehicle Details
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
                    Record commercial logistics provider, driver credentials, and Government E-Way bill information.
                  </p>
                </div>

                <div className="form-grid">
                  <Field label="Transport Agency / Fleet Carrier" hint="transport_agency column">
                    <TextInput
                      value={transportAgency}
                      onChange={(e) => setTransportAgency(e.target.value)}
                      placeholder="e.g. VRL Logistics Ltd."
                      required
                    />
                  </Field>

                  <Field label="Vehicle License Plate / Reg No." hint="license_plate column">
                    <TextInput
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      placeholder="e.g. KA-04-ME-5678"
                      required
                    />
                  </Field>

                  <Field label="Driver Full Name" hint="driver_name column">
                    <TextInput
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="e.g. Ramesh Chandra"
                      required
                    />
                  </Field>

                  <Field label="Driver Contact Phone">
                    <TextInput
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      placeholder="e.g. +91 98450 12345"
                      required
                    />
                  </Field>

                  <Field label="National E-Way Bill Number" hint="eway_bill_number column">
                    <TextInput
                      value={ewayBillNumber}
                      onChange={(e) => setEwayBillNumber(e.target.value)}
                      placeholder="e.g. EWB-2026-8841-9023"
                      required
                    />
                  </Field>

                  <Field label="Planned Gate Departure Time">
                    <TextInput
                      type="datetime-local"
                      value={plannedDeparture}
                      onChange={(e) => setPlannedDeparture(e.target.value)}
                      required
                    />
                  </Field>
                </div>

                <InfoStrip tone="info">
                  <strong>Statutory Notice:</strong> Transporter details and E-Way bill are electronically linked to the GST portal and verified at the mill security weighbridge.
                </InfoStrip>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                  <button type="button" className="btn btn--secondary btn--md" onClick={() => setStep(1)}>
                    <ArrowLeft size={14} /> Back to Manifest
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--md"
                    onClick={() => {
                      if (!transportAgency || !licensePlate || !driverName || !ewayBillNumber) {
                        toast("Required Fields Missing", "Please complete all transport details.", "error");
                        return;
                      }
                      setStep(3);
                    }}
                  >
                    Generate Invoice & Gate Pass <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: INVOICE GENERATION & VEHICLE GATE PASS */}
            {step === 3 && (
              <div className="stack" style={{ gap: 16 }}>
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>
                    Step 3 · Official Tax Invoice & Vehicle Gate Pass
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
                    Review generated dispatch documents. Confirm release to complete order fulfillment.
                  </p>
                </div>

                {/* Invoice & Pass Preview Box */}
                <div
                  style={{
                    backgroundColor: "var(--white)",
                    border: "2px solid var(--ink)",
                    padding: 18,
                    boxShadow: "3px 3px 0 var(--ink)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1.5px solid var(--ink)",
                      paddingBottom: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <span className="kicker">EVEREST TEXTILE MILLS LTD.</span>
                      <div style={{ fontSize: 16, fontWeight: 900 }}>TAX INVOICE & OUTWARD GATE PASS</div>
                      <span className="cell-secondary">GSTIN: 29AABCE4120L1ZA · North Weaving Complex</span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div>
                        Invoice No: <strong className="code">{generatedInvoiceNo}</strong>
                      </div>
                      <div>
                        Gate Pass No: <strong className="code">{generatedGatePassNo}</strong>
                      </div>
                      <span className="cell-secondary">{formatDate(new Date().toISOString())}</span>
                    </div>
                  </div>

                  {/* Summary Blocks */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                      fontSize: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ padding: 10, background: "var(--cotton)", border: "1px solid var(--line)" }}>
                      <strong>CONSIGNEE / BUYER:</strong>
                      <div style={{ marginTop: 4 }}>
                        {fulfillingOrder.buyer}
                        <br />
                        Order Ref: <strong>{fulfillingOrder.code}</strong>
                        <br />
                        Payment Terms: Net 30 Days
                      </div>
                    </div>

                    <div style={{ padding: 10, background: "var(--cotton)", border: "1px solid var(--line)" }}>
                      <strong>TRANSPORT & CARRIER:</strong>
                      <div style={{ marginTop: 4 }}>
                        Agency: <strong>{transportAgency}</strong>
                        <br />
                        Vehicle No: <strong>{licensePlate}</strong>
                        <br />
                        Driver: {driverName} ({driverPhone})
                        <br />
                        E-Way Bill: <strong>{ewayBillNumber}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Items breakdown */}
                  <div style={{ fontSize: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>
                        Commodity: {fulfillingOrder.product} ({fulfillingOrder.colour}) - HSN 5208
                      </span>
                      <strong className="num">
                        {getOrderRolls(fulfillingOrder.code).length} Rolls ·{" "}
                        {formatQty(
                          getOrderRolls(fulfillingOrder.code)
                            .reduce((sum, r) => sum.plus(r.qty), new Decimal(0))
                            .toString(),
                          fulfillingOrder.unit,
                          1
                        )}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                      <span>Total Invoice Payable (including 5% GST):</span>
                      <span className="num" style={{ fontSize: 14, color: "var(--indigo)" }}>
                        {formatMoney(
                          getOrderRolls(fulfillingOrder.code)
                            .reduce((sum, r) => sum.plus(r.qty), new Decimal(0))
                            .mul(new Decimal(fulfillingOrder.revenue).div(fulfillingOrder.ordered))
                            .mul(1.05)
                            .toFixed(2)
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* View and Print Actions */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() =>
                      handleDownloadInvoice(
                        fulfillingOrder,
                        getOrderRolls(fulfillingOrder.code)
                      )
                    }
                  >
                    <FileText size={13} /> View Tax Invoice
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() =>
                      handleDownloadGatePass(
                        fulfillingOrder,
                        getOrderRolls(fulfillingOrder.code)
                      )
                    }
                  >
                    <FileCheck size={13} /> View Gate Pass
                  </button>
                  <button
                    type="button"
                    className="btn btn--quiet btn--sm"
                    onClick={() => window.print()}
                  >
                    <Printer size={13} /> Print
                  </button>
                </div>

                {/* Footer Controls */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                  <button type="button" className="btn btn--secondary btn--md" onClick={() => setStep(2)}>
                    <ArrowLeft size={14} /> Back to Vehicle Details
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--lg"
                    onClick={handleConfirmFulfillment}
                    style={{
                      backgroundColor: "var(--neem)",
                      borderColor: "var(--ink)",
                      color: "#fff",
                      fontWeight: 900,
                    }}
                  >
                    <CheckCircle2 size={18} /> Confirm & Complete Dispatch
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {viewingDocument && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(25, 27, 25, 0.7)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--white)",
              border: "1px solid var(--line-dark)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              maxWidth: 800,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 40,
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: 8 }} className="no-print">
              <button className="btn btn--secondary btn--sm" onClick={() => window.print()}>
                <Printer size={16} /> Print
              </button>
              <button className="icon-button" onClick={() => setViewingDocument(null)}>
                <X size={20} />
              </button>
            </div>

            {viewingDocument.type === "invoice" && (
              <div style={{ color: "var(--ink)" }}>
                <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 20, marginBottom: 20 }}>
                  <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>TAX INVOICE</h1>
                  <h2 style={{ margin: "4px 0 0", fontSize: 16, color: "var(--ink-soft)" }}>EVEREST TEXTILE MILLS LTD.</h2>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 30 }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontWeight: 700 }}>SELLER:</p>
                    <p style={{ margin: 0, fontSize: 14 }}>Everest Textile Mills Ltd.</p>
                    <p style={{ margin: 0, fontSize: 14 }}>Plot 14-B, Industrial Textile Complex</p>
                    <p style={{ margin: 0, fontSize: 14 }}>GSTIN: 29AABCE4120L1ZA</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 14 }}>Invoice Number: <strong style={{ fontSize: 16 }}>{viewingDocument.invoiceNo}</strong></p>
                    <p style={{ margin: "0 0 4px", fontSize: 14 }}>Date: <strong>{formatDate(new Date().toISOString())}</strong></p>
                    <p style={{ margin: "0 0 4px", fontSize: 14 }}>Gate Pass Ref: <strong>{viewingDocument.gatePassNo}</strong></p>
                  </div>
                </div>

                <div style={{ marginBottom: 30 }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 700 }}>BILL TO:</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{viewingDocument.order.buyer}</p>
                  <p style={{ margin: 0, fontSize: 14 }}>PO Ref: {viewingDocument.order.code}</p>
                  <p style={{ margin: 0, fontSize: 14 }}>Destination: Central Hub</p>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--ink)", backgroundColor: "var(--cotton)", textAlign: "left" }}>
                      <th style={{ padding: 12 }}>Description</th>
                      <th style={{ padding: 12 }}>HSN</th>
                      <th style={{ padding: 12 }}>Qty</th>
                      <th style={{ padding: 12 }}>Unit Rate</th>
                      <th style={{ padding: 12, textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const order = viewingDocument.order;
                      const rolls = viewingDocument.rolls;
                      const totalMeters = rolls.reduce((sum, r) => sum.plus(r.qty), new Decimal(0));
                      const ratePerMeter = new Decimal(order.revenue).div(order.ordered);
                      const subtotal = totalMeters.mul(ratePerMeter);
                      const cgst = subtotal.mul(0.025);
                      const sgst = subtotal.mul(0.025);
                      const totalInvoice = subtotal.plus(cgst).plus(sgst);

                      return (
                        <>
                          <tr style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ padding: 12 }}>
                              <strong style={{ display: "block" }}>{order.product}</strong>
                              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Shade: {order.colour} ({rolls.length} Rolls)</span>
                            </td>
                            <td style={{ padding: 12 }}>5208</td>
                            <td style={{ padding: 12 }}>{formatQty(totalMeters.toString(), order.unit, 1)}</td>
                            <td style={{ padding: 12 }}>INR {ratePerMeter.toFixed(2)}</td>
                            <td style={{ padding: 12, textAlign: "right" }}>INR {subtotal.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td colSpan={3}></td>
                            <td style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>Taxable Subtotal</td>
                            <td style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>INR {subtotal.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td colSpan={3}></td>
                            <td style={{ padding: 12, textAlign: "right", color: "var(--ink-soft)" }}>CGST (2.5%)</td>
                            <td style={{ padding: 12, textAlign: "right", color: "var(--ink-soft)" }}>INR {cgst.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td colSpan={3}></td>
                            <td style={{ padding: 12, textAlign: "right", color: "var(--ink-soft)" }}>SGST (2.5%)</td>
                            <td style={{ padding: 12, textAlign: "right", color: "var(--ink-soft)" }}>INR {sgst.toFixed(2)}</td>
                          </tr>
                          <tr style={{ backgroundColor: "var(--cotton-2)" }}>
                            <td colSpan={3}></td>
                            <td style={{ padding: "16px 12px", textAlign: "right", fontWeight: 900, fontSize: 16 }}>GRAND TOTAL</td>
                            <td style={{ padding: "16px 12px", textAlign: "right", fontWeight: 900, fontSize: 16 }}>INR {totalInvoice.toFixed(2)}</td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            {viewingDocument.type === "gatePass" && (
              <div style={{ color: "var(--ink)" }}>
                <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 20, marginBottom: 20 }}>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>OUTWARD VEHICLE GATE PASS</h1>
                  <h2 style={{ margin: "4px 0 0", fontSize: 16, color: "var(--ink-soft)" }}>EVEREST TEXTILE MILLS LTD.</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 30 }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 14 }}>Gate Pass: <strong>{viewingDocument.gatePassNo}</strong></p>
                    <p style={{ margin: "0 0 4px", fontSize: 14 }}>Invoice Ref: <strong>{viewingDocument.invoiceNo}</strong></p>
                    <p style={{ margin: "0 0 4px", fontSize: 14 }}>Date: <strong>{formatDate(new Date().toISOString())}</strong></p>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 14 }}>Buyer: <strong>{viewingDocument.order.buyer}</strong></p>
                    <p style={{ margin: "0 0 4px", fontSize: 14 }}>Total Rolls: <strong>{viewingDocument.rolls.length}</strong></p>
                    <p style={{ margin: "0 0 4px", fontSize: 14 }}>Total Qty: <strong>{formatQty(viewingDocument.rolls.reduce((s, r) => s.plus(r.qty), new Decimal(0)).toString(), viewingDocument.order.unit, 1)}</strong></p>
                  </div>
                </div>
                <p style={{ fontSize: 14, fontStyle: "italic", border: "1px solid var(--line)", padding: 12 }}>Security Checks: Driver identity verified. Cargo tarpaulin sealed. Gross weight logged.</p>
                <div style={{ marginTop: 60, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ borderTop: "1px solid var(--ink)", paddingTop: 8, fontSize: 14 }}>Security Officer Sign</span>
                  <span style={{ borderTop: "1px solid var(--ink)", paddingTop: 8, fontSize: 14 }}>Dispatch Officer Sign</span>
                </div>
              </div>
            )}
            
            {viewingDocument.type === "manifest" && (
              <div style={{ color: "var(--ink)" }}>
                <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 20, marginBottom: 20 }}>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>WAREHOUSE LOADING MANIFEST</h1>
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 14 }}>Order: <strong>{viewingDocument.order.code}</strong></p>
                <p style={{ margin: "0 0 20px", fontSize: 14 }}>Consignee: <strong>{viewingDocument.order.buyer}</strong></p>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--ink)", textAlign: "left" }}>
                      <th style={{ padding: 8 }}>Roll Code</th>
                      <th style={{ padding: 8 }}>Qty</th>
                      <th style={{ padding: 8 }}>Dye Lot</th>
                      <th style={{ padding: 8 }}>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingDocument.rolls.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: 8, fontFamily: "monospace" }}>[ ] {r.code}</td>
                        <td style={{ padding: 8 }}>{formatQty(r.qty, r.unit, 1)}</td>
                        <td style={{ padding: 8 }}>{r.dyeLot}</td>
                        <td style={{ padding: 8 }}>{r.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
