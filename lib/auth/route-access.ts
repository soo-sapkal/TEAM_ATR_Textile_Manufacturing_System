import type { Permission } from "@/lib/domain/types";
import { ROUTES } from "@/lib/routes";

export function requiredPermissions(path: string): Permission[] {
  const cleanPath = path.replace(/^\/(owner|supervisor|operator|quality|dispatch|buyer|admin)/, "") || "/";
  if (cleanPath === "/dashboard") return ["orders.read", "production.read", "inventory.read", "quality.read", "dispatch.read", "finance.read", "hr.attendance", "users.manage"];
  if (cleanPath === "/my-work") return ["production.read"];
  if (cleanPath.startsWith("/orders/new")) return ["orders.create"];
  if (cleanPath.startsWith("/orders")) return ["orders.read"];
  if (cleanPath.startsWith("/inventory/receive")) return ["inventory.receive"];
  if (cleanPath.startsWith("/inventory")) return ["inventory.read"];
  if (cleanPath.startsWith("/production/operations")) return ["production.read"];
  if (cleanPath.startsWith("/production")) return ["production.read"];
  if (cleanPath.startsWith("/machines")) return ["production.read"];
  if (cleanPath.startsWith("/quality/inspect")) return ["quality.inspect"];
  if (cleanPath.startsWith("/quality/rework")) return ["quality.read", "quality.rework"];
  if (cleanPath.startsWith("/quality") || cleanPath.startsWith("/rolls") || cleanPath === "/scan") return ["quality.read"];
  if (cleanPath === "/dispatch/new") return ["dispatch.create"];
  if (cleanPath.startsWith("/print/dispatch/")) return ["dispatch.read"];
  if (cleanPath.startsWith("/print/roll-tag/")) return ["quality.read"];
  if (cleanPath.startsWith("/dispatch")) return ["dispatch.read"];
  if (cleanPath.startsWith("/finance")) return ["finance.read"];
  if (cleanPath.startsWith("/hr/attendance")) return ["hr.attendance"];
  if (cleanPath.startsWith("/hr/payroll")) return ["payroll.read"];
  if (cleanPath.startsWith("/hr")) return ["hr.attendance"];
  if (cleanPath.startsWith("/reports/month-close")) return ["finance.read"];
  if (cleanPath.startsWith("/reports")) return ["finance.read", "production.read", "audit.read"];
  if (cleanPath.startsWith("/admin/users") || cleanPath.startsWith("/admin/roles")) return ["users.manage"];
  if (cleanPath.startsWith("/admin/master") || cleanPath.startsWith("/admin/settings")) return ["master.manage"];
  if (cleanPath.startsWith("/admin/audit")) return ["audit.read"];
  if (cleanPath === "/verify") return ["audit.read", "orders.approve"];
  if (cleanPath === "/alerts") return ["orders.read", "production.read", "inventory.read", "quality.read", "dispatch.read"];
  if (cleanPath === "/notifications") return ["orders.read", "production.read", "inventory.read", "quality.read", "dispatch.read", "finance.read", "hr.attendance", "users.manage"];
  return [];
}

export function titleForPath(path: string): string {
  const cleanPath = path.replace(/^\/(owner|supervisor|operator|quality|dispatch|buyer|admin)/, "") || "/";
  const exact = ROUTES.find(([route]) => route === cleanPath);
  if (exact) return exact[1];
  const patterns = ROUTES.filter(([route]) => route.includes(":"));
  const actual = cleanPath.split("/").filter(Boolean);
  const match = patterns.find(([route]) => {
    const expected = route.split("/").filter(Boolean);
    return expected.length === actual.length && expected.every((part, index) => part.startsWith(":") || part === actual[index]);
  });
  if (match) return match[1];
  return cleanPath.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase()) ?? "Dashboard";
}
