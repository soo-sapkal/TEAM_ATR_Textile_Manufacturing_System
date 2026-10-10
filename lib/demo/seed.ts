import type { DemoData, DispatchEvent, FabricRoll, InspectionEvent, Machine, MachineEvent, Operation, Order, OutputEvent, ReworkEvent, Shipment, YarnBatch, YarnItem, YarnMovement } from "@/lib/domain/types";

export const seedOrders: Order[] = [
  { id: "order-07", code: "ORD-2026-0007", buyer: "Mysore House Textiles", buyerId: "buyer-01", product: "FAB-221 Indigo Twill", colour: "Indigo 7", due: "2026-10-15", priority: "HIGH", status: "IN_PRODUCTION", displayStatus: "PARTIALLY_DISPATCHED", stage: "WEAVING", unit: "M", ordered: "500.000", planned: "500.000", produced: "412.000", accepted: "292.000", available: "120.000", reserved: "60.000", dispatched: "112.000", remaining: "268.000", atRisk: false, materialShortage: false, hasQualityHold: true, currency: "INR", revenue: "385000.00", recordedCost: "218400.00", estimatedCost: "24200.00" },
  { id: "order-08", code: "ORD-2026-0008", buyer: "Kaveri Apparel Co.", buyerId: "buyer-02", product: "FAB-118 Cotton Sateen", colour: "Natural", due: "2026-10-12", priority: "URGENT", status: "CONFIRMED", displayStatus: "CONFIRMED", stage: null, unit: "M", ordered: "800.000", planned: "0.000", produced: "0.000", accepted: "0.000", available: "0.000", reserved: "0.000", dispatched: "0.000", remaining: "800.000", atRisk: true, materialShortage: true, hasQualityHold: false, currency: "INR", revenue: "612000.00", recordedCost: "0.00", estimatedCost: "0.00" },
  { id: "order-09", code: "ORD-2026-0009", buyer: "Saffron Living", buyerId: "buyer-03", product: "FAB-307 Linen Blend", colour: "Moss", due: "2026-10-18", priority: "NORMAL", status: "IN_PRODUCTION", displayStatus: "READY_FOR_DISPATCH", stage: "DYEING", unit: "M", ordered: "300.000", planned: "300.000", produced: "306.000", accepted: "300.000", available: "280.000", reserved: "0.000", dispatched: "0.000", remaining: "300.000", atRisk: false, materialShortage: false, hasQualityHold: false, currency: "INR", revenue: "246000.00", recordedCost: "164200.00", estimatedCost: "8100.00" },
  { id: "order-10", code: "ORD-2026-0010", buyer: "Mysore House Textiles", buyerId: "buyer-01", product: "FAB-221 Indigo Twill", colour: "Indigo 4", due: "2026-10-22", priority: "NORMAL", status: "PLANNED", displayStatus: "PLANNED", stage: null, unit: "M", ordered: "640.000", planned: "640.000", produced: "0.000", accepted: "0.000", available: "0.000", reserved: "0.000", dispatched: "0.000", remaining: "640.000", atRisk: false, materialShortage: false, hasQualityHold: false, currency: "INR", revenue: "499200.00", recordedCost: "0.00", estimatedCost: "96000.00" },
];

export const seedYarnItems: YarnItem[] = [
  { id: "yarn-01", code: "YN-30-WHT", description: "Cotton yarn · 30s combed", colour: "Raw white", unit: "KG", onHand: "840.000", reserved: "320.000", available: "520.000", held: "24.000", reorderLevel: "500.000" },
  { id: "yarn-02", code: "YN-40-IND", description: "Cotton yarn · 40s ring-spun", colour: "Indigo dyed", unit: "KG", onHand: "1240.500", reserved: "180.000", available: "1060.500", held: "0.000", reorderLevel: "500.000" },
  { id: "yarn-03", code: "YN-20-NAT", description: "Cotton yarn · 20s open-end", colour: "Natural", unit: "KG", onHand: "410.000", reserved: "85.000", available: "325.000", held: "12.000", reorderLevel: "300.000" },
  { id: "yarn-04", code: "YN-LIN-01", description: "Linen blend · 1/30 Nm", colour: "Moss green", unit: "KG", onHand: "96.000", reserved: "30.000", available: "66.000", held: "0.000", reorderLevel: "120.000" },
  { id: "yarn-05", code: "YN-16-BLK", description: "Cotton yarn · 16s carded", colour: "Jet black", unit: "KG", onHand: "720.000", reserved: "120.000", available: "600.000", held: "50.000", reorderLevel: "450.000" },
];

