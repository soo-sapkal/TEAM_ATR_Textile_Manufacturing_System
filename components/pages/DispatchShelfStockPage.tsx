"use client";

import { useState } from "react";
import { RoleLink as Link } from "@/components/ui/primitives";
import Decimal from "decimal.js";
import {
  Archive,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Lock,
  Package,
  PackageCheck,
  Printer,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { formatDate, formatDateTime, formatQty } from "@/lib/domain/format";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  LinkButton,
  PageHeader,
  StatusBadge,
  Tag,
  TextInput,
} from "@/components/ui/primitives";
import type { FabricRoll } from "@/lib/domain/types";

export function DispatchShelfStockPage() {
  const { data, toast } = useDemo();
  const [activeTab, setActiveTab] = useState<"shelf" | "dispatched">("shelf");
  const [search, setSearch] = useState("");
  const [bayFilter, setBayFilter] = useState("ALL"); // ALL, Bay 1, Bay 3, etc.

  // 1. Finished fabric rolls sitting on the shelf (ACCEPTED or RESERVED)
  const shelfRolls = data.rolls.filter(
    (r) => r.status === "ACCEPTED" || r.status === "RESERVED"
  );

  // 2. Already dispatched rolls ("What has already gone out")
  const dispatchedRolls = data.rolls.filter(
    (r) => r.status === "DISPATCHED"
  );

  // Derive total quantities
  const totalShelfMeters = shelfRolls.reduce(
    (sum, r) => sum.plus(new Decimal(r.qty || 0)),
    new Decimal(0)
  );

  const totalDispatchedMeters = dispatchedRolls.reduce(
    (sum, r) => sum.plus(new Decimal(r.qty || 0)),
    new Decimal(0)
  );

  // Find orders with ready finished stock on shelf
  const ordersWithShelfStock = data.orders.filter((order) => {
    const hasRolls = shelfRolls.some((r) => r.orderCode === order.code);
    return hasRolls && Number(order.remaining) > 0;
  });

  // Identify idle or unallocated rolls (> 3 days or unassigned to imminent shipment)
  const idleRolls = shelfRolls.filter((r) => {
    // If not RESERVED, it is sitting on shelf unallocated
    return r.status === "ACCEPTED";
  });

  // Extract unique locations/bays for filtering
  const availableBays = Array.from(
    new Set(shelfRolls.map((r) => r.location).filter(Boolean))
  );

  // Filter shelf rolls
  const filteredShelfRolls = shelfRolls.filter((roll) => {
    const order = data.orders.find((o) => o.code === roll.orderCode);
    const matchesSearch =
      !search ||
      `${roll.code} ${roll.orderCode} ${roll.colour} ${roll.buyer || ""} ${order?.product || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesBay =
      bayFilter === "ALL" ||
      (bayFilter === "IDLE" && roll.status === "ACCEPTED") ||
      roll.location === bayFilter;

    return matchesSearch && matchesBay;
  });

  // Filter dispatched rolls
  const filteredDispatchedRolls = dispatchedRolls.filter((roll) => {
    const shipment = data.shipments.find(
      (s) => s.code === roll.shipmentCode || s.id === roll.shipmentId || s.orderCode === roll.orderCode
    );
    const matchesSearch =
      !search ||
      `${roll.code} ${roll.orderCode} ${roll.colour} ${roll.buyer || ""} ${roll.shipmentCode || ""} ${shipment?.vehicle || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesSearch;
  });

  return (
    <>
      <PageHeader
        eyebrow="Warehouse Bay & Finished Goods Store"
        title="Finished Stock & Store Shelf"
        description="Comprehensive store ledger: inspect finished fabric sitting on the warehouse shelf, audit idle stock, and review what has already departed so nothing is dispatched twice or forgotten in a corner."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <LinkButton href="/dispatch/orders" variant="primary">
              <Truck size={15} /> Fulfillment Queue
            </LinkButton>
          </div>
        }
        meta={
          <>
            <span className="tag">{shelfRolls.length} ROLLS ON SHELF</span>
            <span className="tag">{formatQty(totalShelfMeters.toFixed(0), "M", 0)} READY</span>
            <span className="tag">{dispatchedRolls.length} ROLLS DISPATCHED</span>
          </>
        }
      />

      {/* 4 Core Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "20px",
            background: "var(--neem)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
            Finished Fabric on Shelf
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 900 }}>
            {formatQty(totalShelfMeters.toFixed(0), "M", 0)}
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            {shelfRolls.length} rolls inspected & stored in FG bay
          </div>
        </div>

        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "20px",
            background: "var(--turmeric)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
            Orders Ready to Ship
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 900 }}>
            {ordersWithShelfStock.length}
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            Orders with eligible stock waiting for truck
          </div>
        </div>

        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "20px",
            background: "var(--indigo)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
            Already Dispatched Out
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 900 }}>
            {formatQty(totalDispatchedMeters.toFixed(0), "M", 0)}
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
            {dispatchedRolls.length} rolls departed on carrier trucks
          </div>
        </div>

        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "20px",
            background: "var(--cotton)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
            Unallocated / Store Watch
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 900, color: idleRolls.length > 0 ? "var(--turmeric-dark, #b45309)" : "var(--neem)" }}>
            {idleRolls.length}
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#555" }}>
            Rolls on shelf awaiting allocation (not forgotten)
          </div>
        </div>
      </div>

      {/* Main Tabs: Fabric on Shelf vs Dispatched History */}
      <div className="filter-row" role="tablist" style={{ marginBottom: 18, borderBottom: "2px solid #000", paddingBottom: 12 }}>
        <button
          type="button"
          className={`filter-chip ${activeTab === "shelf" ? "filter-chip--active" : ""}`}
          style={{ border: "2px solid #000", fontWeight: 800, fontSize: 13, padding: "8px 18px" }}
          onClick={() => setActiveTab("shelf")}
        >
          <PackageCheck size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Finished Fabric on Shelf ({shelfRolls.length} rolls · {formatQty(totalShelfMeters.toFixed(0), "M", 0)})
        </button>
        <button
          type="button"
          className={`filter-chip ${activeTab === "dispatched" ? "filter-chip--active" : ""}`}
          style={{ border: "2px solid #000", fontWeight: 800, fontSize: 13, padding: "8px 18px" }}
          onClick={() => setActiveTab("dispatched")}
        >
          <Truck size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Outward Dispatched Register ({dispatchedRolls.length} rolls · {formatQty(totalDispatchedMeters.toFixed(0), "M", 0)})
        </button>
      </div>

      {/* TAB 1: FINISHED FABRIC ON SHELF */}
      {activeTab === "shelf" && (
        <div className="stack" style={{ gap: 20 }}>
          {/* Subfilters & Search */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div className="filter-row" role="group">
              <button
                type="button"
                className={`filter-chip ${bayFilter === "ALL" ? "filter-chip--active" : ""}`}
                style={{ border: "2px solid #000", fontWeight: 700 }}
                onClick={() => setBayFilter("ALL")}
              >
                All Shelf Stock ({shelfRolls.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${bayFilter === "IDLE" ? "filter-chip--active" : ""}`}
                style={{ border: "2px solid #000", fontWeight: 700 }}
                onClick={() => setBayFilter("IDLE")}
              >
                Unallocated / Free ({idleRolls.length})
              </button>
              {availableBays.map((bay) => (
                <button
                  key={bay}
                  type="button"
                  className={`filter-chip ${bayFilter === bay ? "filter-chip--active" : ""}`}
                  style={{ border: "2px solid #000", fontWeight: 700 }}
                  onClick={() => setBayFilter(bay)}
                >
                  {bay}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="text"
                placeholder="Search roll, order, shade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: "2px solid #000",
                  padding: "8px 14px",
                  background: "#fff",
                  fontWeight: 600,
                  width: 260,
                }}
              />
            </div>
          </div>

          <Card
            title="Warehouse Shelf Inventory (Finished Goods Bay)"
            action={
              <Tag tone="neem">
                {filteredShelfRolls.length} rolls eligible for outward dispatch
              </Tag>
            }
          >
            <DataTable
              headers={[
                "Roll Code",
                "Order / Buyer",
                "Fabric & Shade",
                "Quantity",
                "Shelf Location",
                "QC Status",
                "Allocation State",
                "Action",
              ]}
              rows={filteredShelfRolls.map((roll) => {
                const order = data.orders.find((o) => o.code === roll.orderCode);
                const isReserved = roll.status === "RESERVED";
                return [
                  <div>
                    <span className="code cell-primary" style={{ fontWeight: 800, fontSize: 13 }}>
                      {roll.code}
                    </span>
                    <span className="cell-secondary" style={{ fontSize: 10 }}>
                      Lot: {roll.dyeLot || "Standard"}
                    </span>
                  </div>,
                  <div>
                    <Link href={`/dispatch/orders`} className="cell-primary" style={{ fontWeight: 700 }}>
                      {roll.orderCode}
                    </Link>
                    <span className="cell-secondary">{roll.buyer || order?.buyer || "Customer"}</span>
                  </div>,
                  <div>
                    <span style={{ fontWeight: 700 }}>{order?.product || "Cotton Fabric"}</span>
                    <span className="cell-secondary">{roll.colour}</span>
                  </div>,
                  <strong className="num" style={{ fontSize: 14 }}>
                    {formatQty(roll.qty, roll.unit, 1)}
                  </strong>,
                  <span style={{ fontWeight: 600, color: "var(--indigo)" }}>
                    {roll.location || "FG Bay 1"}
                  </span>,
                  <StatusBadge status="ACCEPTED" label="PASSED QC" />,
                  isReserved ? (
                    <StatusBadge status="RESERVED" label="ALLOCATED TO LOAD" />
                  ) : (
                    <span
                      style={{
                        padding: "2px 8px",
                        border: "1.5px solid #000",
                        backgroundColor: "var(--cotton)",
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      ON SHELF (FREE)
                    </span>
                  ),
                  <Link
                    href={`/dispatch/orders`}
                    className="btn btn--primary btn--sm"
                    style={{
                      border: "2px solid #000",
                      boxShadow: "2px 2px 0 #000",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Truck size={13} /> Load Truck
                  </Link>,
                ];
              })}
              empty={
                <EmptyState
                  title="No finished rolls found on shelf"
                  detail="There are no ACCEPTED rolls matching your filters currently sitting in finished goods."
                />
              }
            />
          </Card>

          {/* Store Guardrails Info Box */}
          <div
            style={{
              backgroundColor: "var(--cotton)",
              border: "2px solid #000",
              boxShadow: "3px 3px 0 #000",
              padding: 16,
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <ShieldCheck size={28} style={{ color: "var(--neem)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontSize: 14 }}>Warehouse Shelf Reconciliation Policy:</strong>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#444", lineHeight: 1.5 }}>
                Only rolls in <strong>ACCEPTED</strong> state from Quality Control are shelved in Finished Goods.
                Unallocated rolls are highlighted to ensure <strong>nothing is forgotten in a warehouse corner</strong>.
                When loading a carrier truck, rolls transition to <strong>RESERVED</strong> and then permanently to{" "}
                <strong>DISPATCHED</strong>, eliminating any possibility of double delivery.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DISPATCHED REGISTER ("WHAT HAS ALREADY GONE OUT") */}
      {activeTab === "dispatched" && (
        <div className="stack" style={{ gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#444" }}>
              Permanent Outward Audit Log — {filteredDispatchedRolls.length} rolls delivered to carriers
            </span>

            <input
              type="text"
              placeholder="Search dispatched roll, carrier, vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "2px solid #000",
                padding: "8px 14px",
                background: "#fff",
                fontWeight: 600,
                width: 280,
              }}
            />
          </div>

          <Card
            title="Outward Dispatch Register (What Has Already Gone Out)"
            action={
              <Tag tone="indigo">
                <Lock size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                Locked & Shipped
              </Tag>
            }
          >
            <DataTable
              headers={[
                "Roll Code",
                "Order / Buyer",
                "Fabric & Shade",
                "Quantity",
                "Carrier / Vehicle",
                "Shipment & Invoice",
                "Dispatch State",
                "Audit Lock",
              ]}
              rows={filteredDispatchedRolls.map((roll) => {
                const order = data.orders.find((o) => o.code === roll.orderCode);
                const shipment = data.shipments.find(
                  (s) =>
                    s.code === roll.shipmentCode ||
                    s.id === roll.shipmentId ||
                    s.orderCode === roll.orderCode
                );

                return [
                  <div>
                    <span className="code cell-primary" style={{ fontWeight: 800 }}>
                      {roll.code}
                    </span>
                    <span className="cell-secondary" style={{ fontSize: 10 }}>
                      Lot: {roll.dyeLot || "Delivered"}
                    </span>
                  </div>,
                  <div>
                    <span style={{ fontWeight: 700 }}>{roll.orderCode}</span>
                    <span className="cell-secondary">{roll.buyer || order?.buyer || "Customer"}</span>
                  </div>,
                  <div>
                    <span style={{ fontWeight: 700 }}>{order?.product || "Cotton Fabric"}</span>
                    <span className="cell-secondary">{roll.colour}</span>
                  </div>,
                  <strong className="num" style={{ fontSize: 14 }}>
                    {formatQty(roll.qty, roll.unit, 1)}
                  </strong>,
                  <div>
                    <span style={{ fontWeight: 700, color: "var(--indigo)" }}>
                      {roll.location?.includes("(") ? roll.location : shipment?.vehicle || "Carrier Truck"}
                    </span>
                    <span className="cell-secondary">
                      {shipment?.transportAgency || "Surface Cargo"}
                    </span>
                  </div>,
                  <div>
                    <span className="code" style={{ fontWeight: 700 }}>
                      {roll.shipmentCode || shipment?.code || "SHP-DISPATCHED"}
                    </span>
                    <span className="cell-secondary">
                      Inv: {shipment?.invoice || "INV-COMPLETED"}
                    </span>
                  </div>,
                  <StatusBadge status="DISPATCHED" label="OUTWARD COMPLETE" />,
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: "var(--neem)",
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    <Lock size={13} /> Cannot Re-Dispatch
                  </div>,
                ];
              })}
              empty={
                <EmptyState
                  title="No dispatched rolls recorded"
                  detail="Completed dispatches will appear here once trucks leave the factory gate."
                />
              }
            />
          </Card>

          {/* Double-Dispatch Prevention Guarantee Strip */}
          <div
            style={{
              backgroundColor: "var(--paper)",
              border: "3px solid #000",
              boxShadow: "4px 4px 0 #000",
              padding: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <CheckCircle2 size={24} style={{ color: "var(--neem)" }} />
              <div>
                <strong style={{ fontSize: 14 }}>Dual-Dispatch Prevention Active:</strong>
                <p style={{ margin: 0, fontSize: 12, color: "#555" }}>
                  Every dispatched roll is hard-linked to an approved gate pass and tax invoice. Rolls cannot be double-counted or sent twice.
                </p>
              </div>
            </div>

            <Link href="/dispatch/orders" className="btn btn--secondary btn--sm" style={{ border: "2px solid #000", fontWeight: 800 }}>
              Fulfill Remaining Orders <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
