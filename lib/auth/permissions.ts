import type { DemoUser, Permission } from "@/lib/domain/types";

type Role = { name: string; perms: Permission[]; landing: string };

export const ROLE_PERMISSIONS: Record<string, Role> = {
  OWNER: { name: "Owner of Factory", landing: "/dashboard", perms: ["users.manage", "audit.read", "master.manage", "orders.read", "orders.approve", "inventory.read", "production.read", "machines.operate", "quality.read", "dispatch.read", "finance.read", "hr.attendance", "payroll.read"] },
  SUPERVISOR: { name: "Supervisor (Factory Incharge)", landing: "/dashboard", perms: ["orders.read", "orders.create", "orders.approve", "inventory.read", "inventory.receive", "production.read", "production.plan", "production.assign", "production.record_output", "machines.operate", "quality.read", "dispatch.read", "finance.read"] },
  MACHINE_OPERATOR: { name: "Machine Operator", landing: "/my-work", perms: ["production.read", "production.record_output", "machines.operate", "quality.rework", "hr.attendance", "payroll.read"] },
  QUALITY_INSPECTOR: { name: "Quality Inspector", landing: "/quality", perms: ["quality.read", "quality.inspect", "quality.rework", "quality.release"] },
  DISPATCH_OFFICER: { name: "Dispatch Officer", landing: "/dispatch", perms: ["dispatch.read", "dispatch.create", "dispatch.confirm", "dispatch.reverse", "orders.read", "quality.read"] },
  BUYER: { name: "Buyer", landing: "/buyer/dashboard", perms: ["portal.read", "orders.create", "orders.read"] },
};

export const DEMO_USERS: DemoUser[] = [
  { id: "u-owner", name: "Nisha Menon (Owner)", email: "owner@everest.demo", roles: ["OWNER"], permissions: ROLE_PERMISSIONS.OWNER.perms, landing: "/dashboard" },
  { id: "u-supervisor", name: "Arun Mehta (Supervisor)", email: "supervisor@everest.demo", roles: ["SUPERVISOR"], permissions: ROLE_PERMISSIONS.SUPERVISOR.perms, landing: "/dashboard" },
  { id: "u-operator-spinning", name: "Ravi Kumar (Spinning Operator)", email: "operator@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/my-work" },
  { id: "u-operator-weaving", name: "Suresh Patel (Weaving Operator)", email: "operator@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/my-work" },
  { id: "u-operator-dyeing", name: "Kavita Rao (Dyeing Operator)", email: "operator@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/my-work" },
  { id: "u-inspector", name: "Priya Iyer (Quality Inspector)", email: "inspector@everest.demo", roles: ["QUALITY_INSPECTOR"], permissions: ROLE_PERMISSIONS.QUALITY_INSPECTOR.perms, landing: "/quality" },
  { id: "u-dispatch", name: "Sameer Khan (Dispatch Officer)", email: "dispatch@everest.demo", roles: ["DISPATCH_OFFICER"], permissions: ROLE_PERMISSIONS.DISPATCH_OFFICER.perms, landing: "/dispatch" },
  { id: "u-buyer", name: "Anita Textiles (Buyer)", email: "buyer@everest.demo", roles: ["BUYER"], permissions: ROLE_PERMISSIONS.BUYER.perms, landing: "/buyer/dashboard", buyerId: "buyer-01" },
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
  if (permissions.includes("portal.read")) return "/buyer/dashboard";
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

export const UNIVERSAL_NAVIGATION = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "grid", any: [] }
    ]
  },
  {
    label: "Production",
    items: [
      { label: "Orders", href: "/orders", icon: "orders", any: ["orders.read"] },
      { label: "New Order", href: "/orders/new", icon: "plus", any: ["orders.create"] },
      { label: "Plan & Assign", href: "/production", icon: "production", any: ["production.read"] },
      { label: "Active Tasks", href: "/operator/tasks", icon: "work", any: ["production.record_output"] },
      { label: "Factory Flow", href: "/factory-flow", icon: "grid", any: ["production.read"] }
    ]
  },
  {
    label: "Assets",
    items: [
      { label: "Product Master", href: "/products", icon: "box", any: ["master.manage", "orders.create", "portal.read"] },
      { label: "Inventory", href: "/inventory", icon: "inventory", any: ["inventory.read"] },
      { label: "Machines", href: "/machines", icon: "machine", any: ["production.read", "machines.operate"] }
    ]
  },
  {
    label: "Logistics",
    items: [
      { label: "Dispatch Dashboard", href: "/dispatch", icon: "grid", any: ["dispatch.read"] },
      { label: "Final QC Scan", href: "/dispatch/scan", icon: "scan", any: ["dispatch.confirm"] }
    ]
  },
  {
    label: "Inspections",
    items: [
      { label: "Quality Dashboard", href: "/quality", icon: "grid", any: ["quality.read"] },
      { label: "Scan Roll", href: "/quality/scan", icon: "scan", any: ["quality.inspect"] }
    ]
  },
  {
    label: "Financials & HR",
    items: [
      { label: "Finance & Payroll", href: "/finance", icon: "finance", any: ["finance.read", "payroll.read"] },
      { label: "HR & Leaves", href: "/operator/hr", icon: "people", any: ["hr.attendance"] }
    ]
  },
  {
    label: "Purchasing",
    items: [
      { label: "Buyer Dashboard", href: "/buyer/dashboard", icon: "grid", any: ["portal.read"] },
      { label: "Product Catalog", href: "/products", icon: "box", any: ["portal.read", "master.manage"] },
      { label: "Track Orders", href: "/buyer/orders", icon: "orders", any: ["portal.read"] },
      { label: "New Order", href: "/buyer/orders/new", icon: "plus", any: ["portal.read", "orders.create"] }
    ]
  }
];