export const seedBatches: YarnBatch[] = [
  { id: "batch-01", code: "YB-2026-0012", itemCode: "YN-30-WHT", supplier: "Karnataka Spinners", supplierLot: "KS-26-114", receivedAt: "2026-10-08T07:30:00Z", onHand: "320.000", reserved: "320.000", available: "0.000", held: "0.000", unit: "KG", unitCost: "212.5000", location: "WH-YARN-A2", status: "AVAILABLE", orderCode: "ORD-2026-0010" },
  { id: "batch-02", code: "YB-2026-0015", itemCode: "YN-30-WHT", supplier: "Deccan Fibres Ltd.", supplierLot: "DF-5018", receivedAt: "2026-10-09T05:40:00Z", onHand: "520.000", reserved: "0.000", available: "520.000", held: "0.000", unit: "KG", unitCost: "208.7500", location: "WH-YARN-A1", status: "AVAILABLE" },
  { id: "batch-03", code: "YB-2026-0018", itemCode: "YN-40-IND", supplier: "Indigo Loom Supply", supplierLot: "ILS-0912", receivedAt: "2026-10-07T09:10:00Z", onHand: "740.500", reserved: "120.000", available: "620.500", held: "0.000", unit: "KG", unitCost: "286.2000", location: "WH-YARN-B1" , status: "AVAILABLE"},
  { id: "batch-04", code: "YB-2026-0021", itemCode: "YN-LIN-01", supplier: "Coastal Yarn House", supplierLot: "CYH-77", receivedAt: "2026-10-06T08:00:00Z", onHand: "96.000", reserved: "30.000", available: "66.000", held: "0.000", unit: "KG", unitCost: null, location: "WH-YARN-C1", status: "AVAILABLE" },
  { id: "batch-05", code: "YB-2026-0022", itemCode: "YN-16-BLK", supplier: "Deccan Fibres Ltd.", supplierLot: "DF-4980", receivedAt: "2026-10-05T06:10:00Z", onHand: "720.000", reserved: "120.000", available: "600.000", held: "50.000", unit: "KG", unitCost: "176.1000", location: "WH-YARN-A3", status: "AVAILABLE" },
  { id: "batch-06", code: "YB-2026-0023", itemCode: "YN-20-NAT", supplier: "Karnataka Spinners", supplierLot: "KS-26-109", receivedAt: "2026-10-04T07:30:00Z", onHand: "410.000", reserved: "85.000", available: "325.000", held: "12.000", unit: "KG", unitCost: "190.0000", location: "WH-YARN-B3", status: "AVAILABLE" },
];

