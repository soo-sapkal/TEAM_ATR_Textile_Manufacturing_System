import Decimal from "decimal.js";
import type { DemoData, DemoUser, FabricRoll, Machine, Operation, Permission } from "@/lib/domain/types";

type CommandResult = { data: DemoData; ok: boolean; message: string; reference?: string };
type ActionPayload = Record<string, unknown>;

const STAGES = ["SPINNING", "WEAVING", "DYEING"] as const;
const ACTION_PERMISSION: Record<string, Permission> = {
  "receive-yarn": "inventory.receive",
  "machine-status": "machines.operate",
  "assign-machine": "production.assign",
  "record-downtime": "machines.operate",
  "record-output": "production.record_output",
  "inspect-roll": "quality.inspect",
  "start-rework": "quality.rework",
  "complete-rework": "quality.rework",
  "create-shipment": "dispatch.create",
  "confirm-dispatch": "dispatch.confirm",
};

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function decimal(value: unknown): Decimal | null {
  try {
    const parsed = new Decimal(text(value, "0"));
    return parsed.isFinite() ? parsed : null;
  } catch {
    return null;
  }
}

function reasonIsValid(value: unknown): boolean {
  return text(value).trim().length >= 5;
}

function nowIso(): string {
  return new Date().toISOString();
}

function requirePermission(user: DemoUser | null, permission: Permission | undefined): string | null {
  if (!permission || user?.permissions.includes(permission)) return null;
  return `Blocked: this action requires ${permission}. The demo command was not applied.`;
}

function result(data: DemoData, ok: boolean, message: string, reference?: string): CommandResult {
  return { data, ok, message, reference };
}

function reject(current: DemoData, message: string, reference?: string): CommandResult {
  return result(current, false, message, reference);
}

function markCommand(next: DemoData, key: string): void {
  if (key && !next.processedCommandKeys.includes(key)) next.processedCommandKeys.push(key);
}

function permissionFor(kind: string, payload: ActionPayload): Permission | undefined {
  if (kind === "operation-transition") {
    const action = text(payload.action);
    return action === "start" || action === "resume" || action === "pause" || action === "complete" || action === "cancel"
      ? "machines.operate"
      : "production.record_output";
  }
  return ACTION_PERMISSION[kind];
}

