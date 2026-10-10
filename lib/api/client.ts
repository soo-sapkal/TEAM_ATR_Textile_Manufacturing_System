import type { ApiEnvelope, ApiErrorEnvelope } from "@/lib/domain/types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export interface RequestOptions<TBody = unknown> {
  query?: Record<string, string | number | boolean | undefined>;
  body?: TBody;
  idempotencyKey?: string;
  signal?: AbortSignal;
  headers?: HeadersInit;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "/api/v1").replace(/\/$/, "");

export async function request<TResponse, TBody = unknown>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options: RequestOptions<TBody> = {},
): Promise<TResponse> {
  const url = new URL(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, window.location.origin);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const requestId = crypto.randomUUID();
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    signal: options.signal,
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      "X-Request-Id": requestId,
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  if (response.status === 204) return undefined as TResponse;
  const payload = await response.json() as ApiEnvelope<TResponse> | ApiErrorEnvelope;
  if (!response.ok || "error" in payload) {
    const error = (payload as ApiErrorEnvelope).error;
    throw new ApiError(response.status, error.code, error.message, error.details, error.request_id ?? requestId);
  }
  return (payload as ApiEnvelope<TResponse>).data;
}

export const ERROR_COPY: Record<string, string> = {
  FORBIDDEN: "You do not have permission to do that.",
  NOT_FOUND: "We could not find that record. Refresh the list and try again.",
  VALIDATION_FAILED: "Check the highlighted fields and try again.",
  QUANTITY_MISMATCH: "Received quantity must equal accepted + damaged + held.",
  UNIT_MISMATCH: "Quantities with different units cannot be compared.",
  INVALID_STATE: "This record changed state. Refresh it before continuing.",
  INVALID_TRANSITION: "That state change is not allowed. The legal next states are shown.",
  MATERIAL_SHORTAGE: "There is not enough available yarn to release this plan.",
  NEGATIVE_STOCK: "This change would take stock below the reserved quantity.",
  MATERIAL_NOT_RESERVED: "Only material reserved for this plan can be issued.",
  BATCH_NOT_AVAILABLE: "This yarn batch is held or unavailable.",
  INSUFFICIENT_INPUT: "Previous-stage output is not sufficient for this quantity.",
  ROLLS_REQUIRED: "Add a roll for each unit of good output from the final stage.",
  ROLL_QTY_MISMATCH: "The total roll quantity must equal good output exactly.",
  ROLLS_NOT_ALLOWED: "Rolls are created only at the last production stage.",
  DEFECT_REQUIRED: "Add at least one defect for rework or rejection.",
  REASON_REQUIRED: "Give a reason of at least five characters.",
  ROLL_NOT_DISPATCHABLE: "Only accepted rolls can be allocated to a shipment.",
  ROLL_WRONG_ORDER: "This roll belongs to a different order.",
  ROLL_ALREADY_DISPATCHED: "This roll has already been dispatched.",
  ROLL_STATE_CHANGED: "This roll's state changed. The eligible list has been refreshed.",
  QUANTITY_EXCEEDS_ORDER: "This shipment would exceed the order quantity and allowed tolerance.",
  EMPTY_SHIPMENT: "Add at least one roll before confirming dispatch.",
  HAS_DISPATCHES: "This order already has dispatched rolls and cannot be cancelled.",
  PLAN_EXISTS: "An active plan already exists for this order line.",
  MACHINE_UNAVAILABLE: "The assigned machine is not available for this operation.",
  SCHEDULE_CONFLICT: "This machine or shift has a scheduling conflict.",
  STAGE_MISMATCH: "Choose a machine assigned to this production stage.",
  NO_OUTPUT: "Record at least one output before completing this operation.",
  DOWNTIME_OPEN: "End the open downtime record before starting another.",
  SEPARATION_OF_DUTIES: "A different person must approve this request.",
  PERIOD_APPROVED: "This attendance date is locked by an approved payroll period.",
  PERIOD_OVERLAP: "This payroll period overlaps an existing period.",
  OVERPAYMENT: "The payment is greater than the invoice's outstanding balance.",
  RATE_LIMITED: "Too many attempts. Wait a moment and retry.",
  NETWORK: "We could not reach the service. Your draft remains available to retry.",
};

export function userMessage(code: string): string {
  return ERROR_COPY[code] ?? "Something went wrong. Please review the record and retry.";
}
