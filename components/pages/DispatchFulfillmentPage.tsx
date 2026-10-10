"use client";

import { useState } from "react";
import Link from "next/link";
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

  // Step 2: Transport & Vehicle details (matches DB Analysis Note fields)
  const [transportAgency, setTransportAgency] = useState("VRL Logistics Ltd.");
  const [licensePlate, setLicensePlate] = useState("KA-04-ME-5678");
  const [driverName, setDriverName] = useState("Ramesh Chandra");
  const [driverPhone, setDriverPhone] = useState("+91 98450 12345");
  const [ewayBillNumber, setEwayBillNumber] = useState("EWB-2026-8841-9023");
  const [plannedDeparture, setPlannedDeparture] = useState(
    new Date().toISOString().slice(0, 16)
  );

  // Generated invoice state for Step 3
  const [generatedInvoiceNo, setGeneratedInvoiceNo] = useState("");
  const [generatedGatePassNo, setGeneratedGatePassNo] = useState("");
  const [completedOrderIds, setCompletedOrderIds] = useState<string[]>([]);

  // Pending orders: orders with accepted rolls or ready for dispatch
  const pendingOrders = data.orders.filter(
    (order) =>
      !completedOrderIds.includes(order.id) &&
      (order.displayStatus === "READY_FOR_DISPATCH" ||
        order.displayStatus === "PARTIALLY_DISPATCHED" ||
        Number(order.accepted) > 0 ||
        order.status === "IN_PRODUCTION") &&
      Number(order.remaining) > 0
  );

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

  // Rolls eligible for fulfillment for selected order
  const getOrderRolls = (orderCode: string): FabricRoll[] => {
    return data.rolls.filter(
      (r) =>
        r.orderCode === orderCode &&
        ["ACCEPTED", "RESERVED"].includes(r.status)
    );
  };

  const handleStartFulfill = (order: Order) => {
    setFulfillingOrder(order);
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
    const totalMeters = rolls.reduce((sum, r) => sum.plus(r.qty), new Decimal(0));
    const content = `======================================================================
EVEREST TEXTILE MILLS - WAREHOUSE LOADING MANIFEST
======================================================================
Manifest Date: ${formatDate(new Date().toISOString())}
Order Reference: ${order.code}
Buyer Consignee: ${order.buyer}
Product: ${order.product} (Shade: ${order.colour})

ROLL LOADING CHECKLIST & WAREHOUSE LOCATIONS:
----------------------------------------------------------------------
${rolls.map((r, i) => `${i + 1}. [ ] ${r.code.padEnd(16)} | Qty: ${formatQty(r.qty, r.unit, 1).padEnd(10)} | Dye Lot: ${r.dyeLot.padEnd(8)} | Location: ${r.location.padEnd(10)} | QC: ${r.dispatchQcPassed ? "PASSED" : "PRE-CHECKED"}`).join("\n")}
----------------------------------------------------------------------
TOTAL ROLLS TO LOAD: ${rolls.length} Rolls
TOTAL NET QUANTITY: ${formatQty(totalMeters.toString(), order.unit, 1)}

LOADER INSTRUCTIONS:
1. Ensure all moisture bags are sealed and clean.
2. Verify roll barcodes match this outward manifest before forklift loading.
3. Obtain forklift operator sign-off prior to bay departure.

Authorized Loading Supervisor: ${user?.name ?? "Sameer Khan"}
Everest Textile Mills Ltd. - North Dispatch Bay
======================================================================`;
    handleDownload(`Loading_Manifest_${order.code}.txt`, content, "Loading Manifest");
  };

  const handleDownloadInvoice = (order: Order, rolls: FabricRoll[]) => {
    const totalMeters = rolls.reduce((sum, r) => sum.plus(r.qty), new Decimal(0));
    const ratePerMeter = new Decimal(order.revenue).div(order.ordered).toFixed(2);
    const subtotal = totalMeters.mul(ratePerMeter);
    const cgst = subtotal.mul(0.025);
    const sgst = subtotal.mul(0.025);
    const totalInvoice = subtotal.plus(cgst).plus(sgst);

    const content = `======================================================================
TAX INVOICE - EVEREST TEXTILE MILLS LTD.
======================================================================
Invoice Number: ${generatedInvoiceNo}
Gate Pass Ref: ${generatedGatePassNo}
Invoice Date: ${formatDate(new Date().toISOString())}
Payment Terms: Net 30 Days

SELLER:
Everest Textile Mills Ltd.
Plot 14-B, Industrial Textile Complex, North Shed
GSTIN: 29AABCE4120L1ZA | PAN: AABCE4120L

BUYER / BILL TO:
${order.buyer}
Purchase Order Ref: ${order.code}
Destination Warehouse: Central Hub
GSTIN: 29AAACT9812K1Z9

TRANSPORT & LOGISTICS:
----------------------------------------------------------------------
Transport Agency: ${transportAgency}
Vehicle License Plate: ${licensePlate}
Driver Name & Contact: ${driverName} (${driverPhone})
Government E-Way Bill: ${ewayBillNumber}
Gate Departure Slot: ${formatDateTime(plannedDeparture)}

LINE ITEMS:
----------------------------------------------------------------------
Item Description: ${order.product} - ${order.colour}
HSN Code: 5208 (Woven Cotton Fabrics)
Total Quantity: ${formatQty(totalMeters.toString(), order.unit, 1)} (${rolls.length} Rolls)
Unit Rate: INR ${ratePerMeter} / ${order.unit}

FINANCIAL BREAKDOWN:
----------------------------------------------------------------------
Taxable Subtotal: INR ${subtotal.toFixed(2)}
CGST (2.5%): INR ${cgst.toFixed(2)}
SGST (2.5%): INR ${sgst.toFixed(2)}
TOTAL INVOICE VALUE: INR ${totalInvoice.toFixed(2)}

SECURITY GATE VERIFICATION:
Vehicle weighed & outward physical seal applied.
Dispatch Officer: ${user?.name ?? "Sameer Khan"}
Driver Signature: _______________________
======================================================================`;
    handleDownload(`Tax_Invoice_${generatedInvoiceNo}.txt`, content, "Tax Invoice");
  };

  const handleDownloadGatePass = (order: Order, rolls: FabricRoll[]) => {
    const totalMeters = rolls.reduce((sum, r) => sum.plus(r.qty), new Decimal(0));
    const content = `======================================================================
OUTWARD VEHICLE GATE PASS - SECURITY RECORD
======================================================================
Gate Pass Number: ${generatedGatePassNo}
Linked Invoice: ${generatedInvoiceNo}
Date & Time: ${formatDateTime(plannedDeparture)}
Dispatch Gate: North Main Outward Gate 2

VEHICLE & DRIVER CREDENTIALS:
----------------------------------------------------------------------
Transport Agency: ${transportAgency}
Vehicle Number Plate: ${licensePlate}
Driver Name: ${driverName}
Driver Phone: ${driverPhone}
E-Way Bill Number: ${ewayBillNumber}

CARGO MANIFEST:
----------------------------------------------------------------------
Consignee / Buyer: ${order.buyer}
Purchase Order: ${order.code}
Commodity: Finished Woven Fabric Rolls (${order.product})
Total Package Count: ${rolls.length} Rolls
Total Net Meters: ${formatQty(totalMeters.toString(), order.unit, 1)}

SECURITY CHECKS:
[X] Driver identity and driving license physically verified.
[X] Vehicle number plate matches E-Way Bill declaration.
[X] Cargo tarpaulin and container seal applied.
[X] Gate weighbridge gross weight logged.

Authorized Security Officer: ___________________
Dispatch Officer Sign: ${user?.name ?? "Sameer Khan"}
======================================================================`;
    handleDownload(`Gate_Pass_${generatedGatePassNo}.txt`, content, "Vehicle Gate Pass");
  };

  const handleConfirmFulfillment = async () => {
    if (!fulfillingOrder) return;

    const rolls = getOrderRolls(fulfillingOrder.code);
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
            <LinkButton href="/dispatch/scan" variant="secondary">
              <ScanLine size={15} /> Final QC Scan
            </LinkButton>
            <LinkButton href="/dispatch/stock" variant="quiet">
              <Package size={15} /> Finished Stock
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
              Click “Fulfill” to launch the 3-step manifest, carrier, and invoice workflow
            </span>
          }
        >
          <div className="stack" style={{ gap: 14 }}>
            {pendingOrders.map((order) => {
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
                        : "Fabric rolls are undergoing weaving or dyeing operations."}
                    </span>

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
                  </div>
                </div>
              );
            })}

            {pendingOrders.length === 0 && (
              <EmptyState
                title="All orders fulfilled!"
                detail="There are no pending fulfillment requests in the outbound queue."
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
                        const fakeRolls = data.rolls.slice(0, shipment.rolls);
                        handleDownloadInvoice(fakeOrder, fakeRolls);
                      }}
                    >
                      <Download size={13} /> Invoice
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        const fakeOrder = data.orders.find((o) => o.code === shipment.orderCode) ?? data.orders[0];
                        const fakeRolls = data.rolls.slice(0, shipment.rolls);
                        handleDownloadGatePass(fakeOrder, fakeRolls);
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
                    Verify the exact rolls allocated from the Finished Goods warehouse into the carrier vehicle.
                  </p>
                </div>

                {/* Roll items table */}
                <div style={{ border: "1.5px solid var(--line-dark)", backgroundColor: "var(--white)" }}>
                  <table className="data-table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Roll Code</th>
                        <th>Shade / Dye Lot</th>
                        <th>Quantity</th>
                        <th>Warehouse Location</th>
                        <th>Pre-Dispatch QC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getOrderRolls(fulfillingOrder.code).map((roll) => (
                        <tr key={roll.id}>
                          <td className="code" style={{ fontWeight: 900 }}>{roll.code}</td>
                          <td>{roll.colour} ({roll.dyeLot})</td>
                          <td className="num">{formatQty(roll.qty, roll.unit, 1)}</td>
                          <td>{roll.location}</td>
                          <td>
                            <StatusBadge status="ACCEPTED" label={roll.dispatchQcPassed ? "QC Verified" : "QC Passed"} />
                          </td>
                        </tr>
                      ))}
                      {getOrderRolls(fulfillingOrder.code).length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: 18, color: "var(--ink-soft)" }}>
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
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700 }}>
                    Total Cargo to Load: {getOrderRolls(fulfillingOrder.code).length} Rolls ·{" "}
                    {formatQty(
                      getOrderRolls(fulfillingOrder.code)
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
                          getOrderRolls(fulfillingOrder.code)
                        )
                      }
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
                    disabled={getOrderRolls(fulfillingOrder.code).length === 0}
                  >
                    Proceed to Vehicle Details <ArrowRight size={14} />
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

                {/* Download and Print Actions */}
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
                    <Download size={13} /> Download Invoice (.txt)
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
                    <Download size={13} /> Download Gate Pass (.txt)
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
    </>
  );
}
