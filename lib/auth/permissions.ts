import type { DemoUser, Permission } from "@/lib/domain/types";

type Role = { name: string; perms: Permission[]; landing: string };

export const ROLE_PERMISSIONS: Record<string, Role> = {
  OWNER: { name: "Owner of Factory", landing: "/dashboard", perms: ["users.manage", "audit.read", "master.manage", "orders.read", "orders.approve", "inventory.read", "production.read", "machines.operate", "quality.read", "dispatch.read", "finance.read", "hr.attendance", "payroll.read"] },
  SUPERVISOR: { name: "Supervisor (Factory Incharge)", landing: "/dashboard", perms: ["orders.read", "orders.create", "orders.approve", "inventory.read", "inventory.receive", "production.read", "production.plan", "production.assign", "production.record_output", "machines.operate", "quality.read", "dispatch.read"] },
  MACHINE_OPERATOR: { name: "Machine Operator", landing: "/operator/dashboard", perms: ["production.read", "production.record_output", "machines.operate", "quality.rework", "hr.attendance", "payroll.read"] },
  QUALITY_INSPECTOR: { name: "Quality Inspector", landing: "/quality", perms: ["quality.read", "quality.inspect", "quality.rework", "quality.release", "orders.read", "inventory.read"] },
  DISPATCH_OFFICER: { name: "Dispatch Officer", landing: "/dispatch", perms: ["dispatch.read", "dispatch.create", "dispatch.confirm", "dispatch.reverse", "orders.read", "quality.read"] },
  BUYER: { name: "Buyer", landing: "/buyer/dashboard", perms: ["portal.read", "orders.create", "orders.read"] },
};

