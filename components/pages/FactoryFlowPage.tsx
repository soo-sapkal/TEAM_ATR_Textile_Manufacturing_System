"use client";

import React, { useMemo, useState } from "react";
import { FactoryScene } from "@/components/factory/FactoryScene";
import { useDemo } from "@/lib/demo/context";
import { Play, Pause, RotateCcw, Box, Factory, Focus } from "lucide-react";
import Decimal from "decimal.js";

function KpiCard({ title, value, unit, icon: Icon, isSimulated }: any) {
  return (
    <div className="bg-[#FBF9F3] border border-[#DED8CA] p-4 rounded-xl flex items-center space-x-4 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-[#F4F0E6] flex items-center justify-center text-[#72766F]">
        <Icon size={20} />
      </div>
      <div>
        <div className="text-xs font-semibold text-[#72766F] uppercase tracking-wider">{title} {isSimulated && "(Sim)"}</div>
        <div className="text-lg font-bold text-[#202321]">{value} <span className="text-sm font-normal text-[#72766F]">{unit}</span></div>
      </div>
    </div>
  );
}

export function FactoryFlowPage() {
  const { data, ready } = useDemo();
  
  // Controls state
  const [isSimulation, setIsSimulation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [resetCamera, setResetCamera] = useState(0);

  const stageData = useMemo<Record<number, any>>(() => {
    if (!ready) return {};

    // Calculate actual meters processed instead of "Active Ops"
    const rawYarnQty = data.yarnItems.reduce((acc, item) => acc + (parseFloat(item.available) || 0), 0);
    const spunYarnBatches = data.yarnBatches.filter(b => b.status === "AVAILABLE");
    const spunYarnTotal = spunYarnBatches.reduce((acc, b) => acc + (parseFloat(b.available) || 0), 0);
    
    // Processed meters based on operations 'good' output
    const spinningOutput = data.operations.filter(o => o.stage === "SPINNING").reduce((acc, o) => acc + (parseFloat(o.good) || 0), 0);
    const weavingOutput = data.operations.filter(o => o.stage === "WEAVING").reduce((acc, o) => acc + (parseFloat(o.good) || 0), 0);
    const dyeingOutput = data.operations.filter(o => o.stage === "DYEING").reduce((acc, o) => acc + (parseFloat(o.good) || 0), 0);
    
    const wovenRolls = data.rolls.filter(r => r.section === "WOVEN_FABRIC");
    const wovenTotal = wovenRolls.reduce((acc, r) => acc + (parseFloat(r.qty) || 0), 0);
    
    const dyedRolls = data.rolls.filter(r => r.section === "DYED_FABRIC");
    const dyedTotal = dyedRolls.reduce((acc, r) => acc + (parseFloat(r.qty) || 0), 0);
    
    const finalRolls = data.rolls.filter(r => r.section === "FINISHED_GOODS" && ["ACCEPTED", "RESERVED"].includes(r.status));
    const finalTotal = finalRolls.reduce((acc, r) => acc + (parseFloat(r.qty) || 0), 0);
    
    const qualityInspections = data.inspectionEvents.length;
    const dispatchPending = data.shipments.filter(s => s.status === "DRAFT").length;

    return {
      1: { value: `${rawYarnQty.toFixed(0)}`, unit: "kg", label: "Raw Yarn" },
      2: { value: `${spinningOutput.toFixed(0)}`, unit: "kg", label: "Spun Output" },
      3: { value: `${spunYarnTotal.toFixed(0)}`, unit: "kg", label: "Spun Yarn" },
      4: { value: `${weavingOutput.toFixed(0)}`, unit: "m", label: "Woven Output" },
      5: { value: `${wovenTotal.toFixed(0)}`, unit: "m", label: "Woven Fabric" },
      6: { value: `${dyeingOutput.toFixed(0)}`, unit: "m", label: "Dyed Output" },
      7: { value: `${dyedTotal.toFixed(0)}`, unit: "m", label: "Dyed Fabric" },
      8: { value: `${qualityInspections}`, unit: "rolls", label: "Inspected" },
      9: { value: `${finalTotal.toFixed(0)}`, unit: "m", label: "Final Goods" },
      10: { value: `${dispatchPending}`, unit: "shipments", label: "Pending" }
    };
  }, [data, ready]);

  if (!ready) {
    return <div className="p-8 text-center text-[#72766F]">Loading Factory State...</div>;
  }

  return (
    <div className="flex flex-col h-full space-y-4 pt-4 px-6 pb-6 bg-[#F4F0E6] min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[#202321]">Factory Flow</h1>
          <p className="text-sm text-[#72766F]">Live material movement across the textile production line.</p>
        </div>
        
        <div className="flex items-center space-x-3 bg-[#FBF9F3] p-2 rounded-lg border border-[#DED8CA] shadow-sm">
          <div className="flex items-center px-3 py-1 rounded-md bg-[#F4F0E6]">
            <div className={`w-2 h-2 rounded-full mr-2 ${isSimulation ? 'bg-orange-500' : 'bg-green-500'}`} />
            <span className="text-xs font-bold text-[#202321]">{isSimulation ? 'SIMULATION' : 'LIVE'}</span>
          </div>
          
          <button 
            onClick={() => setIsSimulation(!isSimulation)}
            className="text-xs px-3 py-1.5 border border-[#DED8CA] rounded-md hover:bg-[#F4F0E6] text-[#202321] font-medium transition-colors"
          >
            Toggle Mode
          </button>
          
          <div className="w-px h-6 bg-[#DED8CA]" />

          <button onClick={() => setIsPlaying(!isPlaying)} className="p-1.5 text-[#202321] hover:bg-[#F4F0E6] rounded-md" title="Play/Pause">
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <select 
            value={speed} 
            onChange={e => setSpeed(Number(e.target.value))}
            className="text-xs border border-[#DED8CA] bg-transparent rounded-md px-2 py-1 outline-none text-[#202321] cursor-pointer"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={2}>2.0x</option>
            <option value={5}>5.0x</option>
          </select>

          <button onClick={() => setResetCamera(prev => prev + 1)} className="p-1.5 text-[#202321] hover:bg-[#F4F0E6] rounded-md flex items-center space-x-1" title="Fit Factory">
            <Focus size={18} />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KpiCard title="Raw Yarn Stock" value={stageData[1]?.value || "0"} unit="kg" icon={Box} isSimulated={isSimulation} />
        <KpiCard title="Spinning Output" value={stageData[2]?.value || "0"} unit="kg" icon={Factory} isSimulated={isSimulation} />
        <KpiCard title="Weaving Output" value={stageData[4]?.value || "0"} unit="m" icon={Factory} isSimulated={isSimulation} />
        <KpiCard title="Dyeing Output" value={stageData[6]?.value || "0"} unit="m" icon={Factory} isSimulated={isSimulation} />
        <KpiCard title="Final Goods Ready" value={stageData[9]?.value || "0"} unit="m" icon={Box} isSimulated={isSimulation} />
      </div>

      {/* Main Canvas & Sidebar */}
      <div className="flex-1 flex gap-4 min-h-[600px]">
        {/* Canvas Area */}
        <div className="flex-1 bg-[#FBF9F3] border border-[#DED8CA] rounded-xl shadow-sm overflow-hidden relative">
          <FactoryScene 
            stageData={stageData} 
            isSimulation={isSimulation} 
            isPlaying={isPlaying}
            speed={speed} 
            resetCamera={resetCamera}
            onSelectStage={setSelectedStage}
            selectedStage={selectedStage}
          />
        </div>

        {/* Details Panel */}
        {selectedStage && (
          <div className="w-80 bg-[#FBF9F3] border border-[#DED8CA] rounded-xl shadow-sm p-5 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-[#202321] text-lg">Stage {selectedStage}</h3>
              <button onClick={() => setSelectedStage(null)} className="text-[#72766F] hover:text-[#202321]">
                ✕
              </button>
            </div>
            <div className="text-sm text-[#72766F] flex-1">
              <p className="mb-4">Details for {stageData[selectedStage]?.label}...</p>
              
              {/* Dummy data for now, would be wired up based on stage */}
              <div className="space-y-3">
                <div className="bg-[#F4F0E6] p-3 rounded-md">
                  <div className="text-xs font-semibold text-[#72766F] uppercase">Current Value</div>
                  <div className="text-[#202321] font-bold">{stageData[selectedStage]?.value} {stageData[selectedStage]?.unit}</div>
                </div>
                {isSimulation && (
                  <div className="text-orange-600 text-xs mt-2 bg-orange-100 p-2 rounded">
                    Showing simulated records for demonstration.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
