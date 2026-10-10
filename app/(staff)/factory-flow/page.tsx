"use client";

import { useDemo } from "@/lib/demo/context";
import { PageHeader } from "@/components/ui/primitives";
import { ArrowRight, ArrowDown, Package, Truck, Activity, Box, Search, ShieldCheck } from "lucide-react";
import Decimal from "decimal.js";
import { hasAnyPermission } from "@/lib/auth/permissions";

export default function FactoryFlowPage() {
  const { data, user } = useDemo();
  
  if (!hasAnyPermission(user, ["production.plan", "finance.read"])) {
    return <PageHeader title="Access denied" />;
  }

  // 1. Yarn (Raw Material) Warehouse
  const rawYarnQty = data.yarnBatches
    .reduce((sum, batch) => sum.plus(batch.available), new Decimal(0))
    .toNumber();

  // 2. Spinning Machine
  const spinningOps = data.operations.filter(op => op.stage === "SPINNING" && op.status === "IN_PROGRESS");
  
  // 3. Spun Yarn Warehouse (Intermediate)
  const spunYarnTotal = data.operations.filter(op => op.stage === "SPINNING").reduce((sum, op) => sum.plus(op.good), new Decimal(0));
  const weavingTotal = data.operations.filter(op => op.stage === "WEAVING").reduce((sum, op) => sum.plus(op.good), new Decimal(0));
  const spunYarnWIP = Decimal.max(0, spunYarnTotal.minus(weavingTotal)).toNumber();

  // 4. Weaving Machine
  const weavingOps = data.operations.filter(op => op.stage === "WEAVING" && op.status === "IN_PROGRESS");

  // 5. Woven Fabric Warehouse (Intermediate)
  const dyeingTotal = data.operations.filter(op => op.stage === "DYEING").reduce((sum, op) => sum.plus(op.good), new Decimal(0));
  const wovenFabricWIP = Decimal.max(0, weavingTotal.minus(dyeingTotal)).toNumber();

  // 6. Dyeing Machine
  const dyeingOps = data.operations.filter(op => op.stage === "DYEING" && op.status === "IN_PROGRESS");

  // 7. QC Pending
  const qcPending = data.rolls.filter(r => ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED", "REWORK_REQUIRED", "REWORK_IN_PROGRESS"].includes(r.status));
  const qcPendingQty = qcPending.reduce((sum, r) => sum.plus(r.qty), new Decimal(0)).toNumber();

  // 8. Final Goods WH
  const fgInventory = data.rolls.filter(r => r.status === "ACCEPTED");
  const fgQty = fgInventory.reduce((sum, r) => sum.plus(r.qty), new Decimal(0)).toNumber();

  // 9. Dispatch
  const dispatching = data.rolls.filter(r => ["RESERVED", "DISPATCHED"].includes(r.status));
  const dispatchingQty = dispatching.reduce((sum, r) => sum.plus(r.qty), new Decimal(0)).toNumber();

  const FlowCard = ({ title, metric, description, icon: Icon, highlight }: any) => (
    <div style={{ 
      display: "flex", flexDirection: "column", gap: "10px", padding: "20px", 
      background: highlight ? "var(--color-bg-alt)" : "var(--color-bg)", 
      border: "1px solid var(--color-stroke)", 
      borderRadius: "12px", 
      minWidth: "240px", flex: 1, 
      boxShadow: highlight ? "0 4px 12px rgba(var(--color-primary-rgb), 0.15)" : "0 2px 8px rgba(0,0,0,0.05)",
      borderColor: highlight ? "var(--color-primary)" : "var(--color-stroke)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Icon size={20} color="var(--color-primary)"/>
        <strong style={{ fontSize: "15px" }}>{title}</strong>
      </div>
      <div style={{ fontSize: "28px", fontWeight: "900", fontFamily: "var(--font-display)" }}>{metric}</div>
      <div className="cell-secondary">{description}</div>
    </div>
  );

  return (
    <>
      <PageHeader 
        eyebrow="Live Dashboard" 
        title="Factory Flow Visualization" 
        description="End-to-end material and process flow mapped across the 6-stage warehouse and production lines."
      />
      
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "24px", alignItems: "center", paddingBottom: "60px" }}>
        
        {/* ROW 1: Raw -> Spun WH */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center", width: "100%", maxWidth: "1000px" }}>
          <FlowCard title="1. Yarn Warehouse" metric={`${rawYarnQty.toFixed(1)} KG`} description="Available raw yarn" icon={Package} highlight />
          <ArrowRight size={32} color="var(--color-stroke)" />
          <FlowCard title="2. Spinning" metric={`${spinningOps.length} Active`} description="Spinning operations" icon={Activity} />
          <ArrowRight size={32} color="var(--color-stroke)" />
          <FlowCard title="3. Spun Yarn WH" metric={`${spunYarnWIP.toFixed(1)} KG`} description="Estimated WIP inventory" icon={Box} highlight />
        </div>

        <div style={{ display: "flex", width: "100%", maxWidth: "1000px", justifyContent: "flex-end", paddingRight: "10%" }}>
          <ArrowDown size={32} color="var(--color-stroke)" />
        </div>

        {/* ROW 2: Dyeing <- Woven WH <- Weaving (Reversed for S-curve visual) */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center", width: "100%", maxWidth: "1000px", flexDirection: "row-reverse" }}>
          <FlowCard title="4. Weaving" metric={`${weavingOps.length} Active`} description="Weaving operations" icon={Activity} />
          <ArrowLeftIcon size={32} color="var(--color-stroke)" />
          <FlowCard title="5. Woven Fabric WH" metric={`${wovenFabricWIP.toFixed(1)} M`} description="Estimated WIP inventory" icon={Box} highlight />
          <ArrowLeftIcon size={32} color="var(--color-stroke)" />
          <FlowCard title="6. Dyeing" metric={`${dyeingOps.length} Active`} description="Dyeing operations" icon={Activity} />
        </div>

        <div style={{ display: "flex", width: "100%", maxWidth: "1000px", justifyContent: "flex-start", paddingLeft: "10%" }}>
          <ArrowDown size={32} color="var(--color-stroke)" />
        </div>

        {/* ROW 3: QC -> FG -> Dispatch */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center", width: "100%", maxWidth: "1000px" }}>
          <FlowCard title="7. QC & Rework" metric={`${qcPending.length} Rolls`} description={`${qcPendingQty.toFixed(1)} M awaiting check`} icon={Search} />
          <ArrowRight size={32} color="var(--color-stroke)" />
          <FlowCard title="8. Final Goods WH" metric={`${fgInventory.length} Rolls`} description={`${fgQty.toFixed(1)} M accepted`} icon={ShieldCheck} highlight />
          <ArrowRight size={32} color="var(--color-stroke)" />
          <FlowCard title="9. Dispatch" metric={`${dispatching.length} Rolls`} description={`${dispatchingQty.toFixed(1)} M shipped/reserved`} icon={Truck} highlight />
        </div>

      </div>
    </>
  );
}

const ArrowLeftIcon = ({ size, color }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);