export function applyDemoCommand(
  current: DemoData,
  user: DemoUser | null,
  kind: string,
  payload: ActionPayload = {},
): CommandResult {
  const permissionError = requirePermission(user, permissionFor(kind, payload));
  if (permissionError) return reject(current, permissionError);

  const commandKey = text(payload.commandKey);
  if (commandKey && current.processedCommandKeys.includes(commandKey)) {
    const replayReference = current.dispatchEvents.find((event) => event.commandKey === commandKey)?.shipmentId;
    return result(current, true, "This demo command was already recorded; no duplicate event was added.", replayReference);
  }

  const next = structuredClone(current);
  const actor = user?.name ?? "Demo user";
  const recordedAt = nowIso();

  switch (kind) {
    case "receive-yarn": {
      const lines = Array.isArray(payload.lines) ? payload.lines as ActionPayload[] : [];
      if (!lines.length) return reject(current, "Receipt not recorded: add at least one yarn line.");
      const supplier = text(payload.supplier).trim();
      const supplierLot = text(payload.supplierLot).trim();
      const location = text(payload.location).trim();
      const receivedAtInput = text(payload.receivedAt).trim();
      const notes = text(payload.notes).trim();
      const receiptTime = new Date(receivedAtInput);
      if (!supplier || !supplierLot || !location) return reject(current, "Receipt not recorded: supplier, supplier lot, and put-away location are required.");
      if (!receivedAtInput || Number.isNaN(receiptTime.getTime())) return reject(current, "Receipt not recorded: enter a valid physical receipt date and time.");
      if (notes.length > 500) return reject(current, "Receipt not recorded: notes are limited to 500 characters.");
      const parsedLines = lines.map((line) => {
        const item = next.yarnItems.find((candidate) => candidate.code === text(line.itemCode, text(line.code)));
        return {
          line,
          item,
          received: decimal(line.received),
          accepted: decimal(line.accepted),
          damaged: decimal(line.damaged),
          held: decimal(line.held),
          unitCostInput: text(line.unitCost).trim(),
          unitCostValue: text(line.unitCost).trim() ? decimal(line.unitCost) : null,
        };
      });
      if (parsedLines.some(({ item, received, accepted, damaged, held, unitCostInput, unitCostValue }) => !item || !received || !accepted || !damaged || !held || (unitCostInput && (!/^\d{1,12}(\.\d{1,4})?$/.test(unitCostInput) || !unitCostValue || unitCostValue.isNegative() || unitCostValue.decimalPlaces() > 4)))) {
        return reject(current, "Receipt not recorded: a yarn item is missing or a quantity is not a finite decimal.");
      }
      for (const entry of parsedLines) {
        const { item, received, accepted, damaged, held, unitCostValue } = entry;
        if (!item || !received || !accepted || !damaged || !held) continue;
        if (unitCostValue && unitCostValue.decimalPlaces() > 4) return reject(current, "Receipt not recorded: unit costs support at most four decimal places.");
        if (received.lte(0) || accepted.isNegative() || damaged.isNegative() || held.isNegative()) {
          return reject(current, "Receipt not recorded: received quantity must be positive and dispositions cannot be negative.");
        }
        if ([received, accepted, damaged, held].some((quantity) => quantity.decimalPlaces() > 3)) {
          return reject(current, "Receipt not recorded: stock quantities support at most three decimal places.");
        }
        if (!accepted.plus(damaged).plus(held).eq(received)) {
          return reject(current, "Receipt not recorded: accepted + damaged + held must equal received exactly.");
        }
      }
      for (const { item, received, accepted, damaged, held, unitCostValue } of parsedLines) {
        if (!item || !received || !accepted || !damaged || !held) continue;
        const sequence = next.yarnBatches.length + 1;
        const batchId = `batch-demo-${sequence}`;
        const batchCode = `YB-DEMO-${String(sequence).padStart(4, "0")}`;
        const putAway = accepted.plus(held);
        item.onHand = new Decimal(item.onHand).plus(putAway).toFixed(3);
        item.available = new Decimal(item.available).plus(accepted).toFixed(3);
        item.held = new Decimal(item.held).plus(held).toFixed(3);
        next.yarnBatches.push({
          id: batchId,
          code: batchCode,
          itemCode: item.code,
          supplier,
          supplierLot,
          receivedAt: receiptTime.toISOString(),
          onHand: putAway.toFixed(3),
          reserved: "0.000",
          available: accepted.toFixed(3),
          held: held.toFixed(3),
          unit: item.unit,
          unitCost: unitCostValue?.toFixed(4) ?? null,
          location,
          status: held.gt(0) ? "QUARANTINED" : putAway.isZero() ? "CLOSED" : "AVAILABLE",
          orderCode: text(payload.orderCode).trim() || undefined,
          notes: notes || undefined,
        });
        const movementSequence = next.yarnMovements.length + 1;
        next.yarnMovements.push({
          id: `movement-demo-${movementSequence}`,
          code: `MOV-DEMO-${String(movementSequence).padStart(4, "0")}`,
          kind: "RECEIPT",
          batchId,
          batchCode,
          itemCode: item.code,
          quantity: putAway.toFixed(3),
          unit: item.unit,
          reference: `${supplier} · lot ${supplierLot} · damaged disposition ${damaged.toFixed(3)} ${item.unit}`,
          actor,
          recordedAt,
        });
      }
      markCommand(next, commandKey);
      return result(next, true, `Receipt and batch history staged for ${supplierLot}. Demo state only; not persisted.`, next.yarnBatches.at(-1)?.id);
    }

    case "machine-status": {
      const machineId = text(payload.machineId);
      const machine = next.machines.find((candidate) => candidate.id === machineId || candidate.code === machineId);
      if (!machine) return reject(current, "Machine state not changed: machine not found.");
      const target = text(payload.status) as Machine["status"];
      const allowed: Record<Machine["status"], Machine["status"][]> = {
        IDLE: ["SETUP", "MAINTENANCE", "OFFLINE"],
        RUNNING: ["IDLE", "BREAKDOWN", "MAINTENANCE"],
        SETUP: ["IDLE", "BREAKDOWN", "MAINTENANCE"],
        MAINTENANCE: ["IDLE"],
        BREAKDOWN: ["IDLE"],
        OFFLINE: [],
      };
      if (!allowed[machine.status].includes(target)) {
        return reject(current, `Machine state not changed: ${machine.status} → ${target} is not an allowed demo transition.`);
      }
      if (["BREAKDOWN", "MAINTENANCE"].includes(target) && !reasonIsValid(payload.reason)) {
        return reject(current, "Machine state not changed: breakdown or maintenance requires a five-character reason.");
      }
      if (["MAINTENANCE", "BREAKDOWN"].includes(machine.status) && target === "IDLE" && !reasonIsValid(payload.reason)) {
        return reject(current, "Machine recovery not recorded: a repair/maintenance close-out reason is required.");
      }
      const activeOperation = machine.operationId ? next.operations.find((candidate) => candidate.id === machine.operationId) : undefined;
      if (machine.status === "RUNNING" && target === "IDLE" && activeOperation?.status === "IN_PROGRESS") {
        return reject(current, "Machine not idled: pause or complete its in-progress operation from the operation console, with a reason where required.");
      }
      if (["BREAKDOWN", "MAINTENANCE"].includes(target) && next.machineEvents.some((event) => event.machineId === machine.id && event.status === "OPEN")) {
        return reject(current, `Machine event not recorded: ${machine.code} already has an open downtime/maintenance event.`);
      }
      const previousStatus = machine.status;
      if (["BREAKDOWN", "MAINTENANCE"].includes(target)) {
        if (activeOperation?.status === "IN_PROGRESS") activeOperation.status = "PAUSED";
        const sequence = next.machineEvents.length + 1;
        next.machineEvents.push({
          id: `machine-event-demo-${sequence}`,
          code: `DWT-DEMO-${String(sequence).padStart(4, "0")}`,
          machineId: machine.id,
          machineCode: machine.code,
          kind: target as "BREAKDOWN" | "MAINTENANCE",
          status: "OPEN",
          reason: text(payload.reason).trim(),
          durationMinutes: 0,
          actor,
          startedAt: recordedAt,
        });
      }
      if (["BREAKDOWN", "MAINTENANCE"].includes(previousStatus) && target === "IDLE") {
        const openEvent = next.machineEvents.find((event) => event.machineId === machine.id && event.status === "OPEN");
        if (openEvent) {
          const elapsed = Math.max(0, Math.round((new Date(recordedAt).getTime() - new Date(openEvent.startedAt).getTime()) / 60000));
          const alreadyCounted = Math.max(0, openEvent.durationMinutes);
          openEvent.status = "CLOSED";
          openEvent.endedAt = recordedAt;
          openEvent.durationMinutes = elapsed;
          machine.downtimeMinutes += Math.max(0, elapsed - alreadyCounted);
        }
        const sequence = next.machineEvents.length + 1;
        next.machineEvents.push({
          id: `machine-event-demo-${sequence}`,
          code: `DWT-DEMO-${String(sequence).padStart(4, "0")}`,
          machineId: machine.id,
          machineCode: machine.code,
          kind: "RECOVERY",
          status: "CLOSED",
          reason: text(payload.reason).trim(),
          durationMinutes: 0,
          actor,
          startedAt: recordedAt,
          endedAt: recordedAt,
        });
      }
      machine.status = target;
      markCommand(next, commandKey);
      return result(next, true, `${machine.code} moved to ${target} in demo state; no machine controller was contacted.`, machine.id);
    }

    case "record-downtime": {
      const machine = next.machines.find((candidate) => candidate.id === text(payload.machineId) || candidate.code === text(payload.machineId));
      if (!machine) return reject(current, "Downtime not recorded: machine not found.");
      if (next.machineEvents.some((event) => event.machineId === machine.id && event.status === "OPEN")) {
        return reject(current, `Downtime not recorded: ${machine.code} already has an open breakdown or maintenance event.`);
      }
      const reason = text(payload.reason).trim();
      const category = text(payload.category);
      const durationValue = Number(payload.durationMinutes);
      if (!reasonIsValid(reason)) return reject(current, "Downtime not recorded: enter a reason of at least five characters.");
      if (!["MECHANICAL", "ELECTRICAL", "MATERIAL", "CHANGEOVER", "OTHER"].includes(category)) return reject(current, "Downtime not recorded: select a supported category.");
      if (!Number.isInteger(durationValue) || durationValue <= 0 || durationValue > 1440) return reject(current, "Downtime not recorded: duration must be a whole number of minutes from 1 to 1,440.");
      const startedAt = new Date(new Date(recordedAt).getTime() - durationValue * 60000).toISOString();
      const sequence = next.machineEvents.length + 1;
      next.machineEvents.push({
        id: `machine-event-demo-${sequence}`,
        code: `DWT-DEMO-${String(sequence).padStart(4, "0")}`,
        machineId: machine.id,
        machineCode: machine.code,
        kind: "DOWNTIME",
        status: "CLOSED",
        category,
        reason,
        durationMinutes: durationValue,
        actor,
        startedAt,
        endedAt: recordedAt,
      });
      machine.downtimeMinutes += durationValue;
      markCommand(next, commandKey);
      return result(next, true, `${durationValue} minutes of ${category.toLowerCase()} downtime were appended to demo history.`, machine.id);
    }

    case "assign-machine": {
      const operation = next.operations.find((candidate) => candidate.id === text(payload.operationId) || candidate.code === text(payload.operationId));
      if (!operation) return reject(current, "Machine not assigned: operation not found.");
      if (!["PLANNED", "PAUSED"].includes(operation.status)) return reject(current, `Machine not assigned: an operation in ${operation.status} cannot be reassigned.`);
      const machine = next.machines.find((candidate) => candidate.id === text(payload.machineId) || candidate.code === text(payload.machineId));
      if (!machine) return reject(current, "Machine not assigned: selected machine was not found.");
      if (machine.stage !== operation.stage) return reject(current, "Machine not assigned: selected machine must match the operation stage.");
      if (machine.status !== "IDLE") return reject(current, `Machine not assigned: ${machine.code} is ${machine.status}; only IDLE machines are available.`);
      if (machine.operationId && machine.operationId !== operation.id) return reject(current, `Machine not assigned: ${machine.code} is reserved by another operation.`);
      const conflictingOperation = next.operations.find((other) => other.id !== operation.id && other.machineCode === machine.code && ["PLANNED", "IN_PROGRESS", "PAUSED"].includes(other.status));
      if (conflictingOperation) return reject(current, `Machine not assigned: ${machine.code} is already reserved by ${conflictingOperation.code}.`);
      const previousMachine = next.machines.find((candidate) => candidate.code === operation.machineCode);
      if (previousMachine?.operationId === operation.id && previousMachine.id !== machine.id) {
        previousMachine.operationId = null;
        previousMachine.orderCode = null;
      }
      operation.machineCode = machine.code;
      machine.operationId = operation.id;
      machine.orderCode = operation.orderCode;
      
      if (text(payload.shift)) operation.shift = text(payload.shift);
      if (text(payload.operator)) operation.operators = [text(payload.operator)];

      markCommand(next, commandKey);
      return result(next, true, `${operation.code} is assigned to ${machine.code} with operator in demo state; no controller was contacted.`, machine.id);
    }

    case "operation-transition": {
      const operation = next.operations.find((candidate) => candidate.id === text(payload.operationId) || candidate.code === text(payload.operationId));
      if (!operation) return reject(current, "Operation state not changed: operation not found.");
      const action = text(payload.action);
      const allowed: Record<Operation["status"], string[]> = {
        PLANNED: ["start", "cancel"],
        IN_PROGRESS: ["pause", "complete", "cancel"],
        PAUSED: ["resume", "cancel"],
        COMPLETED: [],
        CANCELLED: [],
      };
      if (!allowed[operation.status].includes(action)) {
        return reject(current, `Operation state not changed: ${action} is not allowed from ${operation.status}.`);
      }
      if (["pause", "cancel"].includes(action) && !reasonIsValid(payload.reason)) {
        return reject(current, "Operation state not changed: pause and cancellation require a five-character reason.");
      }
      const machine = next.machines.find((candidate) => candidate.code === operation.machineCode);
      if (["start", "resume"].includes(action)) {
        if (!machine) return reject(current, "Operation state not changed: assign a stage-eligible machine before starting.");
        if (machine.stage !== operation.stage) return reject(current, "Operation state not changed: machine stage does not match this operation.");
        if (machine.status !== "IDLE") return reject(current, `Operation state not changed: ${machine.code} is ${machine.status}; only an idle machine can start or resume work.`);
        if (machine.operationId && machine.operationId !== operation.id) return reject(current, `Operation state not changed: ${machine.code} is reserved by another operation.`);
        if (next.operations.some((other) => other.id !== operation.id && other.machineCode === machine.code && other.status === "IN_PROGRESS")) {
          return reject(current, "Operation state not changed: another in-progress operation already occupies this machine.");
        }
      }
      if (action === "complete") {
        const total = new Decimal(operation.good).plus(operation.waste).plus(operation.reject);
        if (total.lte(0)) return reject(current, "Operation not completed: record a positive output event first.");
        if (operation.stage === "DYEING" && !next.outputEvents.some((event) => event.operationId === operation.id && event.kind === "GOOD" && (event.rollCodes?.length ?? 0) > 0)) {
          return reject(current, "Operation not completed: final-stage roll identities must be created and reconciled first.");
        }
      }
      const statusByAction: Record<string, Operation["status"]> = {
        start: "IN_PROGRESS", resume: "IN_PROGRESS", pause: "PAUSED", complete: "COMPLETED", cancel: "CANCELLED",
      };
      operation.status = statusByAction[action];
      if (machine) {
        if (action === "start" || action === "resume") {
          machine.status = "RUNNING";
          machine.operationId = operation.id;
          machine.orderCode = operation.orderCode;
        } else if (action === "pause") {
          machine.status = "IDLE";
          machine.operationId = operation.id;
          machine.orderCode = operation.orderCode;
        } else if ((action === "complete" || action === "cancel") && machine.operationId === operation.id) {
          machine.status = "IDLE";
          machine.operationId = null;
          machine.orderCode = null;
        }
      }
      markCommand(next, commandKey);
      return result(next, true, `${operation.code} moved to ${operation.status} in demo state.`, operation.id);
    }

    case "record-output": {
      const operation = next.operations.find((candidate) => candidate.id === text(payload.operationId) || candidate.code === text(payload.operationId));
      if (!operation) return reject(current, "Output not recorded: operation not found.");
      if (operation.status !== "IN_PROGRESS") return reject(current, `Output not recorded: operation is ${operation.status}, not IN_PROGRESS.`);
      const machine = next.machines.find((candidate) => candidate.code === operation.machineCode);
      if (!machine || machine.status !== "RUNNING" || machine.operationId !== operation.id) {
        return reject(current, "Output not recorded: the assigned machine is not running this operation.");
      }
      const good = decimal(payload.good);
      const waste = decimal(payload.waste);
      const rejected = decimal(payload.reject);
      if (!good || !waste || !rejected || [good, waste, rejected].some((quantity) => quantity.isNegative() || quantity.decimalPlaces() > 3)) {
        return reject(current, "Output not recorded: good, waste, and reject must be non-negative decimals with at most three places.");
      }
      const total = good.plus(waste).plus(rejected);
      if (total.lte(0)) return reject(current, "Output not recorded: total output must be positive.");
      const remaining = Decimal.max(0, new Decimal(operation.target).minus(operation.good).minus(operation.waste).minus(operation.reject));
      if (total.gt(remaining)) return reject(current, `Output not recorded: ${total.toFixed(3)} exceeds the remaining target ${remaining.toFixed(3)} ${operation.unit}.`);

      const isFinalStage = operation.stage === "DYEING";
      const rollQuantity = decimal(payload.rollQty);
      if (isFinalStage && (!rollQuantity || rollQuantity.isNegative() || rollQuantity.decimalPlaces() > 3 || !rollQuantity.eq(good))) {
        return reject(current, "Output not recorded: the sum of final-stage roll quantities must equal good output exactly.");
      }
      const order = next.orders.find((candidate) => candidate.code === operation.orderCode);
      if (!order) return reject(current, "Output not recorded: linked order not found.");
      const stageIndex = STAGES.indexOf(operation.stage);
      const priorStage = stageIndex > 0 ? STAGES[stageIndex - 1] : undefined;
      if (priorStage) {
        const upstream = next.operations.filter((candidate) => candidate.orderCode === operation.orderCode && candidate.stage === priorStage && candidate.unit === operation.unit);
        if (upstream.length) {
          const upstreamGood = upstream.reduce((sum, candidate) => sum.plus(candidate.good), new Decimal(0));
          const projectedGood = new Decimal(operation.good).plus(good);
          if (upstreamGood.lte(0) || projectedGood.gt(upstreamGood)) {
            return reject(current, `Output not recorded: same-unit upstream ${priorStage} good output is ${upstreamGood.toFixed(3)} ${operation.unit}; no cross-unit conversion or excess WIP is assumed.`);
          }
        }
      }

      operation.good = new Decimal(operation.good).plus(good).toFixed(3);
      operation.waste = new Decimal(operation.waste).plus(waste).toFixed(3);
      operation.reject = new Decimal(operation.reject).plus(rejected).toFixed(3);
      machine.todayGood = new Decimal(machine.todayGood).plus(good).toFixed(3);
      const rollCodes: string[] = [];
      if (isFinalStage && good.gt(0) && rollQuantity?.gt(0)) {
        const sequence = next.rolls.length + 111;
        const code = `ROLL-DEMO-${String(sequence).padStart(4, "0")}`;
        const roll: FabricRoll = {
          id: `roll-demo-${sequence}`,
          code,
          orderCode: order.code,
          buyer: order.buyer,
          qty: rollQuantity.toFixed(3),
          unit: operation.unit,
          colour: order.colour,
          dyeLot: "DL-PENDING-QC",
          status: "AWAITING_INSPECTION",
          machineCode: operation.machineCode ?? "UNASSIGNED",
          location: "WIP · awaiting quality inspection",
          createdAt: recordedAt,
          priorFailure: false,
        };
        next.rolls.push(roll);
        rollCodes.push(code);
        order.produced = new Decimal(order.produced).plus(good).toFixed(3);
        order.remaining = Decimal.max(0, new Decimal(order.ordered).minus(order.produced)).toFixed(3);
        order.status = "IN_PRODUCTION";
        order.stage = operation.stage;
      }
      const appendOutput = (eventKind: "GOOD" | "WASTE" | "REJECT", quantity: Decimal, relatedRollCodes: string[] = []) => {
        if (quantity.isZero()) return;
        const sequence = next.outputEvents.length + 1;
        next.outputEvents.push({
          id: `output-demo-${sequence}`,
          code: `OUT-DEMO-${String(sequence).padStart(4, "0")}`,
          operationId: operation.id,
          operationCode: operation.code,
          kind: eventKind,
          quantity: quantity.toFixed(3),
          unit: operation.unit,
          actor,
          recordedAt,
          rollCodes: relatedRollCodes,
        });
      };
      appendOutput("GOOD", good, rollCodes);
      appendOutput("WASTE", waste);
      appendOutput("REJECT", rejected);
      markCommand(next, commandKey);
      return result(next, true, `Output events recorded for ${operation.code}; ${rollCodes.length} demo roll identity created where applicable.`, rollCodes[0] ?? operation.id);
    }

    case "inspect-roll": {
      const roll = next.rolls.find((candidate) => candidate.id === text(payload.rollId) || candidate.code === text(payload.rollId));
      if (!roll) return reject(current, "Inspection not recorded: roll not found.");
      if (!["AWAITING_INSPECTION", "REINSPECTION_REQUIRED", "REWORK_IN_PROGRESS"].includes(roll.status)) {
        return reject(current, `Inspection not recorded: ${roll.code} is ${roll.status} and cannot be inspected from that state.`);
      }
      const disposition = text(payload.result) as "PASS" | "REWORK" | "REJECT" | "QUARANTINE";
      if (!["PASS", "REWORK", "REJECT", "QUARANTINE"].includes(disposition)) return reject(current, "Inspection not recorded: unknown disposition.");
      const defect = text(payload.defect).trim();
      const reason = text(payload.reason).trim();
      const location = text(payload.location).trim();
      if (["REWORK", "REJECT"].includes(disposition) && !defect) return reject(current, "Inspection not recorded: a defect type is required for rework or rejection.");
      if (["REJECT", "QUARANTINE"].includes(disposition) && !reasonIsValid(reason)) return reject(current, "Inspection not recorded: reject and quarantine decisions require a five-character reason.");
      if (disposition === "PASS" && !location) return reject(current, "Inspection not recorded: accepted stock needs a finished-goods location.");
      const priorFailure = roll.priorFailure || disposition !== "PASS";
      roll.status = disposition === "PASS" ? "ACCEPTED" : disposition === "REWORK" ? "REWORK_REQUIRED" : disposition === "REJECT" ? "REJECTED" : "QUARANTINED";
      roll.priorFailure = priorFailure;
      if (defect) roll.defect = defect;
      if (disposition === "PASS") roll.location = location;
      const sequence = next.inspectionEvents.length + 1;
      next.inspectionEvents.push({
        id: `inspection-demo-${sequence}`,
        code: `QC-DEMO-${String(sequence).padStart(4, "0")}`,
        rollId: roll.id,
        rollCode: roll.code,
        result: disposition,
        defect: defect || roll.defect,
        reason: reason || "No additional inspection reason supplied.",
        location: disposition === "PASS" ? location : roll.location,
        evidenceCount: Math.max(0, Math.floor(Number(payload.evidenceCount) || 0)),
        actor,
        recordedAt,
      });
      if (disposition === "PASS") {
        const order = next.orders.find((candidate) => candidate.code === roll.orderCode);
        if (order) {
          order.accepted = new Decimal(order.accepted).plus(roll.qty).toFixed(3);
          order.available = new Decimal(order.available).plus(roll.qty).toFixed(3);
          order.hasQualityHold = next.rolls.some((candidate) => candidate.orderCode === order.code && ["QUARANTINED", "REJECTED", "REWORK_REQUIRED", "REWORK_IN_PROGRESS", "REINSPECTION_REQUIRED"].includes(candidate.status));
        }
      }
      markCommand(next, commandKey);
      return result(next, true, `${roll.code} disposition ${disposition} recorded in demo history; prior-failure state is retained.`, roll.code);
    }

    case "start-rework": {
      const roll = next.rolls.find((candidate) => candidate.id === text(payload.rollId) || candidate.code === text(payload.rollId));
      if (!roll) return reject(current, "Rework not started: roll not found.");
      if (roll.status !== "REWORK_REQUIRED") return reject(current, `Rework not started: ${roll.code} is ${roll.status}, not REWORK_REQUIRED.`);
      const reason = text(payload.reason).trim();
      if (!reasonIsValid(reason)) return reject(current, "Rework not started: a five-character repair instruction is required.");
      roll.status = "REWORK_IN_PROGRESS";
      const sequence = next.reworkEvents.length + 1;
      next.reworkEvents.push({ id: `rework-demo-${sequence}`, code: `RW-DEMO-${String(sequence).padStart(4, "0")}`, rollId: roll.id, rollCode: roll.code, action: "STARTED", reason, actor, recordedAt });
      markCommand(next, commandKey);
      return result(next, true, `${roll.code} rework started; the original inspection event remains in its passport.`, roll.code);
    }

    case "complete-rework": {
      const roll = next.rolls.find((candidate) => candidate.id === text(payload.rollId) || candidate.code === text(payload.rollId));
      if (!roll) return reject(current, "Rework not completed: roll not found.");
      if (roll.status !== "REWORK_IN_PROGRESS") return reject(current, `Rework not completed: ${roll.code} is ${roll.status}, not REWORK_IN_PROGRESS.`);
      const reason = text(payload.reason).trim();
      if (!reasonIsValid(reason)) return reject(current, "Rework not completed: add a five-character repair close-out note.");
      roll.status = "REINSPECTION_REQUIRED";
      const sequence = next.reworkEvents.length + 1;
      next.reworkEvents.push({ id: `rework-demo-${sequence}`, code: `RW-DEMO-${String(sequence).padStart(4, "0")}`, rollId: roll.id, rollCode: roll.code, action: "COMPLETED", reason, actor, recordedAt });
      markCommand(next, commandKey);
      return result(next, true, `${roll.code} is waiting for a new inspection; its original defect history is unchanged.`, roll.code);
    }

    case "create-shipment": {
      const rawIds = Array.isArray(payload.rollIds) ? payload.rollIds : [];
      const rollIds = rawIds.map((id) => text(id));
      const orderCode = text(payload.orderCode);
      const order = next.orders.find((candidate) => candidate.code === orderCode);
      if (!order) return reject(current, "Shipment not created: selected order was not found.");
      if (["CANCELLED", "CLOSED"].includes(order.status)) return reject(current, `Shipment not created: order ${order.code} is ${order.status}.`);
      if (!rollIds.length || new Set(rollIds).size !== rollIds.length) return reject(current, "Shipment not created: select one or more unique rolls.");
      const selected = rollIds.map((id) => next.rolls.find((roll) => roll.id === id));
      if (selected.some((roll) => !roll)) return reject(current, "Shipment not created: one or more selected rolls no longer exist.");
      const rolls = selected as FabricRoll[];
      if (!rolls.every((roll) => roll.status === "ACCEPTED")) return reject(current, "Shipment not created: only ACCEPTED rolls can be allocated.");
      if (!rolls.every((roll) => roll.orderCode === orderCode)) return reject(current, "Shipment not created: every roll must belong to the selected order.");
      if (!rolls.every((roll) => roll.unit === order.unit)) return reject(current, "Shipment not created: cross-unit allocation is prohibited.");
      const quantity = rolls.reduce((sum, roll) => sum.plus(roll.qty), new Decimal(0));
      const available = decimal(order.available);
      if (!available || quantity.gt(available)) return reject(current, "Shipment not created: selected accepted quantity exceeds the order's current available balance.");
      const vehicle = text(payload.vehicle).trim();
      const plannedAt = text(payload.plannedAt);
      if (!vehicle || !plannedAt || Number.isNaN(new Date(plannedAt).getTime())) return reject(current, "Shipment not created: vehicle reference and valid planned time are required.");
      const sequence = next.shipments.length + 1;
      const shipmentId = `shipment-demo-${sequence}`;
      const shipmentCode = `SHP-DEMO-${String(sequence).padStart(4, "0")}`;
      next.shipments.unshift({
        id: shipmentId,
        code: shipmentCode,
        orderCode,
        rollIds,
        buyer: order.buyer,
        status: "DRAFT",
        rolls: rolls.length,
        qty: quantity.toFixed(3),
        unit: order.unit,
        vehicle,
        plannedAt,
        invoice: null,
        amount: "",
      });
      for (const roll of rolls) {
        roll.status = "RESERVED";
        roll.location = "Loading bay · reserved";
      }
      order.available = available.minus(quantity).toFixed(3);
      order.reserved = new Decimal(order.reserved).plus(quantity).toFixed(3);
      const eventSequence = next.dispatchEvents.length + 1;
      next.dispatchEvents.push({ id: `dispatch-demo-${eventSequence}`, code: `DSE-DEMO-${String(eventSequence).padStart(4, "0")}`, shipmentId, shipmentCode, action: "DRAFT_CREATED", orderCode, rollIds: [...rollIds], quantity: quantity.toFixed(3), unit: order.unit, actor, recordedAt, commandKey: commandKey || undefined });
      markCommand(next, commandKey);
      return result(next, true, `${shipmentCode} is reserved as a draft in demo state; no invoice or external record was created.`, shipmentId);
    }

    case "confirm-dispatch": {
      const shipment = next.shipments.find((candidate) => candidate.id === text(payload.shipmentId) || candidate.code === text(payload.shipmentId));
      if (!shipment) return reject(current, "Dispatch not confirmed: shipment not found.");
      if (shipment.status === "DISPATCHED") return result(current, true, `${shipment.code} was already confirmed; no duplicate dispatch event was added.`, shipment.id);
      if (shipment.status !== "DRAFT") return reject(current, `Dispatch not confirmed: shipment is ${shipment.status}, not DRAFT.`, shipment.id);
      const rollIds = shipment.rollIds ?? [];
      if (!rollIds.length || new Set(rollIds).size !== rollIds.length || rollIds.length !== shipment.rolls) {
        return reject(current, "Dispatch not confirmed: reserved roll membership is incomplete or duplicated.", shipment.id);
      }
      const selected = rollIds.map((id) => next.rolls.find((roll) => roll.id === id));
      if (selected.some((roll) => !roll)) return reject(current, "Dispatch not confirmed: a reserved roll no longer exists.", shipment.id);
      const rolls = selected as FabricRoll[];
      const order = next.orders.find((candidate) => candidate.code === shipment.orderCode);
      if (!order) return reject(current, "Dispatch not confirmed: linked order no longer exists.", shipment.id);
      if (!rolls.every((roll) => roll.status === "RESERVED" && roll.orderCode === shipment.orderCode && roll.unit === shipment.unit && roll.unit === order.unit)) {
        return reject(current, "Dispatch not confirmed: every listed roll must remain reserved to this order in the same unit.", shipment.id);
      }
      const total = rolls.reduce((sum, roll) => sum.plus(roll.qty), new Decimal(0));
      if (!total.eq(shipment.qty) || total.gt(new Decimal(order.reserved))) {
        return reject(current, "Dispatch not confirmed: current roll quantities do not reconcile exactly with the draft and reservation.", shipment.id);
      }
      shipment.status = "DISPATCHED";
      const invoiceReference = `INV-DEMO-${shipment.code.replace(/^SHP-/, "")}`;
      shipment.invoice = invoiceReference;
      for (const roll of rolls) {
        roll.status = "DISPATCHED";
        roll.location = "Dispatched · demo";
      }
      order.reserved = Decimal.max(0, new Decimal(order.reserved).minus(total)).toFixed(3);
      const dispatchedTotal = new Decimal(order.dispatched).plus(total);
      order.dispatched = dispatchedTotal.toFixed(3);
      order.displayStatus = dispatchedTotal.gte(order.ordered) ? "DISPATCHED" : "PARTIALLY_DISPATCHED";
      const eventSequence = next.dispatchEvents.length + 1;
      next.dispatchEvents.push({ id: `dispatch-demo-${eventSequence}`, code: `DSE-DEMO-${String(eventSequence).padStart(4, "0")}`, shipmentId: shipment.id, shipmentCode: shipment.code, action: "CONFIRMED", orderCode: shipment.orderCode, rollIds: [...rollIds], quantity: total.toFixed(3), unit: shipment.unit, actor, recordedAt, commandKey: commandKey || undefined, invoiceReference });
      markCommand(next, commandKey);
      return result(next, true, `${shipment.code} dispatch confirmed in demo state with one non-statutory demo invoice reference (${invoiceReference}); no external system was contacted.`, shipment.id);
    }

    case "mark-read": {
      next.notifications = next.notifications.map((item) => item.id === text(payload.id) || payload.all === true ? { ...item, unread: false } : item);
      markCommand(next, commandKey);
      return result(next, true, "Notification read state updated in this demo session.");
    }

    default:
      return reject(current, "This action is not supported by the seeded demo adapter; no backend mutation was sent.");
  }
}
