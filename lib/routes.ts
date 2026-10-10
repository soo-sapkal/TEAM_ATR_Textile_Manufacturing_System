export const ROUTES = [
  ["/", "The Gate"], ["/login", "Sign in"], ["/403", "Access denied"], ["/offline", "Offline"],
  ["/dashboard", "Mill dashboard"], ["/my-work", "My work"], ["/alerts", "Alerts"], ["/notifications", "Notifications"],
  ["/inventory", "Yarn inventory"], ["/inventory/receive", "Receive yarn"], ["/inventory/batches/:id", "Yarn batch"], ["/inventory/reservations", "Reservations"], ["/inventory/adjustments", "Stock adjustments"], ["/inventory/movements", "Yarn ledger"],
  ["/orders", "Orders"], ["/orders/new", "New order"], ["/orders/:id", "Order command page"],
  ["/production", "Production board"], ["/production/plans/:id", "Production plan"], ["/production/operations/:id", "Operation console"], ["/production/shift-summary", "Shift summary"],
  ["/machines", "Machine board"], ["/machines/:id", "Machine detail"],
  ["/quality", "Inspection queue"], ["/quality/inspect/:code", "Inspect a roll"], ["/quality/rework", "Rework"], ["/quality/defects", "Defect analytics"],
  ["/rolls", "Rolls"], ["/rolls/:code", "Roll passport"], ["/scan", "Scan a roll"], ["/r/:token", "QR roll lookup"],
  ["/dispatch", "Dispatch"], ["/dispatch/new", "New shipment"], ["/dispatch/:id", "Load the truck"], ["/dispatch/stock", "Finished stock"], ["/print/dispatch/:id", "Dispatch note"], ["/print/roll-tag/:id", "Roll tag"],
  ["/finance", "Finance"], ["/finance/orders/:id", "Order cost"], ["/finance/entries", "Cost entries"], ["/finance/payments", "Buyer payments"], ["/finance/expenses", "Expenses"],
  ["/hr/attendance", "Attendance"], ["/hr/payroll", "Payroll periods"], ["/hr/payroll/:id", "Payroll period"],
  ["/reports", "Reports"], ["/reports/month-close", "Month close"], ["/verify", "Integrity checks"],
  ["/admin/users", "Users"], ["/admin/roles", "Roles & permissions"], ["/admin/master/:resource", "Master data"], ["/admin/settings", "Mill settings"], ["/admin/audit", "Audit trail"],
  ["/portal", "My orders"], ["/portal/orders/:id", "Order tracker"],
] as const;

export const ROUTE_TITLES = new Map<string, string>(ROUTES.map(([path, title]) => [path, title]));
