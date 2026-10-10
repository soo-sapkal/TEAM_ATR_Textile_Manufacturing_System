
const fs = require("fs");
let content = fs.readFileSync("lib/auth/permissions.ts", "utf8");

// Add New Order to OWNER sidebar under Production
content = content.replace(
  `{ label: "Orders", href: "/owner/orders", icon: "orders" },`,
  `{ label: "Orders", href: "/owner/orders", icon: "orders" },\n        { label: "New Order", href: "/owner/orders/new", icon: "plus" },`
);

// Add New Order to SUPERVISOR sidebar under Production
content = content.replace(
  `{ label: "Orders", href: "/supervisor/orders", icon: "orders" },`,
  `{ label: "Orders", href: "/supervisor/orders", icon: "orders" },\n        { label: "New Order", href: "/supervisor/orders/new", icon: "plus" },`
);

// Add Product Catalog to BUYER sidebar under Purchasing
content = content.replace(
  `{ label: "Track Orders", href: "/buyer/orders", icon: "orders" },`,
  `{ label: "Product Catalog", href: "/products", icon: "box" },\n        { label: "Track Orders", href: "/buyer/orders", icon: "orders" },`
);

fs.writeFileSync("lib/auth/permissions.ts", content);

