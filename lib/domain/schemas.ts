import Decimal from "decimal.js";
import { z } from "zod";

const DECIMAL_PATTERN = /^\d{1,11}(\.\d{1,3})?$/;
const MONEY_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;
const SIGNED_QUANTITY_PATTERN = /^-?\d{1,11}(\.\d{1,3})?$/;

const decimalIsFinite = (value: string) => {
  try {
    return new Decimal(value).isFinite();
  } catch {
    return false;
  }
};

const moneyIsFinite = (value: string) => {
  try {
    return new Decimal(value).isFinite();
  } catch {
    return false;
  }
};

export const quantityString = z.string()
  .regex(DECIMAL_PATTERN, "Enter a non-negative quantity with up to 3 decimal places.")
  .refine(decimalIsFinite, "Enter a finite decimal quantity.");

export const positiveQuantity = quantityString.refine((value) => new Decimal(value).gt(0), "Quantity must be greater than zero.");
export const reasonSchema = z.string().trim().min(5, "Reason must be at least 5 characters.");
export const moneyString = z.string()
  .regex(MONEY_PATTERN, "Enter an amount with up to 2 decimal places.")
  .refine(moneyIsFinite, "Enter a finite monetary amount.");
export const positiveMoney = moneyString.refine((value) => new Decimal(value).gt(0), "Amount must be greater than zero.");

export const orderDraftSchema = z.object({
  buyer: z.string().trim().min(1, "Select a buyer."),
  product: z.string().trim().min(1, "Select a product."),
  colour: z.string().trim().min(1, "Enter the requested shade."),
  quantity: positiveQuantity,
  unit: z.enum(["M", "KG"]),
  due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid due date.").refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Enter a valid calendar date."),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  terms: z.string().max(500, "Notes are limited to 500 characters."),
});

export const outputEntrySchema = z.object({
  good: quantityString,
  waste: quantityString,
  reject: quantityString,
  remaining: quantityString,
  finalStage: z.boolean(),
  rollQty: quantityString,
}).superRefine((form, context) => {
  const total = new Decimal(form.good).plus(form.waste).plus(form.reject);
  if (total.lte(0)) context.addIssue({ code: "custom", message: "Total output must be greater than zero.", path: ["good"] });
  if (total.gt(form.remaining)) context.addIssue({ code: "custom", message: "Combined output exceeds the remaining target.", path: ["good"] });
  if (form.finalStage && !new Decimal(form.rollQty).eq(form.good)) {
    context.addIssue({ code: "custom", message: "Final-stage roll quantity must equal good output exactly.", path: ["rollQty"] });
  }
});

export const adjustmentRequestSchema = z.object({
  itemCode: z.string().min(1, "Select a yarn item."),
  delta: z.string().regex(SIGNED_QUANTITY_PATTERN, "Enter a signed quantity with up to 3 decimal places.").refine(decimalIsFinite, "Enter a finite decimal quantity."),
  reason: reasonSchema,
});

export const costEntrySchema = z.object({ amount: positiveMoney, source: reasonSchema });

export const paymentSchema = z.object({
  amount: positiveMoney,
  outstanding: moneyString,
  reference: z.string().trim().min(3, "Payment reference must be at least 3 characters."),
}).superRefine((form, context) => {
  if (new Decimal(form.amount).gt(form.outstanding)) {
    context.addIssue({ code: "custom", message: "Payment exceeds the outstanding balance.", path: ["amount"] });
  }
});

export const receiveLineSchema = z.object({
  itemCode: z.string().min(1, "Select a yarn item."),
  received: positiveQuantity,
  accepted: quantityString,
  damaged: quantityString,
  held: quantityString,
  unitCost: z.string().optional(),
}).superRefine((line, context) => {
  const total = new Decimal(line.accepted).plus(line.damaged).plus(line.held);
  if (!total.eq(line.received)) {
    context.addIssue({ code: "custom", message: "Accepted + damaged + held must equal received quantity exactly.", path: ["accepted"] });
  }
  if (line.unitCost && !/^\d{1,12}(\.\d{1,4})?$/.test(line.unitCost)) {
    context.addIssue({ code: "custom", message: "Unit cost must be a non-negative decimal with up to 4 places.", path: ["unitCost"] });
  }
});

export const inspectionSchema = z.object({
  result: z.enum(["PASS", "REWORK", "REJECT", "QUARANTINE"]),
  defect: z.string().optional(),
  reason: z.string().optional(),
  location: z.string().optional(),
}).superRefine((form, context) => {
  if (["REWORK", "REJECT"].includes(form.result) && !form.defect) {
    context.addIssue({ code: "custom", message: "Choose at least one defect.", path: ["defect"] });
  }
  if (["REJECT", "QUARANTINE"].includes(form.result) && (form.reason?.trim().length ?? 0) < 5) {
    context.addIssue({ code: "custom", message: "Add a reason of at least five characters.", path: ["reason"] });
  }
  if (form.result === "PASS" && !form.location) {
    context.addIssue({ code: "custom", message: "Select the finished-goods location.", path: ["location"] });
  }
});
