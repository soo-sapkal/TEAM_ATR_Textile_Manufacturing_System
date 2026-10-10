"use client";

import { useState } from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import {
  ArrowRight,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileText,
  Layers,
  Mail,
  Package,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Truck,
  UserCheck,
  X,
} from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { clampPercent, formatDate, formatMoney, formatQty } from "@/lib/domain/format";
import {
  Card,
  EmptyState,
  InfoStrip,
  Kicker,
  LinkButton,
  Meter,
  PageHeader,
  StatCard,
  StatusBadge,
  Tag,
} from "@/components/ui/primitives";
import type { Order, Shipment } from "@/lib/domain/types";

interface FabricCatalogItem {
  id: string;
  code: string;
  name: string;
  composition: string;
  weave: string;
  gsm: number;
  availableColors: string[];
  leadTime: string;
}

const FABRIC_CATALOG: FabricCatalogItem[] = [
  {
    id: "cat-1",
    code: "FAB-221",
    name: "Indigo Twill Weave",
    composition: "100% Ring-Spun Cotton (40s/1)",
    weave: "3/1 Right-Hand Twill",
    gsm: 280,
    availableColors: ["Indigo 7", "Indigo 4", "Deep Navy", "Bleached Indigo"],
    leadTime: "12–14 business days",
  },
  {
    id: "cat-2",
    code: "FAB-118",
    name: "Cotton Sateen Luxury",
    composition: "100% Combed Cotton (60s/1)",
    weave: "4/1 Sateen Weave",
    gsm: 210,
    availableColors: ["Natural Off-White", "Raw Ecru", "Pearl White", "Muted Khaki"],
    leadTime: "10–12 business days",
  },
  {
    id: "cat-3",
    code: "FAB-307",
    name: "Linen-Cotton Slub Blend",
    composition: "55% Belgian Linen / 45% Combed Cotton",
    weave: "Plain Slub Texture",
    gsm: 195,
    availableColors: ["Moss Green", "Sand Dunes", "Charcoal Mist", "Terracotta"],
    leadTime: "14–18 business days",
  },
  {
    id: "cat-4",
    code: "FAB-405",
    name: "Heavy Canvas Duck",
    composition: "100% Carded Organic Cotton (16s/2)",
    weave: "Heavy Oxford / Duck",
    gsm: 360,
    availableColors: ["Raw White", "Jet Black", "Olive Drab", "Desert Khaki"],
    leadTime: "15–20 business days",
  },
];

