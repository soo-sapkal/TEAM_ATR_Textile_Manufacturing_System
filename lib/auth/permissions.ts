import type { DemoUser, Permission } from "@/lib/domain/types";

type Role = { name: string; perms: Permission[]; landing: string };

export const ROLE_PERMISSIONS: Record<string, Role> = {
  OWNER: { name: "Owner of Factory", landing: "/dashboard", perms: ["users.manage", "audit.read", "master.manage", "orders.read", "orders.approve", "inventory.read", "production.read", "machines.operate", "quality.read", "dispatch.read", "finance.read", "hr.attendance", "payroll.read"] },
  SUPERVISOR: { name: "Supervisor (Factory Incharge)", landing: "/dashboard", perms: ["orders.read", "orders.create", "orders.approve", "inventory.read", "inventory.receive", "production.read", "production.plan", "production.assign", "production.record_output", "machines.operate", "quality.read", "dispatch.read", "finance.read"] },
  MACHINE_OPERATOR: { name: "Machine Operator", landing: "/my-work", perms: ["production.read", "production.record_output", "machines.operate", "quality.rework", "hr.attendance", "payroll.read"] },
  QUALITY_INSPECTOR: { name: "Quality Inspector", landing: "/quality", perms: ["quality.read", "quality.inspect", "quality.rework", "quality.release"] },
  DISPATCH_OFFICER: { name: "Dispatch Officer", landing: "/dispatch", perms: ["dispatch.read", "dispatch.create", "dispatch.confirm", "dispatch.reverse", "orders.read", "quality.read"] },
  BUYER: { name: "Buyer", landing: "/portal", perms: ["portal.read", "orders.create", "orders.read"] },
};

export const DEMO_USERS: DemoUser[] = [
  { id: "u-owner", name: "Nisha Menon (Owner)", email: "owner@everest.demo", roles: ["OWNER"], permissions: ROLE_PERMISSIONS.OWNER.perms, landing: "/dashboard" },
  { id: "u-supervisor", name: "Arun Mehta (Supervisor)", email: "supervisor@everest.demo", roles: ["SUPERVISOR"], permissions: ROLE_PERMISSIONS.SUPERVISOR.perms, landing: "/dashboard" },
  { id: "u-operator-spinning", name: "Ravi Kumar (Spinning Operator)", email: "operator.spinning@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/my-work" },
  { id: "u-operator-weaving", name: "Suresh Patel (Weaving Operator)", email: "operator.weaving@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/my-work" },
  { id: "u-operator-dyeing", name: "Kavita Rao (Dyeing Operator)", email: "operator.dyeing@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/my-work" },
  { id: "u-inspector", name: "Priya Iyer (Quality Inspector)", email: "inspector@everest.demo", roles: ["QUALITY_INSPECTOR"], permissions: ROLE_PERMISSIONS.QUALITY_INSPECTOR.perms, landing: "/quality" },
  { id: "u-dispatch", name: "Sameer Khan (Dispatch Officer)", email: "dispatch@everest.demo", roles: ["DISPATCH_OFFICER"], permissions: ROLE_PERMISSIONS.DISPATCH_OFFICER.perms, landing: "/dispatch" },
  { id: "u-buyer", name: "Anita Textiles (Buyer)", email: "buyer@everest.demo", roles: ["BUYER"], permissions: ROLE_PERMISSIONS.BUYER.perms, landing: "/portal", buyerId: "buyer-01" },
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
    { label: "Factory flow", href: "/factory-flow", icon: "grid", any: ["production.plan", "finance.read"] },
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