export const ROLE_NAVIGATION: Record<string, { label: string; items: { label: string; href: string; icon: string; any?: Permission[] }[] }[]> = {
  OWNER: [
    { label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: "grid" }] },
    { label: "Production", items: [
      { label: "Orders", href: "/orders", icon: "orders" },
      { label: "New Order", href: "/orders/new", icon: "plus" },
      { label: "Plan & Assign", href: "/production", icon: "production" },
      { label: "Factory Flow", href: "/factory-flow", icon: "grid" }
    ] },
    { label: "Assets", items: [
      { label: "Product Master", href: "/products", icon: "box" },
      { label: "Inventory", href: "/inventory", icon: "inventory" },
      { label: "Machines", href: "/machines", icon: "machine" }
    ] },
    { label: "Logistics", items: [
      { label: "Dispatch Dashboard", href: "/dispatch", icon: "grid" }
    ] },
    { label: "Financials", items: [{ label: "Finance & Payroll", href: "/finance", icon: "finance" }] }
  ],
  SUPERVISOR: [
    { label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: "grid" }] },
    { label: "Production", items: [
      { label: "Orders", href: "/orders", icon: "orders" },
      { label: "New Order", href: "/orders/new", icon: "plus" },
      { label: "Plan & Assign", href: "/production", icon: "production" },
      { label: "Factory Flow", href: "/factory-flow", icon: "grid" }
    ] },
    { label: "Assets", items: [
      { label: "Product Master", href: "/products", icon: "box" },
      { label: "Inventory", href: "/inventory", icon: "inventory" },
      { label: "Machines", href: "/machines", icon: "machine" }
    ] },
    { label: "Logistics", items: [
      { label: "Dispatch Dashboard", href: "/dispatch", icon: "grid" }
    ] }
  ],
  MACHINE_OPERATOR: [
    { label: "My Shift", items: [
      { label: "Active Tasks", href: "/operator/tasks", icon: "work" }
    ] },
    { label: "Personal", items: [{ label: "HR & Leaves", href: "/operator/hr", icon: "people" }] }
  ],
  DISPATCH_OFFICER: [
    { label: "Logistics", items: [
      { label: "Dispatch Dashboard", href: "/dispatch", icon: "grid" },
      { label: "Final QC Scan", href: "/dispatch/scan", icon: "scan" }
    ] }
  ],
  QUALITY_INSPECTOR: [
    { label: "Inspections", items: [
      { label: "Quality Dashboard", href: "/quality", icon: "grid" },
      { label: "Scan Roll", href: "/quality/scan", icon: "scan" }
    ] }
  ],
  BUYER: [
    { label: "Purchasing", items: [
      { label: "Buyer Dashboard", href: "/buyer/dashboard", icon: "grid" },
      { label: "Product Catalog", href: "/products", icon: "box" },
      { label: "Track Orders", href: "/buyer/orders", icon: "orders" },
      { label: "New Order", href: "/buyer/orders/new", icon: "plus" }
    ] }
  ]
};
