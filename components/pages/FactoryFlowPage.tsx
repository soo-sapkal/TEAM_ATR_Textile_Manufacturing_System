"use client";

import { useDemo } from "@/lib/demo/context";
import { PageHeader } from "@/components/ui/primitives";
import { FactoryScene } from "@/components/factory/FactoryScene";
import Decimal from "decimal.js";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { useState } from "react";
import { Play, Pause, RotateCcw, FastForward } from "lucide-react";

export function FactoryFlowPage() {
  const { data, user } = useDemo();
  const [isSimulation, setIsSimulation] = useState(true);
  const [speed, setSpeed] = useState(1);
  
  if (!hasAnyPermission(user, ["production.plan", "finance.read"])) {
    return <PageHeader title="Access denied" />;
  }

  // Calculate Data for Dashboard Metrics
  const rawYarnQty = data.yarnBatches
    .reduce((sum, batch) => sum.plus(batch.available), new Decimal(0))
    .toNumber();

  const spinningOpsTotal = data.operations
    .filter(op => op.stage === "SPINNING")
    .reduce((sum, op) => sum.plus(op.good), new Decimal(0));
  
  const weavingOpsTotal = data.operations
    .filter(op => op.stage === "WEAVING")
    .reduce((sum, op) => sum.plus(op.good), new Decimal(0));
    
  const dyeingOpsTotal = data.operations
    .filter(op => op.stage === "DYEING")
    .reduce((sum, op) => sum.plus(op.good), new Decimal(0));

  const spunYarnWIP = Decimal.max(0, spinningOpsTotal.minus(weavingOpsTotal)).toNumber();
  const wovenFabricWIP = Decimal.max(0, weavingOpsTotal.minus(dyeingOpsTotal)).toNumber();

  const qcPending = data.rolls.filter(r => ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED", "REWORK_REQUIRED", "REWORK_IN_PROGRESS"].includes(r.status));
  const qcPendingQty = qcPending.reduce((sum, r) => sum.plus(r.qty), new Decimal(0)).toNumber();

  const fgInventory = data.rolls.filter(r => r.status === "ACCEPTED");
  const fgQty = fgInventory.reduce((sum, r) => sum.plus(r.qty), new Decimal(0)).toNumber();

  const dispatching = data.rolls.filter(r => ["RESERVED", "DISPATCHED"].includes(r.status));
  const dispatchingQty = dispatching.reduce((sum, r) => sum.plus(r.qty), new Decimal(0)).toNumber();

  // Metrics for Stage Data
  const stageData = {
    1: { value: `${rawYarnQty.toFixed(1)} KG`, label: "Available raw yarn" },
    2: { value: `${spinningOpsTotal.toNumber().toFixed(1)} M`, label: "Processed today" },
    3: { value: `${spunYarnWIP.toFixed(1)} M`, label: "Available spun yarn" },
    4: { value: `${weavingOpsTotal.toNumber().toFixed(1)} M`, label: "Produced today" },
    5: { value: `${wovenFabricWIP.toFixed(1)} M`, label: "Available woven fabric" },
    6: { value: `${dyeingOpsTotal.toNumber().toFixed(1)} M`, label: "Dyed today" },
    7: { value: `${qcPendingQty.toFixed(1)} M`, label: "Awaiting inspection" },
    8: { value: `${qcPendingQty.toFixed(1)} M`, label: "Pending check" },
    9: { value: `${fgQty.toFixed(1)} M`, label: "Available final goods" },
    10: { value: `${dispatchingQty.toFixed(1)} M`, label: "Dispatched / Reserved" },
  };

  const totalProcessedToday = spinningOpsTotal.toNumber();
  const inProcessMaterial = spunYarnWIP + wovenFabricWIP + qcPendingQty;

  const MetricCard = ({ title, metric, unit }: any) => (
    <div style={{
      background: "var(--color-bg)",
      border: "1px solid var(--color-stroke)",
      borderRadius: "8px",
      padding: "16px",
      flex: 1,
      minWidth: "150px"
    }}>
      <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "24px", fontWeight: "bold" }}>
        {metric} <span style={{ fontSize: "14px", color: "var(--color-text-tertiary)" }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <PageHeader 
          eyebrow="Live Dashboard" 
          title="Factory Flow" 
          description="Real-time movement of materials and production across the textile manufacturing process."
        />
        <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "var(--color-bg)", padding: "8px", borderRadius: "8px", border: "1px solid var(--color-stroke)" }}>
          <button 
            onClick={() => setIsSimulation(!isSimulation)}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", background: isSimulation ? "var(--color-primary)" : "transparent", color: isSimulation ? "white" : "inherit", border: "none", cursor: "pointer" }}
          >
            {isSimulation ? <Pause size={16} /> : <Play size={16} />}
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>{isSimulation ? "Pause" : "Play"} Sim</span>
          </button>
          
          <button 
            onClick={() => { setIsSimulation(false); setTimeout(() => setIsSimulation(true), 100); }}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", background: "transparent", border: "1px solid var(--color-stroke)", cursor: "pointer" }}
          >
            <RotateCcw size={16} />
            <span style={{ fontSize: "14px" }}>Reset</span>
          </button>

          <div style={{ width: "1px", height: "24px", background: "var(--color-stroke)", margin: "0 4px" }} />

          <button onClick={() => setSpeed(0.5)} style={{ padding: "4px 8px", borderRadius: "4px", background: speed === 0.5 ? "var(--color-bg-alt)" : "transparent", border: "none", cursor: "pointer" }}>0.5x</button>
          <button onClick={() => setSpeed(1)} style={{ padding: "4px 8px", borderRadius: "4px", background: speed === 1 ? "var(--color-bg-alt)" : "transparent", border: "none", cursor: "pointer" }}>1x</button>
          <button onClick={() => setSpeed(2)} style={{ padding: "4px 8px", borderRadius: "4px", background: speed === 2 ? "var(--color-bg-alt)" : "transparent", border: "none", cursor: "pointer" }}>2x</button>
        </div>
      </div>

      {/* 5 Dashboard Cards */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <MetricCard title="Raw Yarn in Warehouse" metric={rawYarnQty.toFixed(1)} unit="KG" />
        <MetricCard title="Total Processed Today" metric={totalProcessedToday.toFixed(1)} unit="M" />
        <MetricCard title="In-Process Material" metric={inProcessMaterial.toFixed(1)} unit="M" />
        <MetricCard title="Final Goods Ready" metric={fgQty.toFixed(1)} unit="M" />
        <MetricCard title="Dispatched Today" metric={dispatchingQty.toFixed(1)} unit="M" />
      </div>

      {/* 3D Scene */}
      <FactoryScene stageData={stageData} isSimulation={isSimulation} speed={speed} />

    </div>
  );
}
