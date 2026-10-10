import { request } from "@/lib/api/client";

/**
 * Provisional route names from Overall_Implementation.md. The client brief,
 * part1.md, part2.md, and deployed API are not present in this workspace.
 * Verify every route and DTO against the approved backend contract before live use.
 */
export const PROPOSED_RESOURCES = {
  session: "/auth/session",
  dashboard: "/dashboard",
  orders: "/orders",
  yarnItems: "/inventory/yarn",
  yarnBatches: "/inventory/batches",
  yarnMovements: "/inventory/movements",
  productionPlans: "/production/plans",
  operations: "/production/operations",
  machines: "/machines",
  rolls: "/quality/rolls",
  inspections: "/quality/inspections",
  rework: "/quality/rework",
  shipments: "/dispatch/shipments",
  financeEntries: "/finance/entries",
  buyerPayments: "/finance/payments",
  attendance: "/hr/attendance",
  payrollPeriods: "/hr/payroll/periods",
  reports: "/reports",
  audit: "/admin/audit",
} as const;

export const PROPOSED_COMMANDS = {
  "receive-yarn": { method: "POST", path: "/inventory/receipts" },
  "create-order": { method: "POST", path: "/orders" },
  "approve-order": { method: "POST", path: "/orders/:id/approve" },
  "release-plan": { method: "POST", path: "/production/plans" },
  "assign-machine": { method: "POST", path: "/production/operations/:id/machine-assignment" },
  "operation-transition": { method: "POST", path: "/production/operations/:id/transitions" },
  "record-output": { method: "POST", path: "/production/operations/:id/output" },
  "machine-status": { method: "POST", path: "/machines/:id/transitions" },
  "record-downtime": { method: "POST", path: "/machines/:id/downtime" },
  "inspect-roll": { method: "POST", path: "/quality/rolls/:id/inspections" },
  "start-rework": { method: "POST", path: "/quality/rolls/:id/rework" },
  "complete-rework": { method: "POST", path: "/quality/rolls/:id/rework/complete" },
  "create-shipment": { method: "POST", path: "/dispatch/shipments" },
  "confirm-dispatch": { method: "POST", path: "/dispatch/shipments/:id/confirm" },
  "mark-read": { method: "POST", path: "/notifications/read" },
} as const;

export type ProposedCommand = keyof typeof PROPOSED_COMMANDS;
export type ResourceQuery = Record<string, string | number | boolean | undefined>;
export type ProposedMutationReceipt = { id?: string; code?: string; status?: string };

export function listResource<T>(resource: keyof typeof PROPOSED_RESOURCES, query?: ResourceQuery, signal?: AbortSignal): Promise<T> {
  return request<T>("GET", PROPOSED_RESOURCES[resource], { query, signal });
}

export function getResource<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>("GET", path, { signal });
}

export function sendProposedCommand<TResponse = ProposedMutationReceipt>(
  command: ProposedCommand,
  input: Record<string, unknown>,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<TResponse> {
  const definition = PROPOSED_COMMANDS[command];
  const entityId = typeof input.id === "string" ? input.id : typeof input.orderId === "string" ? input.orderId : typeof input.operationId === "string" ? input.operationId : typeof input.machineId === "string" ? input.machineId : typeof input.rollId === "string" ? input.rollId : typeof input.shipmentId === "string" ? input.shipmentId : "";
  const path = definition.path.replace(/:id\b/g, encodeURIComponent(entityId));
  return request<TResponse, Record<string, unknown>>(definition.method as "POST", path, {
    body: input,
    idempotencyKey,
    signal,
  });
}
