"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { RoleLink as Link } from "@/components/ui/primitives";
import { useState, useEffect, type FormEvent } from "react";
import { Activity, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Calendar, Factory, FileClock, Pause, Play, ShieldAlert, Sparkles, Wrench, X, AlertCircle } from "lucide-react";
import Decimal from "decimal.js";
import { useDemo } from "@/lib/demo/context";
import { hasPermission, DEMO_USERS } from "@/lib/auth/permissions";
import { formatDate, formatDateTime, formatMoney, formatQty } from "@/lib/domain/format";
import { outputEntrySchema } from "@/lib/domain/schemas";
import type { Operation, Stage } from "@/lib/domain/types";
import { Button, Card, DataTable, EmptyState, Field, InfoStrip, Kicker, LinkButton, Meter, PageHeader, SelectInput, StatCard, StatusBadge, Tag, TextArea, TextInput } from "@/components/ui/primitives";

const stageOrder: Stage[] = ["SPINNING", "WEAVING", "DYEING"];
export function ProductionRoute({ path, id }: { path: string; id?: string }) {
  if (path === "/my-work") return <MyWorkPage/>;
  if (path.startsWith("/production/operations/")) return <OperationConsole id={id ?? ""}/>;
  if (path.startsWith("/production/plans/")) return <PlanPage id={id ?? ""}/>;
  if (path === "/production/shift-summary") return <ShiftSummaryPage/>;
  return <ProductionBoard/>;
}

const PRIORITY_RANK = { "URGENT": 1, "HIGH": 2, "NORMAL": 3, "LOW": 4 };

export function computeOpReadiness(op: Operation, data: any) {
  if (op.stage === "SPINNING") {
    const order = (data.orders || []).find((o: any) => o.code === op.orderCode);
    let itemCode: string | null = null;
    if (order?.materialReadiness?.details?.[0]?.yarnCode) {
      itemCode = order.materialReadiness.details[0].yarnCode;
    }

    const eligibleBatches = (data.yarnBatches || []).filter((b: any) => 
      b.section === "RAW_YARN" && b.status === "AVAILABLE" && (!itemCode || b.itemCode === itemCode)
    );
    const totalRaw = eligibleBatches.reduce((sum: number, b: any) => sum + parseFloat(b.available || 0), 0);
    const committedRaw = (data.operations || [])
      .filter((o: any) => o.stage === "SPINNING" && o.id !== op.id && ["PLANNED", "IN_PROGRESS", "PAUSED"].includes(o.status) && o.machineCode)
      .reduce((sum: number, o: any) => sum + Math.max(0, parseFloat(o.target || 0) - parseFloat(o.good || 0)), 0);
    const available = Math.max(0, totalRaw - committedRaw);
    const isBlocked = available <= 0;
    return {
      available,
      unit: op.unit || "KG",
      isBlocked,
      reason: isBlocked 
        ? itemCode 
          ? `Cannot assign spinning: no raw yarn available for '${itemCode}' in warehouse.`
          : "Cannot assign spinning: no raw yarn available in warehouse. Wait for inventory receipt." 
        : ""
    };
  }

  if (op.stage === "WEAVING") {
    const totalSpun = (data.yarnBatches || [])
      .filter((b: any) => b.orderCode === op.orderCode && b.section === "SPUN_YARN" && b.status === "AVAILABLE")
      .reduce((sum: number, b: any) => sum + parseFloat(b.available || 0), 0);
    const committedSpun = (data.operations || [])
      .filter((o: any) => o.orderCode === op.orderCode && o.stage === "WEAVING" && o.id !== op.id && ["PLANNED", "IN_PROGRESS", "PAUSED"].includes(o.status) && o.machineCode)
      .reduce((sum: number, o: any) => sum + Math.max(0, parseFloat(o.target || 0) - parseFloat(o.good || 0)), 0);
    const available = Math.max(0, totalSpun - committedSpun);
    const isBlocked = available <= 0;
    return {
      available,
      unit: "KG",
      isBlocked,
      reason: isBlocked 
        ? totalSpun <= 0
          ? "Cannot assign weaving: no spun yarn is available in spinning storage. Complete spinning first."
          : "Cannot assign weaving: all spun yarn is already committed to active weaving tasks."
        : ""
    };
  }

  if (op.stage === "DYEING") {
    const totalWoven = (data.rolls || [])
      .filter((r: any) => r.orderCode === op.orderCode && r.section === "WOVEN_FABRIC" && !["REJECTED", "QUARANTINED", "RESERVED"].includes(r.status))
      .reduce((sum: number, r: any) => sum + parseFloat(r.qty || 0), 0);
    const committedWoven = (data.operations || [])
      .filter((o: any) => o.orderCode === op.orderCode && o.stage === "DYEING" && o.id !== op.id && ["PLANNED", "IN_PROGRESS", "PAUSED"].includes(o.status) && o.machineCode)
      .reduce((sum: number, o: any) => sum + Math.max(0, parseFloat(o.target || 0) - parseFloat(o.good || 0)), 0);
    const available = Math.max(0, totalWoven - committedWoven);
    const isBlocked = available <= 0;
    return {
      available,
      unit: "M",
      isBlocked,
      reason: isBlocked 
        ? totalWoven <= 0
          ? "Cannot assign dyeing: no woven fabric is available in weaving storage. Complete weaving first."
          : "Cannot assign dyeing: all woven fabric is already committed to active dyeing tasks."
        : ""
    };
  }

  return { available: 999999, unit: op.unit, isBlocked: false, reason: "" };
}

