export type Unit = "KG" | "M" | "PCS";
export type Stage = "SPINNING" | "WEAVING" | "DYEING";
export type Permission =
  | "users.manage" | "audit.read" | "master.manage"
  | "orders.read" | "orders.create" | "orders.approve"
  | "inventory.read" | "inventory.receive" | "inventory.reserve" | "inventory.issue" | "inventory.adjust_request" | "inventory.adjust_approve"
  | "production.read" | "production.plan" | "production.assign" | "production.record_output" | "machines.operate"
  | "quality.read" | "quality.inspect" | "quality.rework" | "quality.release"
  | "dispatch.read" | "dispatch.create" | "dispatch.confirm" | "dispatch.reverse"
  | "hr.attendance" | "payroll.read" | "payroll.draft" | "payroll.approve"
  | "finance.read" | "finance.write" | "finance.approve" | "portal.read";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: Permission[];
  landing: string;
  buyerId?: string;
}

export interface Order {
  id: string;
  code: string;
  buyer: string;
  buyerId: string;
  product: string;
  colour: string;
  due: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: string;
  displayStatus: string;
  stage: Stage | null;
  unit: Unit;
  ordered: string;
  planned: string;
  produced: string;
  accepted: string;
  available: string;
  reserved: string;
  dispatched: string;
  remaining: string;
  atRisk: boolean;
  materialShortage: boolean;
  hasQualityHold: boolean;
  currency: string;
  revenue: string;
  recordedCost: string;
  estimatedCost: string;
}

export interface YarnItem {
  id: string;
  code: string;
  description: string;
  colour: string;
  unit: Unit;
  onHand: string;
  reserved: string;
  available: string;
  held: string;
  reorderLevel: string;
}

export interface YarnBatch {
  id: string;
  code: string;
  itemCode: string;
  supplier: string;
  supplierLot: string;
  receivedAt: string;
  onHand: string;
  reserved: string;
  available: string;
  held: string;
  unit: Unit;
  unitCost: string | null;
  location: string;
  status: "AVAILABLE" | "QUARANTINED" | "CLOSED";
  orderCode?: string;
  notes?: string;
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  stage: Stage;
  location: string;
  status: "IDLE" | "RUNNING" | "SETUP" | "MAINTENANCE" | "BREAKDOWN" | "OFFLINE";
  orderCode: string | null;
  operationId: string | null;
  todayGood: string;
  unit: Unit;
  downtimeMinutes: number;
  costPerHour: string | null;
  nextMaintenance: string | null;
}

export interface FabricRoll {
  id: string;
  code: string;
  orderCode: string;
  buyer: string;
  qty: string;
  unit: Unit;
  colour: string;
  dyeLot: string;
  status: "AWAITING_INSPECTION" | "REINSPECTION_REQUIRED" | "REWORK_REQUIRED" | "REWORK_IN_PROGRESS" | "QUARANTINED" | "REJECTED" | "ACCEPTED" | "RESERVED" | "DISPATCHED";
  machineCode: string;
  location: string;
  createdAt: string;
  priorFailure: boolean;
  defect?: string;
  dispatchQcPassed?: boolean;
  dispatchQcNotes?: string;
  dispatchQcBy?: string;
  dispatchQcAt?: string;
}

export interface Shipment {
  id: string;
  code: string;
  orderCode: string;
  rollIds?: string[];
  buyer: string;
  status: "DRAFT" | "DISPATCHED" | "CANCELLED" | "REVERSED";
  rolls: number;
  qty: string;
  unit: Unit;
  vehicle: string;
  driverName?: string;
  licensePlate?: string;
  transportAgency?: string;
  ewayBillNumber?: string;
  plannedAt: string;
  invoice: string | null;
  amount: string;
}

export interface Operation {
  id: string;
  code: string;
  orderCode: string;
  planCode: string;
  stage: Stage;
  status: "PLANNED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "CANCELLED";
  machineCode: string | null;
  shift: string | null;
  good: string;
  waste: string;
  reject: string;
  target: string;
  unit: Unit;
  operators: string[];
}

export interface YarnMovement {
  id: string;
  code: string;
  kind: "RECEIPT" | "RESERVATION" | "ISSUE" | "HOLD" | "ADJUSTMENT" | "REVERSAL";
  batchId: string;
  batchCode: string;
  itemCode: string;
  quantity: string;
  unit: Unit;
  reference: string;
  actor: string;
  recordedAt: string;
}

export interface OutputEvent {
  id: string;
  code: string;
  operationId: string;
  operationCode: string;
  kind: "GOOD" | "WASTE" | "REJECT";
  quantity: string;
  unit: Unit;
  actor: string;
  recordedAt: string;
  rollCodes?: string[];
}

export interface InspectionEvent {
  id: string;
  code: string;
  rollId: string;
  rollCode: string;
  result: "PASS" | "REWORK" | "REJECT" | "QUARANTINE";
  defect?: string;
  reason: string;
  location?: string;
  evidenceCount: number;
  actor: string;
  recordedAt: string;
}

export interface ReworkEvent {
  id: string;
  code: string;
  rollId: string;
  rollCode: string;
  action: "STARTED" | "COMPLETED";
  reason: string;
  actor: string;
  recordedAt: string;
}

export interface DispatchEvent {
  id: string;
  code: string;
  shipmentId: string;
  shipmentCode: string;
  action: "DRAFT_CREATED" | "CONFIRMED";
  orderCode: string;
  rollIds: string[];
  quantity: string;
  unit: Unit;
  actor: string;
  recordedAt: string;
  commandKey?: string;
  invoiceReference?: string;
}

export interface MachineEvent {
  id: string;
  code: string;
  machineId: string;
  machineCode: string;
  kind: "BREAKDOWN" | "MAINTENANCE" | "DOWNTIME" | "RECOVERY";
  status: "OPEN" | "CLOSED";
  category?: string;
  reason: string;
  durationMinutes: number;
  actor: string;
  startedAt: string;
  endedAt?: string;
}

export interface DemoData {
  orders: Order[];
  yarnItems: YarnItem[];
  yarnBatches: YarnBatch[];
  machines: Machine[];
  rolls: FabricRoll[];
  shipments: Shipment[];
  operations: Operation[];
  yarnMovements: YarnMovement[];
  outputEvents: OutputEvent[];
  inspectionEvents: InspectionEvent[];
  reworkEvents: ReworkEvent[];
  dispatchEvents: DispatchEvent[];
  machineEvents: MachineEvent[];
  processedCommandKeys: string[];
  notifications: { id: string; title: string; body: string; href: string; unread: boolean; when: string }[];
  invoices: Invoice[];
  payments: Payment[];
  supplierBills: SupplierBill[];
  supplierPayments: SupplierPayment[];
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: { page?: number; limit?: number; total?: number; next_cursor?: string | null };
}

export interface ApiErrorEnvelope {
  error: { code: string; message: string; details?: Record<string, unknown>; request_id?: string };
}
export interface Invoice {
  id: string;
  orderId: string;
  buyerName: string;
  amountDue: number;
  dueDate: string;
  status: "PENDING" | "PARTIAL" | "PAID";
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amountPaid: number;
  paymentMethod: string;
  referenceNo: string;
  paymentDate: string;
  createdAt: string;
}

export interface SupplierBill {
  id: string;
  supplierName: string;
  referenceBatchId?: string;
  amountDue: number;
  dueDate: string;
  status: "PENDING" | "PARTIAL" | "PAID";
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  billId: string;
  amountPaid: number;
  paymentMethod: string;
  referenceNo: string;
  paymentDate: string;
  createdAt: string;
}
