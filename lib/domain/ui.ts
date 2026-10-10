import clsx, { type ClassValue } from "clsx";

export function cx(...values: ClassValue[]): string {
  return clsx(values);
}

export function humanize(value: string): string {
  return value.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