const machineRows: Omit<Machine, "id">[] = [
  { code: "LM-01", name: "Loom 1", stage: "WEAVING", location: "North floor", status: "RUNNING", orderCode: "ORD-2026-0007", operationId: "op-02", todayGood: "412.000", unit: "M", downtimeMinutes: 0, costPerHour: "1450.00", nextMaintenance: "2026-10-22" },
  { code: "LM-02", name: "Loom 2", stage: "WEAVING", location: "North floor", status: "IDLE", orderCode: null, operationId: null, todayGood: "0.000", unit: "M", downtimeMinutes: 0, costPerHour: "1380.00", nextMaintenance: "2026-10-29" },
  { code: "LM-03", name: "Loom 3", stage: "WEAVING", location: "North floor", status: "BREAKDOWN", orderCode: "ORD-2026-0008", operationId: "op-03", todayGood: "84.000", unit: "M", downtimeMinutes: 86, costPerHour: null, nextMaintenance: "2026-10-09" },
  { code: "LM-04", name: "Loom 4", stage: "WEAVING", location: "North floor", status: "SETUP", orderCode: "ORD-2026-0010", operationId: "op-04", todayGood: "0.000", unit: "M", downtimeMinutes: 15, costPerHour: "1320.00", nextMaintenance: "2026-11-02" },
  { code: "SP-01", name: "Ring frame 1", stage: "SPINNING", location: "Spinning bay", status: "RUNNING", orderCode: "ORD-2026-0010", operationId: "op-01", todayGood: "164.000", unit: "KG", downtimeMinutes: 5, costPerHour: "980.00", nextMaintenance: "2026-10-28" },
  { code: "SP-02", name: "Ring frame 2", stage: "SPINNING", location: "Spinning bay", status: "IDLE", orderCode: null, operationId: null, todayGood: "0.000", unit: "KG", downtimeMinutes: 0, costPerHour: "920.00", nextMaintenance: "2026-10-30" },
  { code: "SP-03", name: "Ring frame 3", stage: "SPINNING", location: "Spinning bay", status: "MAINTENANCE", orderCode: null, operationId: null, todayGood: "0.000", unit: "KG", downtimeMinutes: 120, costPerHour: "1040.00", nextMaintenance: "2026-10-11" },
  { code: "SP-04", name: "Ring frame 4", stage: "SPINNING", location: "Spinning bay", status: "OFFLINE", orderCode: null, operationId: null, todayGood: "0.000", unit: "KG", downtimeMinutes: 0, costPerHour: null, nextMaintenance: "2026-11-05" },
  { code: "DY-01", name: "Jet dye 1", stage: "DYEING", location: "Wet processing", status: "RUNNING", orderCode: "ORD-2026-0009", operationId: "op-06", todayGood: "226.000", unit: "M", downtimeMinutes: 0, costPerHour: "1725.00", nextMaintenance: "2026-10-19" },
  { code: "DY-02", name: "Jet dye 2", stage: "DYEING", location: "Wet processing", status: "IDLE", orderCode: null, operationId: null, todayGood: "0.000", unit: "M", downtimeMinutes: 0, costPerHour: "1690.00", nextMaintenance: "2026-11-03" },
  { code: "DY-03", name: "Jigger 1", stage: "DYEING", location: "Wet processing", status: "OFFLINE", orderCode: null, operationId: null, todayGood: "0.000", unit: "M", downtimeMinutes: 33, costPerHour: "1410.00", nextMaintenance: "2026-10-17" },
  { code: "DY-04", name: "Jigger 2", stage: "DYEING", location: "Wet processing", status: "OFFLINE", orderCode: null, operationId: null, todayGood: "0.000", unit: "M", downtimeMinutes: 0, costPerHour: "1390.00", nextMaintenance: "2026-10-24" },
];
export const seedMachines: Machine[] = machineRows.map((machine, index) => ({ ...machine, id: `machine-${index + 1}` }));

