import type { Permission } from "@/lib/domain/types";
import { ROUTES } from "@/lib/routes";

export function requiredPermissions(path: string): Permission[] {
  if (path === "/dashboard") return ["orders.read", "production.read", "inventory.read", "quality.read", "dispatch.read", "finance.read", "hr.attendance", "users.manage"];
  if (path === "/my-work") return ["production.read"];
  if (path.startsWith("/orders/new")) return ["orders.create"];
  if (path.startsWith("/orders")) return ["orders.read"];
  if (path.startsWith("/inventory/receive")) return ["inventory.receive"];
  if (path.startsWith("/inventory")) return ["inventory.read"];
  if (path.startsWith("/production/operations")) return ["production.read"];
  if (path.startsWith("/production")) return ["production.read"];
  if (path.startsWith("/machines")) return ["production.read"];
  if (path.startsWith("/quality/inspect")) return ["quality.inspect"];
  if (path.startsWith("/quality/rework")) return ["quality.read", "quality.rework"];
  if (path.startsWith("/quality") || path.startsWith("/rolls") || path === "/scan") return ["quality.read"];
  if (path === "/dispatch/new") return ["dispatch.create"];
  if (path.startsWith("/print/dispatch/")) return ["dispatch.read"];
  if (path.startsWith("/print/roll-tag/")) return ["quality.read"];
  if (path.startsWith("/dispatch")) return ["dispatch.read"];
  if (path.startsWith("/finance")) return ["finance.read"];
  if (path.startsWith("/hr/attendance")) return ["hr.attendance"];
  if (path.startsWith("/hr/payroll")) return ["payroll.read"];
  if (path.startsWith("/hr")) return ["hr.attendance"];
  if (path.startsWith("/reports/month-close")) return ["finance.read"];
  if (path.startsWith("/reports")) return ["finance.read", "production.read", "audit.read"];
  if (path.startsWith("/admin/users") || path.startsWith("/admin/roles")) return ["users.manage"];
  if (path.startsWith("/admin/master") || path.startsWith("/admin/settings")) return ["master.manage"];
  if (path.startsWith("/admin/audit")) return ["audit.read"];
  if (path === "/verify") return ["audit.read", "orders.approve"];
  if (path === "/alerts") return ["orders.read", "production.read", "inventory.read", "quality.read", "dispatch.read"];
  if (path === "/notifications") return ["orders.read", "production.read", "inventory.read", "quality.read", "dispatch.read", "finance.read", "hr.attendance", "users.manage"];
  return [];
}

export function titleForPath(path: string): string {
  const exact = ROUTES.find(([route]) => route === path);
  if (exact) return exact[1];
  const patterns = ROUTES.filter(([route]) => route.includes(":"));
  const actual = path.split("/").filter(Boolean);
  const match = patterns.find(([route]) => {
    const expected = route.split("/").filter(Boolean);
    return expected.length === actual.length && expected.every((part, index) => part.startsWith(":") || part === actual[index]);
  });
  if (match) return match[1];
  return path.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase()) ?? "Dashboard";
}