function ProductionBoard() {
  const { data } = useDemo();
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrderCode, setSelectedOrderCode] = useState<string | null>(null);
  const [assignOperatorModal, setAssignOperatorModal] = useState<{ operatorName: string, shift: string } | null>(null);

  const shifts = ["A · 06:00–14:00", "B · 14:00–22:00", "C · 22:00–06:00"];

  // Sort unassigned operations by priority and due date
  const unassignedOps = data.operations
    .filter(op => ["PLANNED", "PAUSED"].includes(op.status) && !op.machineCode)
    .sort((a, b) => {
      const orderA = data.orders.find(o => o.code === a.orderCode);
      const orderB = data.orders.find(o => o.code === b.orderCode);
      if (!orderA || !orderB) return 0;
      
      const rankA = PRIORITY_RANK[orderA.priority] ?? 5;
      const rankB = PRIORITY_RANK[orderB.priority] ?? 5;
      
      if (rankA !== rankB) return rankA - rankB;
      return new Date(orderA.due).getTime() - new Date(orderB.due).getTime();
    });

  return <>
    {assignOperatorModal && <AssignTaskModal operatorName={assignOperatorModal.operatorName} shift={assignOperatorModal.shift} unassignedOps={unassignedOps} onClose={() => setAssignOperatorModal(null)} />}
    {selectedOrderCode && <OrderModal orderCode={selectedOrderCode} onClose={() => setSelectedOrderCode(null)} />}
    <PageHeader 
      eyebrow="Make & move · shop floor" 
      title="Shift Schedule" 
      description="View shiftwise assignments for any date, and assign unfulfilled order tasks." 
      actions={<><LinkButton href="/production/shift-summary" variant="secondary"><FileClock size={14}/> Shift summary</LinkButton><LinkButton href="/orders" variant="primary">Order plans <ArrowRight size={14}/></LinkButton></>} 
    />
    
    <div style={{ marginBottom: 24 }}>
      <Card>
        <div style={{ padding: "16px", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>Schedule Date:</span>
          <TextInput type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} />
          <Button variant="secondary" onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            setCurrentDate(d.toISOString().split('T')[0]);
          }}>Yesterday</Button>
          <Button variant="secondary" onClick={() => setCurrentDate(new Date().toISOString().split('T')[0])}>Today</Button>
        </div>
      </Card>
    </div>
    
    <div className="page-grid">
      {shifts.map((shift, shiftIndex) => {
        const expectedShiftString = `${currentDate} | ${shift}`;
        // Support both discrete scheduledDate and legacy assignment format
        const assignedOps = data.operations.filter(op => 
          (op.scheduledDate === currentDate && op.shift === shift) ||
          op.shift === expectedShiftString || 
          (op.shift === shift && !op.scheduledDate && currentDate === new Date().toISOString().split('T')[0])
        );
        
        const machineOperators = DEMO_USERS.filter(u => u.roles.includes("MACHINE_OPERATOR")).filter((op, idx) => {
          const operatorName = op.name.split(" (")[0];
          
          // 1. Are they assigned to THIS shift?
          if (assignedOps.some(o => Array.isArray(o.operators) && o.operators.includes(operatorName))) return true;
          
          // 2. Are they assigned to ANY OTHER shift on this same date?
          const isBusyToday = data.operations.some(o => 
            Array.isArray(o.operators) && o.operators.includes(operatorName) && 
            (o.scheduledDate === currentDate || o.shift?.startsWith(currentDate) || (o.shift && !o.scheduledDate && currentDate === new Date().toISOString().split('T')[0] && !o.shift.includes("|")))
          );
          if (isBusyToday) return false;
          
          // 3. If idle today, only show them in their assigned roster (e.g. index % 3)
          return idx % 3 === shiftIndex;
        });

        const accountedOpIds = new Set<string>();

        return (
          <div key={shift} className="col-4">
            <Card title={`Shift ${shift.split(" ")[0]}`} action={<Tag>{assignedOps.length} tasks</Tag>}>
              <div className="stack-sm">
                {machineOperators.map(operator => {
                  const operatorName = operator.name.split(" (")[0];
                  const assignedOp = assignedOps.find(op => Array.isArray(op.operators) && op.operators.includes(operatorName));

                  if (assignedOp) {
                    accountedOpIds.add(assignedOp.id);
                    return (
                      <div key={operator.id}>
                        <div style={{ fontSize: 12, fontWeight: 700, paddingBottom: "4px", color: "var(--indigo)", display: "flex", alignItems: "center", gap: 6 }}>
                          👤 {operatorName}
                        </div>
                        <ScheduledOperationCard operation={assignedOp} onOrderClick={setSelectedOrderCode} />
                      </div>
                    );
                  } else {
                    return (
                      <div key={operator.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: "8px 12px", background: "var(--paper)", borderRadius: 4, border: "1px dashed var(--line-dark)" }}>
                        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>👤</span>
                        <span style={{ fontWeight: 600, fontSize: 13, flex: 1, color: "var(--ink-soft)" }}>{operatorName}</span>
                        <Button size="sm" variant="secondary" onClick={() => setAssignOperatorModal({ operatorName, shift: expectedShiftString })}>+ Assign</Button>
                      </div>
                    );
                  }
                })}

                {/* Leftover operations that were assigned without a recognized operator */}
                {assignedOps.filter(op => !accountedOpIds.has(op.id)).map(op => (
                   <div key={op.id}>
                      <div style={{ fontSize: 12, fontWeight: 700, paddingBottom: "4px", color: "var(--madder)", display: "flex", alignItems: "center", gap: 6 }}>
                         ⚠️ Unassigned Operator
                      </div>
                      <ScheduledOperationCard operation={op} onOrderClick={setSelectedOrderCode} />
                   </div>
                ))}
              </div>
            </Card>
          </div>
        );
      })}
    </div>

    <div style={{ marginTop: 32 }}>
      <Card title="Unassigned Order Tasks" action={<Tag>{unassignedOps.length} pending</Tag>}>
        <InfoStrip tone="info">Tasks are automatically sorted by Order Priority and Due Date.</InfoStrip>
        <div className="page-grid" style={{ marginTop: 16 }}>
          {unassignedOps.map(op => (
            <div key={op.id} className="col-6">
              <OperationCard operation={op} onOrderClick={setSelectedOrderCode} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  </>;
}

function ScheduledOperationCard({ operation, onOrderClick }: { operation: Operation; onOrderClick: (c: string) => void }) {
  const { data } = useDemo();
  const order = data.orders.find(o => o.code === operation.orderCode);
  const percent = new Decimal(operation.target).gt(0) ? Decimal.min(100, new Decimal(operation.good).div(operation.target).mul(100)).toNumber() : 0;

  return (
    <article className="stage-card" style={{ padding: "12px", background: "var(--paper)" }}>
      <div className="stage-card__meta">
        <button style={{ background: "none", border: "none", padding: 0, textDecoration: "underline", cursor: "pointer", color: "inherit", fontWeight: 700 }} onClick={() => onOrderClick(operation.orderCode)}>
          {operation.orderCode}
        </button>
        <StatusBadge status={operation.status}/>
      </div>
      <div style={{ margin: "8px 0", fontSize: 13, color: "var(--ink-soft)" }}>
        {order ? `${order.product} · ${order.colour}` : "Unknown Product"}
      </div>
      <div className="stage-card__meta" style={{ marginTop: 8 }}>
        <span style={{ fontWeight: 600 }}>{operation.stage}</span>
        <span>{operation.machineCode}</span>
      </div>
      <div style={{ fontSize: 12, marginTop: 4 }}>
        <strong>Operator:</strong> {operation.operators.join(" · ") || "None"}
      </div>
      <div style={{ marginTop: 12 }}>
        <Meter value={operation.good} total={operation.target} label="Output" tone={percent >= 100 ? "neem" : "indigo"}/>
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
         <Link className="btn btn--quiet btn--sm" href={`/production/operations/${operation.id}`}>Console <ArrowRight size={12}/></Link>
      </div>
    </article>
  );
}

function OperationCard({ operation, onOrderClick }: { operation: Operation; onOrderClick?: (code: string) => void }) {
  const { data, user, act, toast } = useDemo();
  const order = data.orders.find((o) => o.code === operation.orderCode);
  
  const shiftParts = (operation.shift || "").split(" | ");
  const initialDate = shiftParts.length > 1 ? shiftParts[0] : new Date().toISOString().split('T')[0];
  const initialShift = shiftParts.length > 1 ? shiftParts[1] : (operation.shift ?? "");

  const [selectedMachine, setSelectedMachine] = useState(operation.machineCode ?? "");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedShift, setSelectedShift] = useState(initialShift);
  const [selectedOperator, setSelectedOperator] = useState(operation.operators[0] ?? "");
  const [customTarget, setCustomTarget] = useState(operation.target.toString());
  const [commandRevision, setCommandRevision] = useState(1);
  const [assigning, setAssigning] = useState(false);
  
  // 1. Skill-based operator qualification
  const eligibleOperators = DEMO_USERS.filter((u) => {
    if (!u.roles.includes("MACHINE_OPERATOR")) return false;
    const nameLower = u.name.toLowerCase();
    const opSkill = (u as any).skill || (nameLower.includes("spinning") ? "SPINNING" : nameLower.includes("weaving") ? "WEAVING" : nameLower.includes("dyeing") ? "DYEING" : "ALL");
    return opSkill === "ALL" || opSkill === operation.stage;
  });

  // 2. Upstream material readiness check
  const readiness = computeOpReadiness(operation, data);

  const canAssign = hasPermission(user, "production.assign") && ["PLANNED", "PAUSED"].includes(operation.status);
  const eligibleMachines = data.machines.filter((machine) => machine.stage === operation.stage && machine.status === "IDLE" && (!machine.operationId || machine.operationId === operation.id) && !data.operations.some((other) => other.id !== operation.id && other.machineCode === machine.code && ["PLANNED", "IN_PROGRESS", "PAUSED"].includes(other.status)));
  const selectedCode = eligibleMachines.some((machine) => machine.code === selectedMachine) ? selectedMachine : eligibleMachines[0]?.code ?? "";
  
  const fullShiftString = `${selectedDate} | ${selectedShift}`;
  const alreadyAssigned = selectedCode === operation.machineCode && fullShiftString === (operation.shift ?? "") && selectedOperator === (operation.operators[0] ?? "") && data.machines.some((machine) => machine.code === selectedCode && machine.operationId === operation.id);
  const percent = new Decimal(operation.target).gt(0) ? Decimal.min(100, new Decimal(operation.good).div(operation.target).mul(100)).toNumber() : 0;
  
  const targetNum = parseFloat(customTarget) || parseFloat(operation.target as any || 0);
  const estimatedHours = new Decimal(targetNum).div(50).toNumber();
  const isLarge = estimatedHours > 8;
  const [autoSplit, setAutoSplit] = useState(isLarge);

  return <article className="stage-card">
    <div className="stage-card__meta"><span>{operation.code}</span><StatusBadge status={operation.status}/></div>
    <h3>{operation.stage}</h3>
    <div className="stage-card__meta"><span>{operation.machineCode ?? "Unassigned"}</span><span>{operation.shift ?? "Shift not assigned"}</span></div>
    <p className="cell-secondary">{(Array.isArray(operation.operators) ? operation.operators : []).join(" · ") || "Operator not assigned"}</p>
    <Meter value={operation.good} total={operation.target} label="Good output" tone={percent >= 100 ? "neem" : "indigo"}/>
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
      <span className="cell-secondary">Waste {formatQty(operation.waste, operation.unit, 1)} · Reject {formatQty(operation.reject, operation.unit, 1)}</span>
      <Link className="btn btn--secondary btn--sm" href={`/production/operations/${operation.id}`}>Open console <ArrowRight size={12}/></Link>
    </div>

    {/* Upstream material status banner */}
    <div style={{ marginTop: 12 }}>
      {readiness.isBlocked ? (
        <div style={{ padding: "8px 12px", background: "var(--madder-soft)", border: "1px solid var(--madder)", color: "var(--madder)", borderRadius: 4, fontWeight: 600, fontSize: 13 }}>
          ⚠️ {readiness.reason}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ padding: "6px 10px", background: "var(--sand)", borderRadius: 4, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Eligible upstream material in storage:</span>
            <strong>{readiness.available.toFixed(1)} {readiness.unit}</strong>
          </div>
          {readiness.available < parseFloat(operation.target as any || 0) && (
            <span style={{ fontSize: 11, color: "var(--indigo)", fontWeight: 600 }}>
              ℹ️ Partial material: {readiness.available.toFixed(1)} {readiness.unit} available for {operation.stage}. Target capped to available; remainder will stay planned.
            </span>
          )}
        </div>
      )}
    </div>

    {canAssign && (
      <div className="operation-assignment" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
        <div style={{ padding: 12, background: "var(--indigo-soft)", borderRadius: 4, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>⏱️ Estimated time: {estimatedHours.toFixed(1)} hours <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(@50 {operation.unit}/hr)</span></span>
          {isLarge && <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}><input type="checkbox" checked={autoSplit} onChange={e => setAutoSplit(e.target.checked)} /> <span>Auto-split remaining {Math.max(0, estimatedHours - 8).toFixed(1)} hrs to next shift</span></label>}
        </div>

        <Field label={`Target Quantity (${operation.unit})`}>
          <TextInput 
            type="number" 
            value={customTarget} 
            onChange={(e) => setCustomTarget(e.target.value)} 
            disabled={assigning || readiness.isBlocked} 
          />
        </Field>
        
        <Field label="Date"><TextInput type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} disabled={assigning || readiness.isBlocked} /></Field>
        <Field label="Shift">
          <SelectInput value={selectedShift} onChange={(event) => setSelectedShift(event.target.value)} disabled={assigning || readiness.isBlocked}>
            <option value="">Select shift</option>
            <option value="A · 06:00–14:00">A · 06:00–14:00</option>
            <option value="B · 14:00–22:00">B · 14:00–22:00</option>
            <option value="C · 22:00–06:00">C · 22:00–06:00</option>
          </SelectInput>
        </Field>
        <Field label="Machine">
          <SelectInput value={selectedCode} onChange={(event) => setSelectedMachine(event.target.value)} disabled={!eligibleMachines.length || assigning || readiness.isBlocked}>
            <option value="">No eligible machine</option>
            {eligibleMachines.map((machine) => <option key={machine.id} value={machine.code}>{machine.code} · {machine.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Operator (Filtered by skill)">
          <SelectInput value={selectedOperator} onChange={(event) => setSelectedOperator(event.target.value)} disabled={assigning || readiness.isBlocked}>
            <option value="">Select operator</option>
            {eligibleOperators.map((u) => <option key={u.id} value={u.name.split(" (")[0]}>{u.name}</option>)}
          </SelectInput>
        </Field>

        <Button 
          size="sm" 
          disabled={readiness.isBlocked || !selectedCode || !selectedShift || !selectedDate || !selectedOperator || assigning || alreadyAssigned} 
          onClick={async () => { 
            setAssigning(true); 
            try { 
              const res = await fetch("/api/production/assign-machine", { 
                method: "POST", 
                body: JSON.stringify({ 
                  operationId: operation.id, 
                  machineId: selectedCode, 
                  shift: selectedShift, 
                  date: selectedDate, 
                  operator: selectedOperator, 
                  actor: user?.name, 
                  autoSplit,
                  target: customTarget ? parseFloat(customTarget) : undefined
                }) 
              }); 
              const outcome = await res.json(); 
              if (outcome.success) { 
                toast("Assignment saved", isLarge && autoSplit ? "Assigned and remaining quantity auto-split to next shift." : "Operation assigned for the day.", "success"); 
                setCommandRevision((current) => current + 1); 
                window.location.reload(); 
              } else { 
                toast("Error", outcome.error, "error"); 
              } 
            } catch (err: any) { 
              toast("Error", err.message, "error"); 
            } finally { 
              setAssigning(false); 
            } 
          }}
        >
          {assigning ? "Assigning…" : alreadyAssigned ? "Saved" : readiness.isBlocked ? "Blocked by Upstream Material" : "Save Assignment"}
        </Button>
        {!eligibleMachines.length && <span className="field__hint">No unreserved IDLE {operation.stage.toLowerCase()} machine is currently available.</span>}
      </div>
    )}
    {!canAssign && ["PLANNED", "PAUSED"].includes(operation.status) && <span className="field__hint">Machine assignment requires production.assign.</span>}
  </article>;
}

function MyWorkPage() {
  const { data, user, toast, loginAs } = useDemo();
  const [liveOps, setLiveOps] = useState<import('@/lib/domain/types').Operation[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "unassigned">("active");

  // Selected operator for viewing/testing (defaults to current logged-in operator)
  const defaultOpName = user?.name ? user.name.split(' (')[0] : "Ravi Kumar";
  const [selectedOperator, setSelectedOperator] = useState<string>(defaultOpName);

  // Modals
  const [fillDetailsOp, setFillDetailsOp] = useState<Operation | null>(null);
  const [markCompleteOp, setMarkCompleteOp] = useState<Operation | null>(null);

  const refreshTasks = () => {
    setLoadingTasks(true);
    fetch('/api/production')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data?.operations) {
          setLiveOps(res.data.operations);
        } else {
          setLiveOps(data.operations);
        }
      })
      .catch(() => setLiveOps(data.operations))
      .finally(() => setLoadingTasks(false));
  };

  useEffect(() => {
    refreshTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter tasks for the selected operator
  const myAssignedOps = liveOps.filter((operation) => {
    const isAssigned = Array.isArray(operation.operators) && operation.operators.some(op => 
      op.toLowerCase().includes(selectedOperator.toLowerCase()) || 
      selectedOperator.toLowerCase().includes(op.toLowerCase())
    );
    return isAssigned;
  });

  const activeOps = myAssignedOps.filter(op => ["IN_PROGRESS", "PLANNED", "PAUSED"].includes(op.status));
  const completedOps = myAssignedOps.filter(op => op.status === "COMPLETED");

  // Unassigned tasks available for claim in operator's section
  const unassignedOps = liveOps.filter(op => 
    !op.machineCode && ["PLANNED", "PAUSED"].includes(op.status) && 
    (!op.operators || op.operators.length === 0)
  );

  const todayDateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const operatorPersonas = [
    { name: "Ravi Kumar", stage: "SPINNING", roleLabel: "Spinning Operator (SPIN-01)" },
    { name: "Suresh Patel", stage: "WEAVING", roleLabel: "Weaving Operator (WEAV-01)" },
    { name: "Kavita Rao", stage: "DYEING", roleLabel: "Dyeing Operator (DYE-01)" },
    { name: "Amit Sharma", stage: "SPINNING", roleLabel: "Spinning Operator 1" },
  ];

  return (
    <>
      {fillDetailsOp && (
        <FillProductionModal
          operation={fillDetailsOp}
          onClose={() => setFillDetailsOp(null)}
          onSuccess={() => {
            setFillDetailsOp(null);
            refreshTasks();
          }}
        />
      )}

      {markCompleteOp && (
        <MarkCompleteModal
          operation={markCompleteOp}
          onClose={() => setMarkCompleteOp(null)}
          onSuccess={() => {
            setMarkCompleteOp(null);
            refreshTasks();
          }}
        />
      )}

      <PageHeader
        eyebrow="Shop Floor · Operator Console"
        title="Today's Assigned Tasks"
        description={`Day's production tasks for ${selectedOperator}. Record outputs, adjust machinery, and mark completions.`}
        actions={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b" }}>Switch Operator:</span>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "2px solid #000",
                fontWeight: 700,
                background: "#fef08a",
                cursor: "pointer"
              }}
            >
              {operatorPersonas.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.stage})
                </option>
              ))}
            </select>
          </div>
        }
        meta={
          <>
            <Tag><Calendar size={13} style={{ marginRight: 4 }}/> {todayDateStr}</Tag>
            <Tag><Clock size={13} style={{ marginRight: 4 }}/> SHIFT A · 06:00–14:00</Tag>
            <Tag>OPERATOR: {selectedOperator.toUpperCase()}</Tag>
          </>
        }
      />

      {/* Tabs */}
      <div className="filter-row production-view-tabs" style={{ marginBottom: 20 }}>
        <button
          className={`filter-chip ${activeTab === "active" ? "filter-chip--active" : ""}`}
          onClick={() => setActiveTab("active")}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Activity size={15}/> Today's Active Tasks ({activeOps.length})
        </button>
        <button
          className={`filter-chip ${activeTab === "completed" ? "filter-chip--active" : ""}`}
          onClick={() => setActiveTab("completed")}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <CheckCircle2 size={15}/> Completed Today ({completedOps.length})
        </button>
        <button
          className={`filter-chip ${activeTab === "unassigned" ? "filter-chip--active" : ""}`}
          onClick={() => setActiveTab("unassigned")}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Sparkles size={15}/> Available to Claim ({unassignedOps.length})
        </button>
      </div>

      {loadingTasks && (
        <div className="info-strip" style={{ marginBottom: 20 }}>
          <Activity size={18}/>
          <div><strong>Loading tasks…</strong><div>Fetching live assignment records from Supabase database.</div></div>
        </div>
      )}

      {/* ACTIVE TASKS TAB */}
      {activeTab === "active" && !loadingTasks && (
        <>
          {activeOps.length === 0 ? (
            <div className="page-grid">
              <div className="col-12">
                <EmptyState
                  title="No active tasks assigned for today"
                  detail={`No pending operations are currently assigned to ${selectedOperator} for today's shift. You can claim an unassigned task from the Available tab, or select another operator persona.`}
                  action={
                    <Button variant="primary" onClick={() => setActiveTab("unassigned")}>
                      <Sparkles size={16}/> Browse Unassigned Tasks
                    </Button>
                  }
                />
              </div>
            </div>
          ) : (
            <div className="page-grid">
              {activeOps.map((op) => {
                const machine = data.machines.find(m => m.code === op.machineCode);
                const progressPct = new Decimal(op.target || 1).gt(0) 
                  ? Math.min(100, Math.round(new Decimal(op.good || 0).div(op.target).mul(100).toNumber()))
                  : 0;

                return (
                  <Card
                    className="col-6"
                    key={op.id}
                    title={op.code}
                    action={
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Tag>{op.stage}</Tag>
                        <StatusBadge status={op.status}/>
                      </div>
                    }
                  >
                    <div className="stage-card__meta" style={{ marginBottom: 12 }}>
                      <span><strong>Order:</strong> {op.orderCode}</span>
                      <span><strong>Shift:</strong> {op.shift || "Today · Shift A"}</span>
                    </div>

                    <div style={{
                      padding: "12px",
                      background: "#f8fafc",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      marginBottom: 16
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <div>
                          <span style={{ fontSize: "1.75rem", fontWeight: 900, fontFamily: "var(--font-display)" }}>
                            {formatQty(op.good, op.unit, 1)}
                          </span>
                          <span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: 6 }}>
                            / {formatQty(op.target, op.unit, 0)} target
                          </span>
                        </div>
                        <span style={{
                          fontWeight: 800,
                          fontSize: "1.1rem",
                          color: progressPct >= 100 ? "#059669" : "#2563eb"
                        }}>
                          {progressPct}% Done
                        </span>
                      </div>
                      <Meter value={op.good} total={op.target} label="Production Completion"/>
                      
                      <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: "0.85rem", color: "#475569" }}>
                        <span>Waste: <strong>{formatQty(op.waste || 0, op.unit, 1)}</strong></span>
                        <span>Reject: <strong>{formatQty(op.reject || 0, op.unit, 1)}</strong></span>
                        <span>Machine: <strong>{op.machineCode || "Unassigned"}</strong> {machine && `(${machine.status})`}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      <Button
                        variant="primary"
                        size="lg"
                        style={{ background: "#2563eb", color: "#fff", borderColor: "#000" }}
                        onClick={() => setFillDetailsOp(op)}
                      >
                        <Activity size={17}/> Fill Production Details
                      </Button>

                      <Button
                        variant="secondary"
                        size="lg"
                        style={{ background: "#10b981", color: "#fff", borderColor: "#000" }}
                        onClick={() => setMarkCompleteOp(op)}
                      >
                        <CheckCircle2 size={17}/> Mark Complete
                      </Button>

                      {op.status === "IN_PROGRESS" ? (
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/production/operation-transition", {
                                method: "POST",
                                body: JSON.stringify({ operationId: op.id, action: "pause", reason: "Operator paused operation", actor: selectedOperator })
                              });
                              const out = await res.json();
                              if (out.success) {
                                toast("Operation Paused", `${op.code} is now paused.`, "info");
                                refreshTasks();
                              } else {
                                toast("Error", out.error, "error");
                              }
                            } catch (e: any) {
                              toast("Error", e.message, "error");
                            }
                          }}
                        >
                          <Pause size={16}/> Pause
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/production/operation-transition", {
                                method: "POST",
                                body: JSON.stringify({ operationId: op.id, action: "start", reason: "Operator started operation", actor: selectedOperator })
                              });
                              const out = await res.json();
                              if (out.success) {
                                toast("Operation Started", `${op.code} is in progress.`, "success");
                                refreshTasks();
                              } else {
                                toast("Error", out.error, "error");
                              }
                            } catch (e: any) {
                              toast("Error", e.message, "error");
                            }
                          }}
                        >
                          <Play size={16}/> Start
                        </Button>
                      )}

                      {machine && (
                        <Button
                          variant="quiet"
                          size="lg"
                          style={{ color: "var(--madder)", border: "2px solid var(--madder)", background: "#fff" }}
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/production/machine-status", {
                                method: "POST",
                                body: JSON.stringify({ machineId: machine.id, status: "BREAKDOWN", reason: "Operator reported breakdown from Floor View", actor: selectedOperator })
                              });
                              const outcome = await res.json();
                              if (outcome.success) {
                                toast("Breakdown Reported", `Alert sent for ${machine.code} breakdown.`, "error");
                                refreshTasks();
                              } else {
                                toast("Error", outcome.error, "error");
                              }
                            } catch (err: any) {
                              toast("Error", err.message, "error");
                            }
                          }}
                        >
                          <ShieldAlert size={16}/> Report Breakdown
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* COMPLETED TASKS TAB */}
      {activeTab === "completed" && !loadingTasks && (
        <>
          {completedOps.length === 0 ? (
            <div className="page-grid">
              <div className="col-12">
                <EmptyState
                  title="No tasks marked completed today yet"
                  detail={`When ${selectedOperator} finishes an assigned task and clicks 'Mark Complete', it will show here in the completed shift log.`}
                  action={
                    <Button variant="secondary" onClick={() => setActiveTab("active")}>
                      View Active Tasks
                    </Button>
                  }
                />
              </div>
            </div>
          ) : (
            <div className="page-grid">
              {completedOps.map((op) => (
                <Card
                  className="col-6"
                  key={op.id}
                  title={op.code}
                  action={<StatusBadge status="COMPLETED"/>}
                >
                  <div className="stage-card__meta" style={{ marginBottom: 10 }}>
                    <span><strong>Order:</strong> {op.orderCode}</span>
                    <span><strong>Stage:</strong> {op.stage}</span>
                  </div>
                  <div style={{
                    padding: "12px",
                    background: "#ecfdf5",
                    border: "2px solid #a7f3d0",
                    borderRadius: "8px",
                    marginBottom: 12
                  }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#065f46" }}>
                      {formatQty(op.good, op.unit, 1)} Good Output
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#047857", marginTop: 4 }}>
                      Target of {formatQty(op.target, op.unit, 0)} completed 100% on machine {op.machineCode || "N/A"}.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: "0.85rem", color: "#64748b" }}>
                    <span>Waste: {formatQty(op.waste || 0, op.unit, 1)}</span>
                    <span>Reject: {formatQty(op.reject || 0, op.unit, 1)}</span>
                    <span>Status: <strong style={{ color: "#059669" }}>VERIFIED COMPLETED</strong></span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* UNASSIGNED TASKS TAB */}
      {activeTab === "unassigned" && !loadingTasks && (
        <>
          {unassignedOps.length === 0 ? (
            <div className="page-grid">
              <div className="col-12">
                <EmptyState
                  title="All tasks are currently assigned"
                  detail="There are no unassigned planned operations waiting on the shop floor right now."
                  action={<Button variant="secondary" onClick={() => setActiveTab("active")}>Return to my tasks</Button>}
                />
              </div>
            </div>
          ) : (
            <div className="page-grid">
              {unassignedOps.map((op) => (
                <Card
                  className="col-6"
                  key={op.id}
                  title={op.code}
                  action={<StatusBadge status={op.status}/>}
                >
                  <div className="stage-card__meta" style={{ marginBottom: 10 }}>
                    <span><strong>Order:</strong> {op.orderCode}</span>
                    <span><strong>Stage:</strong> {op.stage}</span>
                  </div>
                  <div style={{ margin: "10px 0" }}>
                    <strong>Target:</strong> {formatQty(op.target, op.unit, 0)}
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={async () => {
                      try {
                        const defaultMachine = data.machines.find(m => m.stage === op.stage && m.status === "IDLE")?.code || 
                          (op.stage === "SPINNING" ? "SPIN-01" : op.stage === "WEAVING" ? "WEAV-01" : "DYE-01");
                        const res = await fetch("/api/production/assign-machine", {
                          method: "POST",
                          body: JSON.stringify({
                            operationId: op.id,
                            machineId: defaultMachine,
                            shift: `A · 06:00–14:00`,
                            date: new Date().toISOString().split('T')[0],
                            operator: selectedOperator,
                            actor: selectedOperator
                          })
                        });
                        const out = await res.json();
                        if (out.success) {
                          toast("Task Claimed!", `${op.code} assigned to ${selectedOperator} on ${defaultMachine}.`, "success");
                          setActiveTab("active");
                          refreshTasks();
                        } else {
                          toast("Error", out.error, "error");
                        }
                      } catch (err: any) {
                        toast("Error", err.message, "error");
                      }
                    }}
                  >
                    <Check size={16}/> Claim Task for Today
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

/**
 * Modal to Fill Production Details
 */
function FillProductionModal({
  operation,
  onClose,
  onSuccess
}: {
  operation: Operation;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast, user } = useDemo();
  const [good, setGood] = useState("");
  const [waste, setWaste] = useState("0");
  const [reject, setReject] = useState("0");
  const [rollQty, setRollQty] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const finalStage = operation.stage === "DYEING";
  const isWeaving = operation.stage === "WEAVING";

  async function handleRecord(e: FormEvent) {
    e.preventDefault();
    if (!good || parseFloat(good) <= 0) {
      toast("Invalid quantity", "Please enter a valid good production quantity.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/production/record-output", {
        method: "POST",
        body: JSON.stringify({
          operationId: operation.id,
          good: parseFloat(good),
          waste: parseFloat(waste || "0"),
          reject: parseFloat(reject || "0"),
          rollQty: rollQty ? parseFloat(rollQty) : undefined,
          actor: user?.name || "Operator"
        })
      });
      const outcome = await res.json();
      if (outcome.success) {
        toast("Production Logged!", `Recorded +${good} ${operation.unit} good output for ${operation.code}.`, "success");
        onSuccess();
      } else {
        toast("Error", outcome.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(2px)"
    }}>
      <div style={{
        background: "white",
        padding: 24,
        borderRadius: 12,
        width: "90%",
        maxWidth: 580,
        maxHeight: "90%",
        overflow: "auto",
        position: "relative",
        border: "3px solid #000",
        boxShadow: "6px 6px 0px #000"
      }}>
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{
            background: "#2563eb",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: "6px",
            fontWeight: 800,
            fontSize: "0.85rem"
          }}>
            {operation.stage}
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
            Fill Production Details: {operation.code}
          </h2>
        </div>

        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 16 }}>
          Order: <strong>{operation.orderCode}</strong> · Machine: <strong>{operation.machineCode || "N/A"}</strong> · Target: <strong>{formatQty(operation.target, operation.unit, 0)}</strong>
        </p>

        <form onSubmit={handleRecord} className="stack">
          <Field label={`Good Output (${operation.unit}) *`} hint="Quantity accepted into stock / next stage">
            <TextInput
              type="number"
              step="0.01"
              required
              placeholder="e.g. 250.00"
              value={good}
              onChange={(e) => setGood(e.target.value)}
              autoFocus
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={`Waste (${operation.unit})`} hint="Process trimmings & fibers">
              <TextInput
                type="number"
                step="0.01"
                placeholder="0.00"
                value={waste}
                onChange={(e) => setWaste(e.target.value)}
              />
            </Field>

            <Field label={`Reject (${operation.unit})`} hint="Defective or off-spec">
              <TextInput
                type="number"
                step="0.01"
                placeholder="0.00"
                value={reject}
                onChange={(e) => setReject(e.target.value)}
              />
            </Field>
          </div>

          {isWeaving && (
            <Field label="Fabric Roll Quantity (M)" hint="Optionally generate a fabric roll ID for quality inspection">
              <TextInput
                type="number"
                step="0.01"
                placeholder={good || "Roll length meters"}
                value={rollQty}
                onChange={(e) => setRollQty(e.target.value)}
              />
            </Field>
          )}

          <Field label="Shift Remarks / Operator Notes" hint="Optional speed, tension, or downtime notes">
            <TextArea
              rows={2}
              placeholder="e.g. Machine ran smoothly at 850 RPM, no thread breakage."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              style={{ background: "#2563eb", color: "#fff", borderColor: "#000" }}
            >
              {submitting ? "Saving to Database…" : "Save Production Log"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal to Mark Operation as Completed
 */
function MarkCompleteModal({
  operation,
  onClose,
  onSuccess
}: {
  operation: Operation;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast, user } = useDemo();
  const [finalOutput, setFinalOutput] = useState("");
  const [completing, setCompleting] = useState(false);

  const remaining = Math.max(0, new Decimal(operation.target || 0).minus(operation.good || 0).toNumber());

  async function handleComplete() {
    setCompleting(true);
    try {
      // If operator entered final extra output, record it first
      if (finalOutput && parseFloat(finalOutput) > 0) {
        await fetch("/api/production/record-output", {
          method: "POST",
          body: JSON.stringify({
            operationId: operation.id,
            good: parseFloat(finalOutput),
            waste: 0,
            reject: 0,
            actor: user?.name || "Operator"
          })
        });
      }

      // Mark operation complete
      const res = await fetch("/api/production/operation-transition", {
        method: "POST",
        body: JSON.stringify({
          operationId: operation.id,
          action: "complete",
          reason: "Marked complete by operator from Day's Tasks",
          actor: user?.name || "Operator"
        })
      });
      const outcome = await res.json();
      if (outcome.success) {
        toast("Task Completed!", `${operation.code} is marked complete and machine released to IDLE.`, "success");
        onSuccess();
      } else {
        toast("Error", outcome.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(2px)"
    }}>
      <div style={{
        background: "white",
        padding: 24,
        borderRadius: 12,
        width: "90%",
        maxWidth: 520,
        position: "relative",
        border: "3px solid #000",
        boxShadow: "6px 6px 0px #000"
      }}>
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            background: "#10b981",
            color: "#fff",
            padding: "8px",
            borderRadius: "50%",
            display: "flex"
          }}>
            <CheckCircle2 size={24}/>
          </div>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>
              Mark Task Complete
            </h2>
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
              {operation.code} · {operation.stage}
            </span>
          </div>
        </div>

        <div style={{
          padding: "12px",
          background: "#f0fdf4",
          border: "2px solid #bbf7d0",
          borderRadius: "8px",
          margin: "16px 0"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>Target:</span>
            <strong>{formatQty(operation.target, operation.unit, 0)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>Produced So Far:</span>
            <strong>{formatQty(operation.good, operation.unit, 1)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: remaining > 0 ? "#b45309" : "#059669" }}>
            <span>Remaining Target:</span>
            <strong>{remaining.toFixed(1)} {operation.unit}</strong>
          </div>
        </div>

        {remaining > 0 && (
          <Field label={`Add Closing Output (${operation.unit}) before marking complete?`} hint="Leave blank if target was adjusted or finalized as-is">
            <TextInput
              type="number"
              step="0.01"
              placeholder={`e.g. ${remaining.toFixed(1)} to reach 100%`}
              value={finalOutput}
              onChange={(e) => setFinalOutput(e.target.value)}
            />
          </Field>
        )}

        <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 12 }}>
          Completing this task will transition <strong>{operation.code}</strong> to <strong>COMPLETED</strong>, release machine <strong>{operation.machineCode || "N/A"}</strong> to <strong>IDLE</strong>, and log completion in production history.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={completing}
            onClick={handleComplete}
            style={{ background: "#10b981", color: "#fff", borderColor: "#000" }}
          >
            {completing ? "Completing…" : "Yes, Mark Complete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlanPage({ id }: { id: string }) {
  const { data, user, toast } = useDemo();
  const [releasing, setReleasing] = useState(false);
  const order = data.orders.find((candidate) => candidate.id === id || candidate.code === id || candidate.code === `ORD-${id}`);
  if (!order) return <><PageHeader title="Plan not found"/><EmptyState title="No plan record" action={<LinkButton href="/production">Production board</LinkButton>}/></>;

  const canRelease = hasPermission(user, "production.plan") && !order.materialShortage && !order.hasQualityHold && order.status !== "IN_PRODUCTION";

  return <>
    <PageHeader 
      eyebrow="Plan readiness" 
      title={`Plan · ${order.code}`} 
      description={`${order.product} · due ${formatDate(order.due)} · ${formatQty(order.ordered, order.unit, 0)}`} 
      actions={<LinkButton href="/production" variant="secondary"><ArrowLeft size={14}/> Production board</LinkButton>} 
      meta={<StatusBadge status={order.status}/>} 
    />
    <div className="two-pane">
      <div className="stack">
        <Card title="Plan stages">
          <DataTable 
            headers={["Sequence", "Stage", "Machine", "Target", "State"]} 
            rows={data.operations.filter((operation) => operation.orderCode === order.code).map((operation, index) => [
              String(index + 1).padStart(2,"0"), 
              operation.stage, 
              operation.machineCode ?? "—", 
              formatQty(operation.target,operation.unit,0), 
              <StatusBadge status={operation.status}/>
            ])}
          />
          <div className="form-actions">
            {hasPermission(user, "production.plan") ? (
              <Button 
                variant="primary"
                disabled={!canRelease || releasing} 
                onClick={async () => {
                  setReleasing(true);
                  try {
                    const res = await fetch(`/api/orders/${order.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "IN_PRODUCTION", displayStatus: "IN_PRODUCTION", stage: "SPINNING" })
                    });
                    const outcome = await res.json();
                    if (outcome.success) {
                      toast("Plan Released", `Production plan for ${order.code} released and operations generated.`, "success");
                      window.location.href = "/production";
                    } else {
                      toast("Error", outcome.error, "error");
                    }
                  } catch (err: any) {
                    toast("Error", err.message, "error");
                  } finally {
                    setReleasing(false);
                  }
                }}
              >
                <Play size={15}/> {order.status === "IN_PRODUCTION" ? "Plan already released" : "Release production plan"}
              </Button>
            ) : (
              <span className="permission-note">Plan release requires production.plan permission.</span>
            )}
            <span className="field__hint">
              {order.materialShortage ? "⛔ Release guard: raw yarn is short in warehouse. " : order.hasQualityHold ? "⚠️ Release guard: quality hold is open. " : ""}
              Releasing this plan validates BOM yields and generates required production operations.
            </span>
          </div>
        </Card>
        <Card title="Material and stage eligibility">
          <InfoStrip 
            tone={order.materialShortage ? "danger" : order.hasQualityHold ? "warning" : "success"} 
            title={order.materialShortage ? "Material shortage" : order.hasQualityHold ? "Quality hold" : "Material ready in warehouse"}
          >
            {order.materialShortage 
              ? "Do not release this plan. Raw yarn stock is insufficient for the BOM requirements. Order raw yarn before starting." 
              : order.hasQualityHold 
                ? "Resolve the order's quality hold before release." 
                : "Sufficient raw yarn exists in warehouse according to product BOM recipe. Ready to release to floor."}
          </InfoStrip>
          <div className="permission-note">
            Order unit: {order.unit}. Raw yarn unit: KG. Evaluated using bill of materials recipe.
          </div>
        </Card>
      </div>
      <Card title="Plan actors">
        <InfoStrip tone="info">
          Planner assignment and approval are separate permissions.
        </InfoStrip>
        <div className="permission-note">
          Current order: {order.code}<br/>
          Product: {order.product}<br/>
          Due date: {formatDate(order.due)}<br/>
          Priority: {order.priority}
        </div>
      </Card>
    </div>
  </>;
}

function OperationConsole({ id }: { id: string }) {
  const { data, act, toast, user } = useDemo();
  const operation = data.operations.find((candidate) => candidate.id === id || candidate.code === id);
  const [good, setGood] = useState("0.000");
  const [waste, setWaste] = useState("0.000");
  const [reject, setReject] = useState("0.000");
  const [rollQty, setRollQty] = useState("0.000");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [transitionRevision, setTransitionRevision] = useState(1);
  const [outputRevision, setOutputRevision] = useState(1);
  if (!operation) return <><PageHeader title="Operation not found"/><EmptyState title="No operation record" action={<LinkButton href="/production">Production board</LinkButton>}/></>;
  const operationId = operation.id;
  const machine = data.machines.find((candidate) => candidate.code === operation.machineCode);
  const finalStage = operation.stage === "DYEING";
  const nextQty = new Decimal(good || 0).plus(waste || 0).plus(reject || 0);
  const plannedRoom = new Decimal(operation.target).minus(operation.good).minus(operation.waste).minus(operation.reject);
  const rollMatches = !finalStage || new Decimal(rollQty || 0).eq(good || 0);
  const state = operation.status;
  const canOperate = hasPermission(user, "machines.operate");
  const canRecordOutput = hasPermission(user, "production.record_output");
  const [bom, setBom] = useState<any[]>([]);
  const [loadingBom, setLoadingBom] = useState(true);

  useEffect(() => {
    if (!operation) return;
    const relatedOrder = data.orders.find(o => o.code === operation.orderCode);
    if (!relatedOrder) { setLoadingBom(false); return; }
    
    fetch("/api/products")
      .then(r => r.json())
      .then(resData => {
        if (!resData.success) { setLoadingBom(false); return; }
        const matchedProduct = resData.data.find((p: any) => p.name === relatedOrder.product);
        if (!matchedProduct) { setLoadingBom(false); return; }
        
        fetch(`/api/products/${matchedProduct.id}/bom`)
          .then(r => r.json())
          .then(bomData => {
             if (bomData.success) setBom(bomData.data);
             setLoadingBom(false);
          });
      })
      .catch(() => setLoadingBom(false));
  }, [operation, data.orders]);

  async function transition(action: string) {
    if (!canOperate) { toast("Operation action is read-only", "This transition requires machines.operate.", "error"); return; }
    if (["pause", "cancel"].includes(action) && reason.trim().length < 5) { toast("Reason required", "Pause or cancel requires at least five characters.", "error"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/production/operation-transition", {
        method: "POST",
        body: JSON.stringify({ operationId, action, reason, actor: user?.name })
      });
      const outcome = await res.json();
      if (outcome.success) { 
        setTransitionRevision((current) => current + 1); 
        setReason(""); 
        toast("State Updated", `Operation transitioned to ${outcome.status}.`, "success");
        window.location.reload();
      } else {
        toast("Error", outcome.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function record(event: FormEvent) {
    event.preventDefault();
    const parsed = outputEntrySchema.safeParse({ good, waste, reject, remaining: Decimal.max(0, plannedRoom).toFixed(3), finalStage, rollQty });
    if (!canRecordOutput) { toast("Output is read-only", "Recording output requires production.record_output.", "error"); return; }
    if (!parsed.success) { toast("Output needs correction", parsed.error.issues[0]?.message ?? "Check the quantities.", "error"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/production/record-output", {
        method: "POST",
        body: JSON.stringify({ operationId, good, waste, reject, rollQty, actor: user?.name })
      });
      const outcome = await res.json();
      if (outcome.success) { 
        setOutputRevision((current) => current + 1); 
        setGood("0.000"); setWaste("0.000"); setReject("0.000"); setRollQty("0.000"); 
        toast("Output Recorded", "Output events have been saved.", "success");
        window.location.reload();
      } else {
        toast("Error", outcome.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return <>
    <PageHeader eyebrow="Floor operation console" title={operation.code} description={`${operation.orderCode} · ${operation.stage.toLowerCase()} · ${operation.machineCode ?? "Machine not assigned"}`} actions={<LinkButton href="/production" variant="secondary"><ArrowLeft size={14}/> Production board</LinkButton>} meta={<><StatusBadge status={state}/><Tag>{operation.shift ?? "NO SHIFT"}</Tag><Tag>FLOOR VIEW · NO COSTS</Tag></>} />
    <div className="stat-grid"><StatCard label="Good output" value={formatQty(operation.good, operation.unit, 0)} detail="accepted at this operation" tone="neem"/><StatCard label="Waste" value={formatQty(operation.waste, operation.unit, 1)} detail="recorded separately" tone="turmeric"/><StatCard label="Reject" value={formatQty(operation.reject, operation.unit, 1)} detail="recorded separately" tone="madder"/><StatCard label="Remaining target" value={formatQty(Decimal.max(0, plannedRoom).toFixed(3), operation.unit, 0)} detail={`Target ${formatQty(operation.target, operation.unit, 0)}`} tone="indigo"/></div>
    <div className="two-pane"><div className="stack">
      <Card title="1 · Confirm workstation"><div className="page-grid"><div className="col-6"><Kicker>Machine</Kicker><strong style={{ display: "block", font: "900 24px var(--font-mono)", marginTop: 6 }}>{machine?.code ?? "Unassigned"}</strong><span className="cell-secondary">{machine?.name ?? "Assign a stage-eligible machine before starting"}</span></div><div className="col-6"><Kicker>Machine state</Kicker><div style={{ marginTop: 8 }}><StatusBadge status={machine?.status ?? "OFFLINE"}/></div><span className="cell-secondary">{machine?.location ?? "No location"}</span></div><div className="col-6"><Kicker>Shift</Kicker><strong className="cell-primary">{operation.shift ?? "No assigned shift"}</strong></div><div className="col-6"><Kicker>Operator(s)</Kicker><strong className="cell-primary">{(Array.isArray(operation.operators) ? operation.operators : []).join(" · ") || "No assigned operator"}</strong></div></div>{machine?.status === "BREAKDOWN" && <InfoStrip tone="danger">Machine is down. Do not start this operation until a separate maintenance close-out clears the machine.</InfoStrip>}</Card>
      <Card title="2 · Record output" className="card--floor"><form onSubmit={record} className="stack"><div className="form-grid form-grid--3"><Field label={`Good · ${operation.unit}`}><TextInput className="floor-input" inputMode="decimal" pattern="\d+(\.\d{1,3})?" value={good} onChange={(event) => setGood(event.target.value)} disabled={state !== "IN_PROGRESS" || !canRecordOutput} required/></Field><Field label={`Waste · ${operation.unit}`}><TextInput className="floor-input" inputMode="decimal" value={waste} onChange={(event) => setWaste(event.target.value)} disabled={state !== "IN_PROGRESS" || !canRecordOutput} required/></Field><Field label={`Reject · ${operation.unit}`}><TextInput className="floor-input" inputMode="decimal" value={reject} onChange={(event) => setReject(event.target.value)} disabled={state !== "IN_PROGRESS" || !canRecordOutput} required/></Field></div><div className="info-strip"><Activity size={17}/><div><strong>Exact shift check</strong><div>Combined entry {formatQty(nextQty.toFixed(3), operation.unit, 1)} · remaining target {formatQty(Decimal.max(0, plannedRoom).toFixed(3), operation.unit, 1)}</div></div></div>{finalStage && <Field label="Final-stage roll total · M" hint="Must exactly equal this entry's good-output quantity before final-stage completion."><TextInput className="floor-input" inputMode="decimal" value={rollQty} onChange={(event) => setRollQty(event.target.value)} disabled={state !== "IN_PROGRESS" || !canRecordOutput} required/><span className="field__hint">{rollMatches ? "Roll quantity reconciles." : "Roll total must equal good output exactly."}</span></Field>}<div className="form-actions"><span className="field__hint">Good, waste, reject and roll lineage create append-only events.</span><Button type="submit" size="lg" disabled={busy || state !== "IN_PROGRESS" || !rollMatches}><Check size={17}/>{busy ? "Recording…" : "Record output"}</Button></div></form></Card>
      <Card title="3 · State actions"><div className="stack-sm">{!canOperate && <InfoStrip tone="warning">State changes require machines.operate. This profile can inspect but cannot start, pause, complete, or cancel this operation.</InfoStrip>}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{state === "PLANNED" && <Button size="lg" disabled={!canOperate || busy || !machine || machine.status !== "IDLE"} onClick={() => transition("start")}><Play size={17}/> Start</Button>}{state === "IN_PROGRESS" && <><Button size="lg" variant="secondary" disabled={!canOperate || busy} onClick={() => transition("pause")}><Pause size={17}/> Pause</Button><Button size="lg" variant="primary" disabled={!canOperate || busy || (finalStage && !rollMatches)} onClick={() => transition("complete")}><Check size={17}/> Complete</Button></>}{state === "PAUSED" && <Button size="lg" disabled={!canOperate || busy} onClick={() => transition("resume")}><Play size={17}/> Resume</Button>}{["PLANNED", "IN_PROGRESS", "PAUSED"].includes(state) && <Button size="lg" variant="danger" disabled={!canOperate || busy} onClick={() => transition("cancel")}>Cancel operation</Button>}</div>{canOperate && ["IN_PROGRESS", "PAUSED", "PLANNED"].includes(state) && <Field label="Reason for pause / cancellation / downtime" hint="Required for pause and cancellation; preserve append-only reason. Use at least five characters."><TextArea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What happened? Include the stop time and issue…"/></Field>}<span className="field__hint">Completed operations have no edit or delete controls. A correction is a new, linked event.</span></div></Card>
    </div><aside className="stack sticky-summary"><Card title="Operation thread"><div className="stack-sm"><div className="permission-note"><strong>{operation.planCode}</strong><span className="cell-secondary">Plan linked to order {operation.orderCode}</span></div><div className="permission-note"><strong>Stage · {operation.stage}</strong><span className="cell-secondary">Input unit and output unit: {operation.unit}. Cross-unit arithmetic is prohibited.</span></div><div className="permission-note"><strong>Target · {formatQty(operation.target, operation.unit, 1)}</strong><span className="cell-secondary">Recorded outputs: good + waste + reject.</span></div><InfoStrip tone="warning">Final-stage rolls need one traceable identity each; their exact total must reconcile to good output. No UUID or roll code is minted in this demo.</InfoStrip><LinkButton href={`/machines/${machine?.id ?? ""}`} variant="secondary"><Factory size={15}/> Machine detail</LinkButton></div></Card>
    
    <Card title="Required Yarn Recipe (BOM)">
      {loadingBom ? <div style={{ padding: 12 }}>Loading recipe...</div> : bom.length === 0 ? <EmptyState title="No recipe" detail="No dynamic BOM found for this product." /> : 
        <div className="stack-sm">
          {bom.map(b => (
            <div className="permission-note" key={b.yarn_item_id}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong className="code">{b.yarn_code}</strong>
              </div>
              <span className="cell-secondary">{b.yarn_name}</span>
              <div className="num" style={{ marginTop: 4 }}>
                {formatQty(b.quantity_required, b.unit, 3)} per unit
              </div>
            </div>
          ))}
          <InfoStrip tone="info">Check recipe details against machine inputs before starting the operation.</InfoStrip>
        </div>
      }
    </Card>

    <Card title="Append-only output history"><DataTable headers={["Event", "Kind", "Quantity", "Time", "Actor"]} rows={data.outputEvents.filter((event) => event.operationId === operationId).map((event) => [event.code, event.kind, formatQty(event.quantity,event.unit,1), formatDateTime(event.recordedAt), event.actor])} empty={<EmptyState title="No output events" detail="Session-only output records appear here after a valid command."/>}/></Card><div className="permission-note">User {user?.name} · role permissions checked by permission key, not role name.</div></aside></div>
  </>;
}

function ShiftSummaryPage() {
  const { data } = useDemo();
  const stages = stageOrder.flatMap((stage) => [...new Set(data.operations.filter((operation) => operation.stage === stage).map((operation) => operation.unit))].map((unit) => {
    const operations = data.operations.filter((operation) => operation.stage === stage && operation.unit === unit);
    return { stage, unit, operations, good: operations.reduce((sum, operation) => sum.plus(operation.good), new Decimal(0)), waste: operations.reduce((sum, operation) => sum.plus(operation.waste), new Decimal(0)), reject: operations.reduce((sum, operation) => sum.plus(operation.reject), new Decimal(0)) };
  }));
  return <><PageHeader eyebrow="Operations close-out · shift B" title="Shift summary" description="Good, waste, reject, downtime, and handover are separate numbers. Totals are grouped by stage and unit." actions={<LinkButton href="/production" variant="secondary"><ArrowLeft size={14}/> Production board</LinkButton>} meta={<Tag>10 OCT 2026 · 14:00–22:00 · DEMO</Tag>} />
    <div className="page-grid">{stages.map((stage) => <Card key={`${stage.stage}-${stage.unit}`} className="col-4" title={`${stage.stage} · ${stage.unit}`}><div className="num" style={{ fontSize: 22, fontWeight: 900 }}>{formatQty(stage.good.toFixed(3),stage.unit,0)} good</div><div className="stack-sm" style={{ marginTop: 10 }}><div className="permission-note">Waste · {formatQty(stage.waste.toFixed(3),stage.unit,1)}</div><div className="permission-note">Reject · {formatQty(stage.reject.toFixed(3),stage.unit,1)}</div><div className="permission-note">Operations · {stage.operations.length}</div></div></Card>)}</div>
    <Card title="Handover and open downtime" className="col-12"><DataTable headers={["Machine", "State", "Downtime", "Linked order", "Handover note"]} rows={data.machines.filter((machine) => machine.downtimeMinutes > 0 || machine.status === "BREAKDOWN").map((machine) => [machine.code, <StatusBadge status={machine.status}/>, `${machine.downtimeMinutes} min`, machine.orderCode ?? "—", machine.status === "BREAKDOWN" ? "Repair and quality impact to be reviewed by incoming lead" : "Close-out complete / no note in demo"])} /></Card>
    <InfoStrip tone="warning">Shift summary is a seeded preview; an authoritative close must carry signed record timestamps and avoid changing earlier postings.</InfoStrip></>;
}

function OrderModal({ orderCode, onClose }: { orderCode: string; onClose: () => void }) {
  const { data } = useDemo();
  const order = data.orders.find(o => o.code === orderCode);
  const [tab, setTab] = useState("details");

  if (!order) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "white", padding: 24, borderRadius: 12, width: "90%", maxWidth: 800, maxHeight: "90%", overflow: "auto", position: "relative", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, border: "none", background: "none", cursor: "pointer", color: "#64748b" }} aria-label="Close modal"><X size={24} /></button>
        <h2 style={{ marginBottom: 16, fontSize: "1.5rem" }}>Order Details: {order.code}</h2>
        
        <div className="filter-row production-view-tabs" style={{ marginBottom: 20 }}>
          <button className={`filter-chip ${tab === "details" ? "filter-chip--active" : ""}`} onClick={() => setTab("details")}>Details</button>
          <button className={`filter-chip ${tab === "production" ? "filter-chip--active" : ""}`} onClick={() => setTab("production")}>Production</button>
          <button className={`filter-chip ${tab === "financials" ? "filter-chip--active" : ""}`} onClick={() => setTab("financials")}>Financials</button>
        </div>

        {tab === "details" && (
          <div className="page-grid">
            <Card className="col-6" title="Basic Info">
              <div className="stack-sm">
                <div><strong>Buyer:</strong> {order.buyer}</div>
                <div><strong>Product:</strong> {order.product}</div>
                <div><strong>Colour:</strong> {order.colour}</div>
                <div><strong>Priority:</strong> <StatusBadge status={order.priority} /></div>
              </div>
            </Card>
            <Card className="col-6" title="Status">
              <div className="stack-sm">
                <div><strong>Stage:</strong> {order.stage || "N/A"}</div>
                <div><strong>Due Date:</strong> {formatDate(order.due)}</div>
                <div><strong>Status:</strong> <StatusBadge status={order.status} /></div>
                <div><strong>Material Shortage:</strong> {order.materialShortage ? "Yes" : "No"}</div>
              </div>
            </Card>
          </div>
        )}

        {tab === "production" && (
          <div className="page-grid">
            <Card className="col-12" title="Production Quantities">
              <div className="stat-grid">
                <StatCard label="Ordered" value={formatQty(order.ordered, order.unit, 0)} />
                <StatCard label="Produced" value={formatQty(order.produced, order.unit, 0)} />
                <StatCard label="Accepted" value={formatQty(order.accepted, order.unit, 0)} tone="neem" />
                <StatCard label="Dispatched" value={formatQty(order.dispatched, order.unit, 0)} tone="indigo" />
              </div>
              <div style={{ marginTop: 24 }}>
                 <Meter value={order.produced} total={order.ordered} label="Production Progress" />
              </div>
            </Card>
          </div>
        )}

        {tab === "financials" && (
          <div className="page-grid">
             <Card className="col-12" title="Financial Summary">
                <div className="stat-grid">
                   <StatCard label="Revenue" value={formatMoney(order.revenue, order.currency)} tone="neem" />
                   <StatCard label="Recorded Cost" value={formatMoney(order.recordedCost, order.currency)} tone="madder" />
                   <StatCard label="Estimated Cost" value={formatMoney(order.estimatedCost, order.currency)} tone="turmeric" />
                </div>
             </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export function AssignTaskModal({ operatorName, shift, unassignedOps, onClose }: { operatorName: string; shift: string; unassignedOps: Operation[]; onClose: () => void; }) {
  const { data, user, toast } = useDemo();
  const [selectedOpId, setSelectedOpId] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [taskTarget, setTaskTarget] = useState("");
  
  const selectedOp = unassignedOps.find(o => o.id === selectedOpId);
  const eligibleMachines = selectedOp ? data.machines.filter(m => m.stage === selectedOp.stage && m.status === "IDLE") : [];

  const readiness = selectedOp ? computeOpReadiness(selectedOp, data) : null;
  const targetNum = taskTarget ? parseFloat(taskTarget) : (selectedOp ? parseFloat(selectedOp.target as any || 0) : 0);
  const estimatedHours = targetNum > 0 ? new Decimal(targetNum).div(50).toNumber() : 0;
  
  const handleAssign = async () => {
    if (readiness?.isBlocked) {
      toast("Cannot assign", readiness.reason, "error");
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch("/api/production/assign-machine", {
        method: "POST",
        body: JSON.stringify({
           operationId: selectedOpId,
           machineId: selectedMachine,
           shift: shift.split(" | ")[1] || shift,
           date: shift.split(" | ")[0] || new Date().toISOString().split('T')[0],
           operator: operatorName,
           actor: user?.name,
           autoSplit: estimatedHours > 8,
           target: taskTarget ? parseFloat(taskTarget) : undefined
        })
      });
      const outcome = await res.json();
      if (outcome.success) {
        toast("Assignment saved", "Task assigned to operator.", "success");
        window.location.reload();
      } else {
        toast("Error", outcome.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "var(--paper)", padding: 24, borderRadius: 0, width: "90%", maxWidth: 500, maxHeight: "90%", overflow: "auto", position: "relative", border: "2px solid var(--ink)", boxShadow: "4px 4px 0 var(--ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Assign Task to {operatorName}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}><X size={20}/></button>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Order Task">
            <SelectInput 
              value={selectedOpId} 
              onChange={e => { 
                const newId = e.target.value;
                setSelectedOpId(newId); 
                setSelectedMachine(""); 
                const found = unassignedOps.find(o => o.id === newId);
                if (found) {
                  const r = computeOpReadiness(found, data);
                  setTaskTarget(Math.min(parseFloat(found.target as any || 0), r.available).toString());
                } else {
                  setTaskTarget("");
                }
              }} 
              disabled={assigning}
            >
               <option value="">Select task...</option>
               {unassignedOps.filter(op => { 
                 const lower = operatorName.toLowerCase(); 
                 const hasSpin = lower.includes("spinning"); 
                 const hasWeave = lower.includes("weaving"); 
                 const hasDye = lower.includes("dyeing"); 
                 if (!hasSpin && !hasWeave && !hasDye) return true; 
                 return (hasSpin && op.stage === "SPINNING") || (hasWeave && op.stage === "WEAVING") || (hasDye && op.stage === "DYEING"); 
               }).map(op => {
                 const r = computeOpReadiness(op, data);
                 return (
                   <option key={op.id} value={op.id} disabled={r.isBlocked}>
                     {op.orderCode} · {op.stage} {r.isBlocked ? `⛔ [Blocked: No upstream stock]` : `(Avail: ${r.available.toFixed(1)} ${r.unit})`}
                   </option>
                 );
               })}
            </SelectInput>
          </Field>

          {/* Upstream material status banner */}
          {selectedOp && readiness && (
            <div>
              {readiness.isBlocked ? (
                <div style={{ padding: "8px 12px", background: "var(--madder-soft)", border: "1px solid var(--madder)", color: "var(--madder)", borderRadius: 4, fontWeight: 600, fontSize: 13 }}>
                  ⚠️ {readiness.reason}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ padding: "6px 10px", background: "var(--sand)", borderRadius: 4, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Eligible upstream material in storage:</span>
                    <strong>{readiness.available.toFixed(1)} {readiness.unit}</strong>
                  </div>
                  {readiness.available < parseFloat(selectedOp.target as any || 0) && (
                    <span style={{ fontSize: 11, color: "var(--indigo)", fontWeight: 600 }}>
                      ℹ️ Partial material: {readiness.available.toFixed(1)} {readiness.unit} available. Remainder stays planned.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          
          {selectedOp && (
            <>
              {!readiness?.isBlocked && (
                <Field label={`Target Quantity (${selectedOp.unit})`}>
                  <TextInput 
                    type="number" 
                    value={taskTarget} 
                    onChange={e => setTaskTarget(e.target.value)} 
                    disabled={assigning} 
                  />
                </Field>
              )}

              <div style={{ padding: 12, background: "var(--indigo-soft)", borderRadius: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontWeight: 700 }}>⏱️ Estimated time: {estimatedHours.toFixed(1)} hours</span>
                {estimatedHours > 8 && <span style={{ fontSize: 12 }}>Note: Exceeds 8 hrs. Will auto-split remaining qty to next shift.</span>}
              </div>
              
              <Field label="Machine">
                <SelectInput value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)} disabled={assigning || !eligibleMachines.length || readiness?.isBlocked}>
                  <option value="">{eligibleMachines.length ? "Select machine..." : `No eligible IDLE ${selectedOp.stage} machines`}</option>
                  {eligibleMachines.map(m => <option key={m.id} value={m.code}>{m.code} · {m.name}</option>)}
                </SelectInput>
              </Field>
            </>
          )}
          
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <Button variant="secondary" onClick={onClose} disabled={assigning}>Cancel</Button>
            <Button 
              variant="primary" 
              disabled={assigning || !selectedOpId || !selectedMachine || readiness?.isBlocked} 
              onClick={handleAssign}
            >
              {assigning ? "Assigning..." : readiness?.isBlocked ? "Blocked by Upstream Material" : "Assign Task"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