export const seedOperations: Operation[] = [
  { id: "op-01", code: "OP-2026-0031", orderCode: "ORD-2026-0010", planCode: "PLN-2026-0010", stage: "SPINNING", status: "IN_PROGRESS", machineCode: "SP-01", shift: "A · 06:00–14:00", good: "164.000", waste: "4.500", reject: "1.000", target: "640.000", unit: "KG", operators: ["R. Kumar", "A. Roy"] },
  { id: "op-02", code: "OP-2026-0024", orderCode: "ORD-2026-0007", planCode: "PLN-2026-0007", stage: "WEAVING", status: "IN_PROGRESS", machineCode: "LM-01", shift: "B · 14:00–22:00", good: "412.000", waste: "18.000", reject: "7.000", target: "500.000", unit: "M", operators: ["R. Kumar", "S. Rao"] },
  { id: "op-03", code: "OP-2026-0030", orderCode: "ORD-2026-0008", planCode: "PLN-2026-0008", stage: "WEAVING", status: "PAUSED", machineCode: "LM-03", shift: "A · 06:00–14:00", good: "84.000", waste: "2.000", reject: "0.000", target: "800.000", unit: "M", operators: ["V. Nair"] },
  { id: "op-04", code: "OP-2026-0034", orderCode: "ORD-2026-0010", planCode: "PLN-2026-0010", stage: "WEAVING", status: "PLANNED", machineCode: "LM-04", shift: "B · 14:00–22:00", good: "0.000", waste: "0.000", reject: "0.000", target: "640.000", unit: "M", operators: [] },
  { id: "op-05", code: "OP-2026-0027", orderCode: "ORD-2026-0009", planCode: "PLN-2026-0009", stage: "WEAVING", status: "COMPLETED", machineCode: "LM-02", shift: "A · 06:00–14:00", good: "306.000", waste: "8.000", reject: "2.000", target: "300.000", unit: "M", operators: ["N. Rao"] },
  { id: "op-06", code: "OP-2026-0028", orderCode: "ORD-2026-0009", planCode: "PLN-2026-0009", stage: "DYEING", status: "IN_PROGRESS", machineCode: "DY-01", shift: "B · 14:00–22:00", good: "226.000", waste: "5.000", reject: "1.000", target: "300.000", unit: "M", operators: ["K. Joshi", "P. Sen"] },
];

const statusForRoll = (index: number): FabricRoll["status"] => {
  if (index <= 8) return "AWAITING_INSPECTION";
  if (index <= 11) return "REINSPECTION_REQUIRED";
  if (index <= 13) return "REWORK_REQUIRED";
  if (index === 14) return "REWORK_IN_PROGRESS";
  if (index === 15) return "QUARANTINED";
  if (index === 16) return "REJECTED";
  if (index <= 25) return "ACCEPTED";
  if (index <= 28) return "RESERVED";
  return "DISPATCHED";
};
export const seedRolls: FabricRoll[] = Array.from({ length: 30 }, (_, index) => {
  const n = index + 111;
  const shipmentOrderRolls = [24, 26, 27, 28].includes(index);
  const order = shipmentOrderRolls ? seedOrders[0] : seedOrders[index % seedOrders.length];
  const status = [24, 28].includes(index) ? "DISPATCHED" : [26, 27].includes(index) ? "RESERVED" : index === 29 ? "ACCEPTED" : statusForRoll(index + 1);
  const shipmentQuantity: Record<number, string> = { 24: "52.000", 26: "30.000", 27: "30.000", 28: "60.000" };
  return {
    id: `roll-${n}`,
    code: `ROLL-2026-${String(n).padStart(4, "0")}`,
    orderCode: order.code,
    buyer: order.buyer,
    qty: shipmentQuantity[index] ?? String(40 + ((index * 13) % 81)).padStart(2, "0") + ".000",
    unit: "M",
    colour: ["Indigo 7", "Natural", "Moss", "Indigo 4"][index % 4],
    dyeLot: `DL-${String(912 + (index % 9)).padStart(4, "0")}`,
    status,
    machineCode: ["LM-01", "LM-02", "DY-01", "LM-04"][index % 4],
    location: status === "ACCEPTED" ? "WH-FG-A1" : status === "RESERVED" ? "Loading bay 1" : status === "DISPATCHED" ? "Dispatched · sample" : "QC hold area",
    createdAt: new Date(Date.UTC(2026, 9, 10 - (index % 7), 8 + (index % 10), 10)).toISOString(),
    priorFailure: ["REINSPECTION_REQUIRED", "REWORK_REQUIRED", "REWORK_IN_PROGRESS", "QUARANTINED"].includes(status),
    defect: index % 3 === 0 ? "Hole ×2 · Major" : index % 3 === 1 ? "Colour variance · Minor" : "Uneven weave · Major",
  };
});