export const DEMO_USERS: DemoUser[] = [
  { id: "u-owner", name: "Nisha Menon (Owner)", email: "owner@everest.demo", roles: ["OWNER"], permissions: ROLE_PERMISSIONS.OWNER.perms, landing: "/dashboard" },
  { id: "u-supervisor", name: "Arun Mehta (Supervisor)", email: "supervisor@everest.demo", roles: ["SUPERVISOR"], permissions: ROLE_PERMISSIONS.SUPERVISOR.perms, landing: "/dashboard" },
  { id: "u-op-spin-1", name: "Amit Sharma (Spinning Operator 1)", email: "op.spin.1@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-spin-2", name: "Raj Verma (Spinning Operator 2)", email: "op.spin.2@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-spin-3", name: "Sunil Singh (Spinning Operator 3)", email: "op.spin.3@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-spin-4", name: "Vijay Yadav (Spinning Operator 4)", email: "op.spin.4@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-spin-5", name: "Rahul Gupta (Spinning Operator 5)", email: "op.spin.5@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-spin-6", name: "Anil Mishra (Spinning Operator 6)", email: "op.spin.6@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-spin-7", name: "Sanjay Pandey (Spinning Operator 7)", email: "op.spin.7@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-spin-8", name: "Vikram Tiwari (Spinning Operator 8)", email: "op.spin.8@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-spin-9", name: "Prakash Das (Spinning Operator 9)", email: "op.spin.9@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-spin-10", name: "Ajay Kumar (Spinning Operator 10)", email: "op.spin.10@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-weav-1", name: "Sharma Amit (Weaving Operator 1)", email: "op.weav.1@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-weav-2", name: "Verma Raj (Weaving Operator 2)", email: "op.weav.2@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-weav-3", name: "Singh Sunil (Weaving Operator 3)", email: "op.weav.3@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-weav-4", name: "Yadav Vijay (Weaving Operator 4)", email: "op.weav.4@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-weav-5", name: "Gupta Rahul (Weaving Operator 5)", email: "op.weav.5@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-weav-6", name: "Mishra Anil (Weaving Operator 6)", email: "op.weav.6@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-weav-7", name: "Pandey Sanjay (Weaving Operator 7)", email: "op.weav.7@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-weav-8", name: "Tiwari Vikram (Weaving Operator 8)", email: "op.weav.8@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-weav-9", name: "Das Prakash (Weaving Operator 9)", email: "op.weav.9@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-weav-10", name: "Kumar Ajay (Weaving Operator 10)", email: "op.weav.10@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-dye-1", name: "Ajay Sharma (Dyeing Operator 1)", email: "op.dye.1@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-dye-2", name: "Prakash Verma (Dyeing Operator 2)", email: "op.dye.2@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-dye-3", name: "Vikram Singh (Dyeing Operator 3)", email: "op.dye.3@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-dye-4", name: "Sanjay Yadav (Dyeing Operator 4)", email: "op.dye.4@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-dye-5", name: "Anil Gupta (Dyeing Operator 5)", email: "op.dye.5@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-dye-6", name: "Rahul Mishra (Dyeing Operator 6)", email: "op.dye.6@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-dye-7", name: "Vijay Pandey (Dyeing Operator 7)", email: "op.dye.7@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-dye-8", name: "Sunil Tiwari (Dyeing Operator 8)", email: "op.dye.8@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-dye-9", name: "Raj Das (Dyeing Operator 9)", email: "op.dye.9@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-op-dye-10", name: "Amit Kumar (Dyeing Operator 10)", email: "op.dye.10@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-operator-spinning", name: "Ravi Kumar (Spinning Operator)", email: "operator@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-operator-weaving", name: "Suresh Patel (Weaving Operator)", email: "operator@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
  { id: "u-operator-dyeing", name: "Kavita Rao (Dyeing Operator)", email: "operator@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/operator/dashboard" },
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
      { label: "Dispatch Dashboard", href: "/dispatch", icon: "grid", any: ["dispatch.read"] }
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
    { label: "Overview", items: [{ label: "Dashboard", href: "/owner/dashboard", icon: "grid" }] },
    { label: "Production", items: [
      { label: "Orders", href: "/owner/orders", icon: "orders" },
      { label: "New Order", href: "/owner/orders/new", icon: "plus" },
      { label: "Plan & Assign", href: "/owner/production", icon: "production" },
      { label: "Factory Flow", href: "/owner/factory-flow", icon: "grid" }
    ] },
    { label: "Assets", items: [
      { label: "Product Master", href: "/owner/products", icon: "box" },
      { label: "Inventory", href: "/owner/inventory", icon: "inventory" },
      { label: "Machines", href: "/owner/machines", icon: "machine" }
    ] },
    { label: "Logistics", items: [
      { label: "Dispatch Dashboard", href: "/owner/dispatch", icon: "grid" }
    ] },
    { label: "Financials", items: [{ label: "Finance & Payroll", href: "/owner/finance", icon: "finance" }] }
  ],
  SUPERVISOR: [
    { label: "Overview", items: [{ label: "Dashboard", href: "/supervisor/dashboard", icon: "grid" }] },
    { label: "Production", items: [
      { label: "Orders", href: "/supervisor/orders", icon: "orders" },
      { label: "New Order", href: "/supervisor/orders/new", icon: "plus" },
      { label: "Plan & Assign", href: "/supervisor/production", icon: "production" },
      { label: "Factory Flow", href: "/supervisor/factory-flow", icon: "grid" }
    ] },
    { label: "Assets", items: [
      { label: "Product Master", href: "/supervisor/products", icon: "box" },
      { label: "Inventory", href: "/supervisor/inventory", icon: "inventory" },
      { label: "Machines", href: "/supervisor/machines", icon: "machine" }
    ] },
    { label: "Logistics", items: [
      { label: "Dispatch Dashboard", href: "/supervisor/dispatch", icon: "grid" }
    ] }
  ],
  MACHINE_OPERATOR: [
    { label: "Overview", items: [{ label: "Dashboard", href: "/operator/dashboard", icon: "grid" }] },
    { label: "Personal", items: [{ label: "HR & Leaves", href: "/operator/hr", icon: "people" }] }
  ],
  DISPATCH_OFFICER: [
    { label: "Logistics", items: [
      { label: "Dispatch Dashboard", href: "/dispatch/dashboard", icon: "grid" },
      { label: "Active & Pending Orders", href: "/dispatch/orders", icon: "orders" },
      { label: "Finished Goods (Shelf)", href: "/dispatch/stock", icon: "package" }
    ] }
  ],
  QUALITY_INSPECTOR: [
    { label: "Inspections", items: [
      { label: "Quality Dashboard", href: "/quality/dashboard", icon: "grid" },
      { label: "Scan Roll", href: "/quality/scan", icon: "scan" },
      { label: "Orders", href: "/quality/orders", icon: "orders" },
    ] }
  ],
  BUYER: [
    { label: "Purchasing", items: [
      { label: "Buyer Dashboard", href: "/buyer/dashboard", icon: "grid" },
      { label: "Product Catalog", href: "/buyer/products", icon: "box" },
      { label: "Track Orders", href: "/buyer/orders", icon: "orders" },
      { label: "New Order", href: "/buyer/orders/new", icon: "plus" }
    ] }
  ]
};
