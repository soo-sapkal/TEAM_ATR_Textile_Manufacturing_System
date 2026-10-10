import Decimal from "decimal.js";
import type { Unit } from "@/lib/domain/types";

export function decimal(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}

export function sumDecimals(values: Array<string | number>): string {
  return values.reduce((total, value) => total.plus(value), new Decimal(0)).toFixed(3);
}

export function formatQty(value: string | number, unit: Unit, digits = 3): string {
  const amount = new Decimal(value);
  return `${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount.toNumber())} ${unit}`;
}

export function formatMoney(value: string | number, currency = "INR", digits = 2): string {
  const amount = new Decimal(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount.toNumber());
}

export function formatCompactMoney(value: string | number, currency = "INR"): string {
  const amount = new Decimal(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount.toNumber());
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
    ...options,
  }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return formatDate(value, { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function clampPercent(value: string | number, total: string | number): number {
  if (new Decimal(total).lte(0)) return 0;
  return Decimal.min(100, Decimal.max(0, new Decimal(value).div(total).mul(100))).toNumber();
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