export const seedShipments: Shipment[] = [
  { id: "shipment-03", code: "SHP-2026-0003", orderCode: "ORD-2026-0007", rollIds: ["roll-137", "roll-138"], buyer: "Mysore House Textiles", status: "DRAFT", rolls: 2, qty: "60.000", unit: "M", vehicle: "KA-01-AB-1234", plannedAt: "2026-10-10T13:30:00Z", invoice: null, amount: "0.00" },
  { id: "shipment-02", code: "SHP-2026-0002", orderCode: "ORD-2026-0007", rollIds: ["roll-135", "roll-139"], buyer: "Mysore House Textiles", status: "DISPATCHED", rolls: 2, qty: "112.000", unit: "M", vehicle: "KA-02-CD-7788", plannedAt: "2026-10-09T10:00:00Z", invoice: "INV-2026-0031", amount: "86240.00" },
];

export const seedYarnMovements: YarnMovement[] = [
  { id: "move-221", code: "MOV-2026-0221", kind: "RECEIPT", batchId: "batch-05", batchCode: "YB-2026-0022", itemCode: "YN-16-BLK", quantity: "720.000", unit: "KG", reference: "Deccan Fibres Ltd. · supplier lot DF-4980", actor: "Leela Das", recordedAt: "2026-10-05T06:10:00Z" },
  { id: "move-218", code: "MOV-2026-0218", kind: "RESERVATION", batchId: "batch-01", batchCode: "YB-2026-0012", itemCode: "YN-30-WHT", quantity: "-320.000", unit: "KG", reference: "PLN-2026-0010", actor: "Sanjay Patil", recordedAt: "2026-10-08T07:41:00Z" },
  { id: "move-214", code: "MOV-2026-0214", kind: "ISSUE", batchId: "batch-03", batchCode: "YB-2026-0018", itemCode: "YN-40-IND", quantity: "-120.000", unit: "KG", reference: "OP-2026-0024", actor: "Leela Das", recordedAt: "2026-10-08T08:05:00Z" },
  { id: "move-209", code: "MOV-2026-0209", kind: "HOLD", batchId: "batch-05", batchCode: "YB-2026-0022", itemCode: "YN-16-BLK", quantity: "50.000", unit: "KG", reference: "Incoming QC · held on receipt", actor: "Priya Iyer", recordedAt: "2026-10-05T06:15:00Z" },
];

export const seedOutputEvents: OutputEvent[] = seedOperations.flatMap((operation) => ([
  { id: `${operation.id}-good`, code: `OUT-${operation.code}-G`, operationId: operation.id, operationCode: operation.code, kind: "GOOD" as const, quantity: operation.good, unit: operation.unit, actor: operation.operators[0] ?? "Mill operator", recordedAt: "2026-10-10T08:25:00Z" },
  { id: `${operation.id}-waste`, code: `OUT-${operation.code}-W`, operationId: operation.id, operationCode: operation.code, kind: "WASTE" as const, quantity: operation.waste, unit: operation.unit, actor: operation.operators[0] ?? "Mill operator", recordedAt: "2026-10-10T08:25:00Z" },
  { id: `${operation.id}-reject`, code: `OUT-${operation.code}-R`, operationId: operation.id, operationCode: operation.code, kind: "REJECT" as const, quantity: operation.reject, unit: operation.unit, actor: operation.operators[0] ?? "Mill operator", recordedAt: "2026-10-10T08:25:00Z" },
].filter((event) => event.quantity !== "0.000")));