export function BuyerDashboardPage() {
  const { data, user } = useDemo();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // 1. Identify Buyer and filter strictly for their data
  const buyerId = user?.buyerId ?? "buyer-01";
  const buyerCompanyName = user?.name
    ? user.name.replace(/\s*\([^)]*\)$/, "").trim()
    : "Anita Textiles";

  // Filter ONLY orders belonging to this buyer (no global orders)
  const myOrders: Order[] = data.orders.filter(
    (order) =>
      order.buyerId === buyerId ||
      order.buyer.toLowerCase().includes("mysore") ||
      order.buyer.toLowerCase().includes("anita")
  );

  // Filter ONLY shipments belonging to this buyer's orders
  const myOrderCodes = new Set(myOrders.map((o) => o.code));
  const myShipments: Shipment[] = data.shipments.filter(
    (s) => myOrderCodes.has(s.orderCode) || s.buyer === myOrders[0]?.buyer
  );

  // 2. Customer-Specific KPIs
  // Active Orders: in progress or planned (not cancelled or closed)
  const activeOrders = myOrders.filter(
    (order) =>
      !["CLOSED", "CANCELLED"].includes(order.status) &&
      order.displayStatus !== "READY_FOR_DISPATCH"
  );

  // Ready for Dispatch: completed and awaiting logistics
  const readyOrders = myOrders.filter(
    (order) => order.displayStatus === "READY_FOR_DISPATCH"
  );

  // Outstanding Balance: calculate pending invoices / balances from dispatched shipments
  const outstandingAmount = myShipments
    .filter((s) => s.status === "DISPATCHED" && s.invoice)
    .reduce((sum, s) => sum.plus(s.amount || "0"), new Decimal(0));

  // Trigger download helper
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

    setDownloadSuccess(`${label} downloaded successfully.`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleDownloadManifest = (shipment: Shipment) => {
    const manifestContent = `=====================================================
EVEREST TEXTILE MILLS - OFFICIAL DISPATCH MANIFEST
=====================================================
Date of Dispatch: ${shipment.plannedAt ? formatDate(shipment.plannedAt) : "10 Oct 2026"}
Manifest Reference: ${shipment.code}
Buyer Organization: ${buyerCompanyName}
Consignee Code: ${buyerId}

LOGISTICS & CARRIER DETAILS:
-----------------------------------------------------
Carrier Vehicle: ${shipment.vehicle}
Driver Log: Verified Gate Outward Pass
Origin Facility: North Weaving & Wet Processing Shed
Destination: ${buyerCompanyName} Central Warehouse

SHIPMENT CONTENT:
-----------------------------------------------------
Purchase Order Ref: ${shipment.orderCode}
Roll Quantity: ${shipment.rolls} Sealed Rolls
Total Net Meters: ${formatQty(shipment.qty, shipment.unit, 0)}
Invoice Reference: ${shipment.invoice ?? "PENDING"}
Declared Value: ${formatMoney(shipment.amount || "0")}

QC RELEASE DECLARATION:
All rolls listed have passed Lab 4-Point Visual & Tensile Inspection.
Authorized Signatory: Logistics & Dispatch Manager
Everest Textile Mills Ltd.
=====================================================`;
    handleDownload(`Dispatch_Manifest_${shipment.code}.txt`, manifestContent, `Manifest ${shipment.code}`);
  };

  const handleDownloadInvoice = (shipment: Shipment) => {
    const invoiceNumber = shipment.invoice ?? "INV-2026-0031";
    const invoiceContent = `=====================================================
TAX INVOICE - EVEREST TEXTILE MILLS
=====================================================
Invoice No: ${invoiceNumber}
Date: ${formatDate(shipment.plannedAt || new Date().toISOString())}
Payment Terms: Net 30 Days (Due in 30 days)

BILLED TO:
-----------------------------------------------------
${buyerCompanyName} Pvt. Ltd.
GSTIN / Tax ID: 29AAACT9812K1Z9
Account ID: ${buyerId}

SUPPLIER / ISSUER:
-----------------------------------------------------
Everest Textile Mills Ltd.
North Processing Plant, Industrial Area
GSTIN: 29AABCE4120L1ZA

LINE ITEMS:
-----------------------------------------------------
1. Order Ref: ${shipment.orderCode}
   HSN Code: 5208 (Woven Fabrics of Cotton)
   Quantity: ${formatQty(shipment.qty, shipment.unit, 0)} (${shipment.rolls} Rolls)
   Shipment Ref: ${shipment.code}
   Carrier: ${shipment.vehicle}

FINANCIAL SUMMARY:
-----------------------------------------------------
Subtotal: ${formatMoney(new Decimal(shipment.amount || "0").mul(0.952).toFixed(2))}
CGST (2.5%): ${formatMoney(new Decimal(shipment.amount || "0").mul(0.024).toFixed(2))}
SGST (2.5%): ${formatMoney(new Decimal(shipment.amount || "0").mul(0.024).toFixed(2))}
TOTAL INVOICE AMOUNT: ${formatMoney(shipment.amount || "0")}

STATUS: OUTSTANDING / UNPAID
Bank Wire Details:
Bank: State Bank of India | IFSC: SBIN0004123
Account Name: Everest Textile Mills Operating Account
=====================================================`;
    handleDownload(`Invoice_${invoiceNumber}.txt`, invoiceContent, `Invoice ${invoiceNumber}`);
  };

  const handleDownloadStatement = () => {
    const statementContent = `=====================================================
STATEMENT OF ACCOUNTS - B2B CLIENT LEDGER
=====================================================
Account Name: ${buyerCompanyName}
Client ID: ${buyerId}
Statement Date: ${formatDate(new Date().toISOString())}
Period: 01 Oct 2026 - 31 Oct 2026

CREDIT & ACCOUNT LIMIT:
-----------------------------------------------------
Approved Credit Limit: INR 25,00,000.00
Utilized Credit: ${formatMoney(outstandingAmount.toString())}
Available Credit Headroom: ${formatMoney(new Decimal(2500000).minus(outstandingAmount).toString())}
Payment Terms: Net 30 Days

TRANSACTIONS & INVOICE LEDGER:
-----------------------------------------------------
1. 09 Oct 2026 | INV-2026-0031 | Ref: ${myOrders[0]?.code ?? "ORD-2026-0007"}
   Dispatched goods via truck KA-02-CD-7788
   Amount Due: ${formatMoney(outstandingAmount.toString())} (Unpaid · Due by 08 Nov 2026)

2. 05 Oct 2026 | REC-2026-0914 | Advance Adjustment
   Credit Applied: INR 0.00

CURRENT OUTSTANDING PAYABLE: ${formatMoney(outstandingAmount.toString())}

Everest Textile Mills Finance & Accounts Desk
Contact: finance@everestmills.demo | +91 80 2345 6789
=====================================================`;
    handleDownload(`Account_Statement_${buyerCompanyName.replace(/\s+/g, "_")}.txt`, statementContent, "Account Statement");
  };

  return (
    <>
      {/* 1. Personalized Welcome Header */}
      <PageHeader
        eyebrow="B2B Customer Portal · Everest Textile Mills"
        title={`Welcome back, ${buyerCompanyName}.`}
        description="Your real-time manufacturing and logistics dashboard. Monitor production milestones, review completed goods ready for dispatch, and track carrier shipments."
        actions={
          <>
            <button
              type="button"
              className="btn btn--secondary btn--md"
              onClick={() => setCatalogOpen(true)}
            >
              <Layers size={15} /> Fabric Catalog
            </button>
            <LinkButton href="/buyer/orders/new" variant="primary">
              <Plus size={15} /> Place New Order
            </LinkButton>
          </>
        }
        meta={
          <>
            <Tag>B2B CLIENT PORTAL</Tag>
            <Tag>ACCOUNT ID: {buyerId.toUpperCase()}</Tag>
            <Tag>TERMS: NET 30</Tag>
          </>
        }
      />

      {/* Account Manager & Summary Card */}
      <div
        className="card"
        style={{
          marginBottom: 18,
          borderLeft: "4px solid var(--indigo)",
          background: "linear-gradient(135deg, var(--paper) 0%, #f4efe2 100%)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                backgroundColor: "var(--indigo)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                border: "2px solid var(--ink)",
              }}
            >
              <UserCheck size={22} />
            </div>
            <div>
              <span className="kicker" style={{ color: "var(--indigo)" }}>
                Dedicated Account Manager
              </span>
              <div style={{ fontSize: 16, fontWeight: 900, color: "var(--ink)", marginTop: 2 }}>
                Rajesh Sharma <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-soft)" }}>· Senior Client Operations</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 4, fontSize: 12, color: "var(--ink-soft)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Phone size={13} style={{ color: "var(--indigo)" }} /> +91 80 2345 6789 (Ext. 204)
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Mail size={13} style={{ color: "var(--indigo)" }} /> rajesh.sharma@everestmills.demo
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Clock size={13} style={{ color: "var(--neem)" }} /> Mon–Sat, 09:00–18:00 IST
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <a
              href="mailto:rajesh.sharma@everestmills.demo?subject=Inquiry%20from%20Anita%20Textiles"
              className="btn btn--secondary btn--sm"
            >
              <Mail size={13} /> Email Account Manager
            </a>
            <button
              type="button"
              className="btn btn--quiet btn--sm"
              onClick={() => setStatementOpen(true)}
            >
              <FileText size={13} /> Account Ledger
            </button>
          </div>
        </div>
      </div>

      {downloadSuccess && (
        <div style={{ marginBottom: 14 }}>
          <InfoStrip tone="success">
            <CheckCircle2 size={16} />
            <div>
              <strong>Action Complete</strong>
              <div>{downloadSuccess}</div>
            </div>
          </InfoStrip>
        </div>
      )}

      {/* 2. Customer-Specific KPIs */}
      <div className="stat-grid">
        <StatCard
          label="Active Orders"
          value={activeOrders.length}
          detail={`${myOrders.reduce((sum, o) => sum + Number(o.ordered), 0).toLocaleString()} M total under contract`}
          icon={Package}
          tone="indigo"
          href="/buyer/orders"
        />
        <StatCard
          label="Ready for Dispatch"
          value={readyOrders.length}
          detail={
            readyOrders.length > 0
              ? `${readyOrders.map((o) => o.code).join(", ")} ready in warehouse`
              : "Quality inspection in progress"
          }
          icon={Truck}
          tone="neem"
          href="/buyer/orders"
        />
        <StatCard
          label="Outstanding Balance"
          value={formatMoney(outstandingAmount.toString())}
          detail="1 pending invoice · Net 30 days credit terms"
          icon={FileText}
          tone="turmeric"
          trend="up"
        />
        <StatCard
          label="Quality Pass Rate"
          value="99.4%"
          detail="Lab inspection grade · 4-Point System"
          icon={ShieldCheck}
          tone="cotton"
        />
      </div>

      {/* Main Grid: Track My Orders (Col 8) & Quick Actions (Col 4) */}
      <div className="page-grid">
        {/* 3. "Track My Orders" Widget */}
        <div className="col-8">
          <Card
            title="Track My Orders"
            action={
              <Link href="/buyer/orders" className="btn btn--quiet btn--sm">
                View all orders <ArrowRight size={13} />
              </Link>
            }
          >
            <div className="stack" style={{ gap: 16 }}>
              {myOrders.map((order) => {
                const percent = clampPercent(order.produced, order.ordered);
                const isReady = order.displayStatus === "READY_FOR_DISPATCH";
                const isShipped = Number(order.dispatched) > 0;

                // Customer-friendly progress label
                let progressStatusLabel = `In Production · ${Math.round(percent)}% Complete`;
                if (isReady) {
                  progressStatusLabel = "Manufacturing Complete · 100% Inspected & Ready";
                } else if (order.status === "PLANNED") {
                  progressStatusLabel = "Scheduled for Weaving · Materials Assigned";
                } else if (order.status === "CONFIRMED") {
                  progressStatusLabel = "Order Confirmed · Queue Position Assigned";
                } else if (isShipped) {
                  progressStatusLabel = `Partially Dispatched · ${formatQty(order.dispatched, order.unit, 0)} already shipped`;
                }

                return (
                  <article
                    key={order.id}
                    style={{
                      padding: "16px 14px",
                      border: "1.5px solid var(--line)",
                      backgroundColor: "var(--white)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {/* Top Row: Code, Product & Status */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="code cell-primary" style={{ fontSize: 15, fontWeight: 900 }}>
                            {order.code}
                          </span>
                          <StatusBadge status={order.displayStatus} />
                        </div>
                        <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>
                          {order.product} <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}>· Shade: {order.colour}</span>
                        </div>
                      </div>

                      {/* Estimated Delivery Date (EDD) */}
                      <div
                        style={{
                          textAlign: "right",
                          backgroundColor: "var(--cotton)",
                          padding: "6px 10px",
                          border: "1px solid var(--line-dark)",
                        }}
                      >
                        <span
                          className="cell-secondary"
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "var(--indigo)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            justifyContent: "flex-end",
                          }}
                        >
                          <Calendar size={11} /> Est. Delivery Date
                        </span>
                        <strong className="num" style={{ fontSize: 13, color: "var(--ink)" }}>
                          {formatDate(order.due)}
                        </strong>
                      </div>
                    </div>

                    {/* Progress Bar Widget */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          fontWeight: 700,
                          marginBottom: 5,
                        }}
                      >
                        <span style={{ color: "var(--indigo)" }}>{progressStatusLabel}</span>
                        <span className="num">
                          {formatQty(order.produced, order.unit, 0)} / {formatQty(order.ordered, order.unit, 0)}
                        </span>
                      </div>
                      <Meter
                        value={order.produced}
                        total={order.ordered}
                        showNumbers={false}
                        tone={isReady ? "neem" : percent > 50 ? "indigo" : "turmeric"}
                      />
                    </div>

                    {/* Order Milestone Cards (Customer-Friendly Metrics) */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gap: 8,
                        marginTop: 2,
                      }}
                    >
                      <div style={{ padding: "6px 8px", background: "var(--cotton)", border: "1px solid var(--line)" }}>
                        <span className="cell-secondary" style={{ fontSize: 10 }}>Total Ordered</span>
                        <strong className="num" style={{ fontSize: 12 }}>
                          {formatQty(order.ordered, order.unit, 0)}
                        </strong>
                      </div>
                      <div style={{ padding: "6px 8px", background: "var(--cotton)", border: "1px solid var(--line)" }}>
                        <span className="cell-secondary" style={{ fontSize: 10 }}>In Production</span>
                        <strong className="num" style={{ fontSize: 12 }}>
                          {formatQty(order.produced, order.unit, 0)}
                        </strong>
                      </div>
                      <div style={{ padding: "6px 8px", background: "var(--cotton)", border: "1px solid var(--line)" }}>
                        <span className="cell-secondary" style={{ fontSize: 10 }}>Quality Approved</span>
                        <strong className="num" style={{ fontSize: 12, color: "var(--neem)" }}>
                          {formatQty(order.accepted, order.unit, 0)}
                        </strong>
                      </div>
                      <div style={{ padding: "6px 8px", background: "var(--cotton)", border: "1px solid var(--line)" }}>
                        <span className="cell-secondary" style={{ fontSize: 10 }}>Dispatched</span>
                        <strong className="num" style={{ fontSize: 12, color: "var(--indigo)" }}>
                          {formatQty(order.dispatched, order.unit, 0)}
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                      <Link href={`/buyer/orders`} className="btn btn--quiet btn--sm" style={{ padding: "4px 8px" }}>
                        View live milestone tracker <ArrowRight size={12} />
                      </Link>
                    </div>
                  </article>
                );
              })}

              {myOrders.length === 0 && (
                <EmptyState
                  title="No active orders found"
                  detail="You have no current manufacturing contracts under this buyer account."
                  action={<LinkButton href="/buyer/orders/new" variant="primary">Place your first order</LinkButton>}
                />
              )}
            </div>
          </Card>
        </div>

        {/* 4. Quick Actions Panel */}
        <div className="col-4">
          <Card title="Quick Actions">
            <div className="stack" style={{ gap: 12 }}>
              {/* Prominent Place New Order button */}
              <Link
                href="/buyer/orders/new"
                className="btn btn--primary btn--lg"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 900,
                  boxShadow: "3px 3px 0 var(--ink)",
                }}
              >
                <Plus size={18} /> Place New Order
              </Link>

              {/* View Product/Yarn Catalog */}
              <button
                type="button"
                className="btn btn--secondary btn--md"
                style={{ width: "100%", justifyContent: "flex-start" }}
                onClick={() => setCatalogOpen(true)}
              >
                <Layers size={16} style={{ color: "var(--indigo)" }} />
                <span>View Product & Fabric Catalog</span>
              </button>

              {/* Download Account Statement */}
              <button
                type="button"
                className="btn btn--secondary btn--md"
                style={{ width: "100%", justifyContent: "flex-start" }}
                onClick={() => setStatementOpen(true)}
              >
                <FileText size={16} style={{ color: "var(--turmeric)" }} />
                <span>Download Account Statement</span>
              </button>

              {/* Direct Download Manifest Quick Link */}
              {myShipments.find((s) => s.status === "DISPATCHED") && (
                <button
                  type="button"
                  className="btn btn--quiet btn--md"
                  style={{ width: "100%", justifyContent: "flex-start" }}
                  onClick={() => {
                    const disp = myShipments.find((s) => s.status === "DISPATCHED");
                    if (disp) handleDownloadManifest(disp);
                  }}
                >
                  <Download size={15} />
                  <span>Download Latest Manifest (SHP-2026-0002)</span>
                </button>
              )}

              {/* Account Standing Summary */}
              <div
                style={{
                  marginTop: 10,
                  padding: "14px",
                  border: "1.5px solid var(--line-dark)",
                  backgroundColor: "var(--cotton)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <Building size={15} style={{ color: "var(--indigo)" }} />
                  <strong style={{ fontSize: 12 }}>Commercial Standing</strong>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Approved Credit Limit:</span>
                    <span className="num" style={{ fontWeight: 800 }}>INR 25,00,000</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Outstanding Balance:</span>
                    <span className="num" style={{ fontWeight: 800, color: "var(--turmeric)" }}>
                      {formatMoney(outstandingAmount.toString())}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Payment Terms:</span>
                    <span style={{ fontWeight: 800, color: "var(--neem)" }}>Net 30 Days</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 5. Recent Shipments & Logistics */}
        <div className="col-12" style={{ marginTop: 14 }}>
          <Card
            title="Recent Shipments & Logistics"
            action={
              <span className="cell-secondary" style={{ fontSize: 11 }}>
                Real-time carrier tracking & gate dispatch records
              </span>
            }
          >
            <div className="stack" style={{ gap: 14 }}>
              {myShipments.map((shipment) => {
                const isDispatched = shipment.status === "DISPATCHED";
                return (
                  <div
                    key={shipment.id}
                    style={{
                      border: "1.5px solid var(--ink)",
                      backgroundColor: "var(--white)",
                      padding: "16px 18px",
                      boxShadow: "2px 2px 0 var(--ink)",
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
                      {/* Truck & Shipment Information */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            backgroundColor: isDispatched ? "var(--neem)" : "var(--turmeric)",
                            color: isDispatched ? "#fff" : "var(--ink)",
                            display: "grid",
                            placeItems: "center",
                            border: "1.5px solid var(--ink)",
                            flexShrink: 0,
                          }}
                        >
                          <Truck size={22} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span className="code cell-primary" style={{ fontSize: 15, fontWeight: 900 }}>
                              {shipment.code}
                            </span>
                            <StatusBadge status={shipment.status} />
                            <span
                              className="tag"
                              style={{
                                backgroundColor: "var(--cotton)",
                                border: "1px solid var(--ink)",
                                fontWeight: 800,
                              }}
                            >
                              VEHICLE: {shipment.vehicle}
                            </span>
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, color: "var(--ink-soft)" }}>
                            Linked Order: <strong style={{ color: "var(--ink)" }}>{shipment.orderCode}</strong> · Dispatched from North Gate Outward Bay
                          </div>
                        </div>
                      </div>

                      {/* Cargo Quantity & Value */}
                      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                          <span className="cell-secondary" style={{ fontSize: 10 }}>Total Quantity</span>
                          <strong className="num" style={{ fontSize: 14 }}>
                            {formatQty(shipment.qty, shipment.unit, 0)} ({shipment.rolls} Rolls)
                          </strong>
                        </div>

                        {shipment.invoice && (
                          <div>
                            <span className="cell-secondary" style={{ fontSize: 10 }}>Invoice Ref</span>
                            <strong className="code" style={{ fontSize: 13, color: "var(--indigo)" }}>
                              {shipment.invoice}
                            </strong>
                          </div>
                        )}

                        <div>
                          <span className="cell-secondary" style={{ fontSize: 10 }}>Invoice Value</span>
                          <strong className="num" style={{ fontSize: 14, color: "var(--ink)" }}>
                            {formatMoney(shipment.amount || "0")}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Dispatch Date & Document Download Actions */}
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px solid var(--line)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-soft)" }}>
                        <Clock size={13} style={{ color: "var(--indigo)" }} />
                        <span>
                          {isDispatched ? "Dispatched on:" : "Scheduled Departure:"}{" "}
                          <strong style={{ color: "var(--ink)" }}>
                            {formatDate(shipment.plannedAt)}
                          </strong>
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {/* Download Dispatch Manifest */}
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => handleDownloadManifest(shipment)}
                        >
                          <Download size={13} /> Download Dispatch Manifest
                        </button>

                        {/* Download Invoice (if invoice exists) */}
                        {shipment.invoice && (
                          <button
                            type="button"
                            className="btn btn--light btn--sm"
                            onClick={() => handleDownloadInvoice(shipment)}
                          >
                            <FileCheck size={13} /> Download Invoice ({shipment.invoice})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {myShipments.length === 0 && (
                <EmptyState
                  title="No recent shipments"
                  detail="There are no recorded truck dispatches for your active orders yet."
                />
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL 1: Product & Fabric Catalog */}
      {catalogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(25, 27, 25, 0.65)",
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
              maxWidth: 780,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid var(--ink)",
                paddingBottom: 14,
                marginBottom: 18,
              }}
            >
              <div>
                <span className="kicker">Everest Textile Mills · Production Standards</span>
                <h2 style={{ margin: "4px 0 0", font: "900 24px var(--font-display)" }}>
                  Commercial Fabric & Weave Catalog
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setCatalogOpen(false)}
                aria-label="Close catalog modal"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: "var(--ink-soft)", fontSize: 12, marginBottom: 16 }}>
              Explore certified fabric specifications produced on our air-jet looms and high-temperature dyeing vessels. Sample swatch swatches and technical data sheets are available upon request.
            </p>

            <div className="stack" style={{ gap: 14 }}>
              {FABRIC_CATALOG.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1.5px solid var(--line-dark)",
                    padding: "14px 16px",
                    backgroundColor: "var(--white)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <span className="code" style={{ color: "var(--indigo)", fontWeight: 900 }}>
                        {item.code}
                      </span>
                      <h3 style={{ margin: "2px 0 6px", fontSize: 16, fontWeight: 800 }}>
                        {item.name}
                      </h3>
                      <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                        <strong>Composition:</strong> {item.composition} · <strong>Weave:</strong> {item.weave}
                      </div>
                    </div>
                    <Tag>{item.gsm} GSM</Tag>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" }}>Available Shading:</span>
                    {item.availableColors.map((color) => (
                      <span
                        key={color}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor: "var(--cotton)",
                          padding: "2px 7px",
                          border: "1px solid var(--line)",
                        }}
                      >
                        {color}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 8,
                      borderTop: "1px solid var(--cotton-2)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: "var(--neem)", fontWeight: 700 }}>
                      Standard Mill Lead Time: {item.leadTime}
                    </span>
                    <Link
                      href={`/buyer/orders/new`}
                      onClick={() => setCatalogOpen(false)}
                      className="btn btn--quiet btn--sm"
                    >
                      Order this fabric <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, textAlign: "right", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <button
                type="button"
                className="btn btn--secondary btn--md"
                onClick={() => setCatalogOpen(false)}
              >
                Close Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Account Statement & Ledger */}
      {statementOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(25, 27, 25, 0.65)",
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
              maxWidth: 700,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid var(--ink)",
                paddingBottom: 14,
                marginBottom: 16,
              }}
            >
              <div>
                <span className="kicker">Financial Accounts · B2B Client Ledger</span>
                <h2 style={{ margin: "4px 0 0", font: "900 24px var(--font-display)" }}>
                  Account Statement · {buyerCompanyName}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setStatementOpen(false)}
                aria-label="Close statement modal"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "var(--cotton)",
                border: "1.5px solid var(--line-dark)",
                marginBottom: 16,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}
            >
              <div>
                <span className="cell-secondary" style={{ fontSize: 10 }}>Credit Line</span>
                <strong className="num" style={{ fontSize: 14 }}>INR 25,00,000</strong>
              </div>
              <div>
                <span className="cell-secondary" style={{ fontSize: 10 }}>Current Due</span>
                <strong className="num" style={{ fontSize: 14, color: "var(--turmeric)" }}>
                  {formatMoney(outstandingAmount.toString())}
                </strong>
              </div>
              <div>
                <span className="cell-secondary" style={{ fontSize: 10 }}>Settlement Terms</span>
                <strong style={{ fontSize: 13, color: "var(--neem)" }}>Net 30 Days</strong>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Active Invoice Ledger
              </h4>
              <table className="data-table" style={{ width: "100%", border: "1px solid var(--line)" }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice / Ref</th>
                    <th>Order</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myShipments.filter((s) => s.invoice).map((s) => (
                    <tr key={s.id}>
                      <td>{formatDate(s.plannedAt)}</td>
                      <td className="code" style={{ fontWeight: 800 }}>{s.invoice}</td>
                      <td className="code">{s.orderCode}</td>
                      <td className="num">{formatMoney(s.amount || "0")}</td>
                      <td>
                        <StatusBadge status="PENDING" label="Due in 28 days" />
                      </td>
                    </tr>
                  ))}
                  {myShipments.filter((s) => s.invoice).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 14, color: "var(--ink-soft)" }}>
                        No pending invoices for this account.
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
                borderTop: "1px solid var(--line)",
                paddingTop: 16,
              }}
            >
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setStatementOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn--primary btn--md"
                onClick={() => {
                  handleDownloadStatement();
                  setStatementOpen(false);
                }}
              >
                <Download size={14} /> Download Official Statement (.txt)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
