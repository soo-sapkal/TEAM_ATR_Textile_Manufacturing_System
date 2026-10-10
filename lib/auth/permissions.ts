import type { DemoUser, Permission } from "@/lib/domain/types";

type Role = { name: string; perms: Permission[]; landing: string };

export const ROLE_PERMISSIONS: Record<string, Role> = {
  ADMIN: { name: "Admin", landing: "/admin/users", perms: ["users.manage", "audit.read", "master.manage"] },
  MANAGER: { name: "Manager", landing: "/dashboard", perms: ["orders.read", "orders.approve", "inventory.read", "production.read", "machines.operate", "quality.read", "dispatch.read", "finance.read", "audit.read"] },
  PLANNER: { name: "Planner", landing: "/production", perms: ["orders.read", "inventory.read", "production.read", "production.plan", "production.assign", "production.record_output", "quality.read", "dispatch.read"] },
  OPERATOR: { name: "Operator", landing: "/my-work", perms: ["production.read", "production.record_output", "machines.operate", "quality.rework"] },
  STOREKEEPER: { name: "Storekeeper", landing: "/inventory", perms: ["inventory.read", "inventory.receive", "inventory.reserve", "inventory.issue", "inventory.adjust_request", "orders.read", "production.read"] },
  INSPECTOR: { name: "Inspector", landing: "/quality", perms: ["quality.read", "quality.inspect", "quality.rework", "quality.release"] },
  DISPATCH: { name: "Dispatch", landing: "/dispatch", perms: ["dispatch.read", "dispatch.create", "dispatch.confirm", "dispatch.reverse", "orders.read", "quality.read"] },
  HR: { name: "HR", landing: "/hr/attendance", perms: ["hr.attendance", "payroll.read", "payroll.draft", "payroll.approve"] },
  FINANCE: { name: "Finance", landing: "/finance", perms: ["finance.read", "finance.write", "finance.approve", "payroll.read", "payroll.approve", "orders.read", "inventory.read"] },
  BUYER: { name: "Buyer", landing: "/portal", perms: ["portal.read"] },
};

export const DEMO_USERS: DemoUser[] = [
  { id: "u-admin", name: "Nisha Menon", email: "admin@everest.demo", roles: ["ADMIN"], permissions: ROLE_PERMISSIONS.ADMIN.perms, landing: "/admin/users" },
  { id: "u-manager", name: "Arun Mehta", email: "manager@everest.demo", roles: ["MANAGER"], permissions: ROLE_PERMISSIONS.MANAGER.perms, landing: "/dashboard" },
  { id: "u-manager-planner", name: "Kavita Rao", email: "planning.manager@everest.demo", roles: ["MANAGER", "PLANNER"], permissions: [...new Set([...ROLE_PERMISSIONS.MANAGER.perms, ...ROLE_PERMISSIONS.PLANNER.perms])], landing: "/dashboard" },
  { id: "u-planner", name: "Sanjay Patil", email: "planner@everest.demo", roles: ["PLANNER"], permissions: ROLE_PERMISSIONS.PLANNER.perms, landing: "/production" },
  { id: "u-operator", name: "Ravi Kumar", email: "operator@everest.demo", roles: ["OPERATOR"], permissions: ROLE_PERMISSIONS.OPERATOR.perms, landing: "/my-work" },
  { id: "u-store", name: "Leela Das", email: "store@everest.demo", roles: ["STOREKEEPER"], permissions: ROLE_PERMISSIONS.STOREKEEPER.perms, landing: "/inventory" },
  { id: "u-inspector", name: "Priya Iyer", email: "inspector@everest.demo", roles: ["INSPECTOR"], permissions: ROLE_PERMISSIONS.INSPECTOR.perms, landing: "/quality" },
  { id: "u-dispatch", name: "Sameer Khan", email: "dispatch@everest.demo", roles: ["DISPATCH"], permissions: ROLE_PERMISSIONS.DISPATCH.perms, landing: "/dispatch" },
  { id: "u-hr", name: "Maya Thomas", email: "hr@everest.demo", roles: ["HR"], permissions: ROLE_PERMISSIONS.HR.perms, landing: "/hr/attendance" },
  { id: "u-finance", name: "Devika Shah", email: "finance@everest.demo", roles: ["FINANCE"], permissions: ROLE_PERMISSIONS.FINANCE.perms, landing: "/finance" },
  { id: "u-buyer", name: "Anita Textiles", email: "buyer@everest.demo", roles: ["BUYER"], permissions: ROLE_PERMISSIONS.BUYER.perms, landing: "/portal", buyerId: "buyer-01" },
];

export function hasPermission(user: DemoUser | null, permission: Permission): boolean {
  return Boolean(user?.permissions.includes(permission));
}

export function hasAnyPermission(user: DemoUser | null, permissions: Permission[] = []): boolean {
  return permissions.length === 0 || permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(user: DemoUser | null, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

export function landingFor(permissions: Permission[]): string {
  if (permissions.includes("portal.read")) return "/portal";
  if (permissions.includes("users.manage")) return "/admin/users";
  if (permissions.includes("hr.attendance")) return "/hr/attendance";
  if (permissions.includes("finance.read")) return "/finance";
  if (permissions.includes("dispatch.read")) return "/dispatch";
  if (permissions.includes("quality.read")) return "/quality";
  if (permissions.includes("production.plan")) return "/production";
  if (permissions.includes("inventory.read")) return "/inventory";
  if (permissions.includes("production.read")) return "/my-work";
  return "/403";
}

export const NAV_SECTIONS: { label: string; items: { label: string; href: string; icon: string; any: Permission[] }[] }[] = [
  { label: "Mill overview", items: [
    { label: "Dashboard", href: "/dashboard", icon: "grid", any: ["orders.read", "production.read", "inventory.read", "quality.read", "dispatch.read", "finance.read"] },
    { label: "My work", href: "/my-work", icon: "work", any: ["production.read"] },
    { label: "Alerts", href: "/alerts", icon: "alert", any: ["orders.read", "production.read", "inventory.read", "quality.read", "dispatch.read"] },
  ] },
  { label: "Make & move", items: [
    { label: "Orders", href: "/orders", icon: "orders", any: ["orders.read"] },
    { label: "Yarn inventory", href: "/inventory", icon: "inventory", any: ["inventory.read"] },
    { label: "Receive yarn", href: "/inventory/receive", icon: "receive", any: ["inventory.receive"] },
    { label: "Production", href: "/production", icon: "production", any: ["production.read"] },
    { label: "Machines", href: "/machines", icon: "machine", any: ["production.read"] },
    { label: "Quality checks", href: "/quality", icon: "quality", any: ["quality.read"] },
    { label: "Rolls", href: "/rolls", icon: "roll", any: ["quality.read"] },
    { label: "Dispatch", href: "/dispatch", icon: "dispatch", any: ["dispatch.read"] },
  ] },
  { label: "Close the books", items: [
    { label: "Finance", href: "/finance", icon: "finance", any: ["finance.read"] },
    { label: "People & payroll", href: "/hr/attendance", icon: "people", any: ["hr.attendance", "payroll.read"] },
    { label: "Reports", href: "/reports", icon: "report", any: ["finance.read", "production.read", "audit.read"] },
  ] },
  { label: "Control room", items: [
    { label: "Admin & master data", href: "/admin/users", icon: "admin", any: ["users.manage", "master.manage"] },
    { label: "Audit trail", href: "/admin/audit", icon: "audit", any: ["audit.read"] },
    { label: "Integrity checks", href: "/verify", icon: "verify", any: ["audit.read", "orders.approve"] },
  ] },
];