export const seedInspectionEvents: InspectionEvent[] = seedRolls.filter((roll) => roll.priorFailure).map((roll, index) => ({
  id: `inspection-seed-${index + 1}`,
  code: `QC-2026-${String(index + 1).padStart(4, "0")}`,
  rollId: roll.id,
  rollCode: roll.code,
  result: roll.status === "QUARANTINED" ? "QUARANTINE" : roll.status === "REJECTED" ? "REJECT" : "REWORK",
  defect: roll.defect,
  reason: "Illustrative sample disposition; authoritative defect rules were not supplied.",
  location: roll.location,
  evidenceCount: 0,
  actor: "Priya Iyer",
  recordedAt: roll.createdAt,
}));

export const seedReworkEvents: ReworkEvent[] = seedRolls.filter((roll) => roll.status === "REWORK_IN_PROGRESS").map((roll, index) => ({
  id: `rework-seed-${index + 1}`,
  code: `RW-2026-${String(index + 1).padStart(4, "0")}`,
  rollId: roll.id,
  rollCode: roll.code,
  action: "STARTED",
  reason: "Illustrative rework instruction; sample only.",
  actor: "R. Kumar",
  recordedAt: roll.createdAt,
}));

export const seedDispatchEvents: DispatchEvent[] = seedShipments.map((shipment, index) => ({
  id: `dispatch-event-${shipment.id}`,
  code: `DSEED-${String(index + 1).padStart(4, "0")}`,
  shipmentId: shipment.id,
  shipmentCode: shipment.code,
  action: shipment.status === "DISPATCHED" ? "CONFIRMED" : "DRAFT_CREATED",
  orderCode: shipment.orderCode,
  rollIds: shipment.rollIds ?? [],
  quantity: shipment.qty,
  unit: shipment.unit,
  actor: "Sameer Khan",
  recordedAt: shipment.plannedAt,
}));

export const seedMachineEvents: MachineEvent[] = seedMachines.filter((machine) => machine.downtimeMinutes > 0).map((machine, index) => {
  const open = machine.status === "BREAKDOWN" || machine.status === "MAINTENANCE";
  const ended = Date.UTC(2026, 9, 10, 8, 0);
  return {
    id: `machine-event-seed-${index + 1}`,
    code: `DWT-SEED-${String(index + 1).padStart(4, "0")}`,
    machineId: machine.id,
    machineCode: machine.code,
    kind: machine.status === "BREAKDOWN" ? "BREAKDOWN" : machine.status === "MAINTENANCE" ? "MAINTENANCE" : "DOWNTIME",
    status: open ? "OPEN" : "CLOSED",
    category: "ILLUSTRATIVE",
    reason: "Seeded sample downtime history; source event detail was not supplied.",
    durationMinutes: machine.downtimeMinutes,
    actor: "Mill shift lead",
    startedAt: new Date(ended - machine.downtimeMinutes * 60_000).toISOString(),
    endedAt: open ? undefined : new Date(ended).toISOString(),
  };
});

export const seedData: DemoData = {
  orders: seedOrders,
  yarnItems: seedYarnItems,
  yarnBatches: seedBatches,
  machines: seedMachines,
  rolls: seedRolls,
  shipments: seedShipments,
  operations: seedOperations,
  yarnMovements: seedYarnMovements,
  outputEvents: seedOutputEvents,
  inspectionEvents: seedInspectionEvents,
  reworkEvents: seedReworkEvents,
  dispatchEvents: seedDispatchEvents,
  machineEvents: seedMachineEvents,
  processedCommandKeys: [],
  notifications: [
    { id: "n-1", title: "Machine breakdown", body: "LM-03 has been down for 86 minutes.", href: "/machines/machine-3", unread: true, when: "8 min ago" },
    { id: "n-2", title: "Yarn below reorder", body: "YN-LIN-01 has 66.000 KG available.", href: "/inventory?item=YN-LIN-01", unread: true, when: "24 min ago" },
    { id: "n-3", title: "Inspection backlog", body: "Three rolls need re-inspection.", href: "/quality?status=REINSPECTION_REQUIRED", unread: false, when: "1 h ago" },
  ],
};
