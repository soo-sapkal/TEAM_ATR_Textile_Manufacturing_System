import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminRoute } from "@/components/pages/AdminPages";
import { BackOfficeRoute } from "@/components/pages/BackOfficePages";
import { DashboardPage } from "@/components/pages/DashboardPage";
import { DispatchRoute } from "@/components/pages/DispatchPages";
import { InventoryRoute } from "@/components/pages/InventoryPages";
import { MachineRoute } from "@/components/pages/MachinePages";
import { OrderDetailPage, NewOrderPage, OrdersPage } from "@/components/pages/OrdersPages";
import { ProductionRoute } from "@/components/pages/ProductionPages";
import { QualityRoute } from "@/components/pages/QualityPages";

export default async function StaffPage({ params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params;
  const parts = segments.map((segment) => decodeURIComponent(segment));
  const path = `/${parts.join("/")}`;
  const id = parts.at(-1);
  const orderId = parts[1];
  let content: ReactNode;

  if (path === "/dashboard") content = <DashboardPage/>;
  else if (path === "/orders") content = <OrdersPage/>;
  else if (path === "/orders/new") content = <NewOrderPage/>;
  else if (path.startsWith("/orders/") && orderId) content = <OrderDetailPage id={orderId}/>;
  else if (path.startsWith("/inventory")) content = <InventoryRoute path={path} id={parts[2]}/>;
  else if (path.startsWith("/production") || path === "/my-work") content = <ProductionRoute path={path} id={id}/>;
  else if (path.startsWith("/machines")) content = <MachineRoute path={path} id={id}/>;
  else if (path.startsWith("/quality") || path.startsWith("/rolls") || path === "/scan") content = <QualityRoute path={path} id={id}/>;
  else if (path.startsWith("/dispatch") || path.startsWith("/print/")) content = <DispatchRoute path={path} id={id}/>;
  else if (path.startsWith("/finance/orders/")) content = <BackOfficeRoute path={path} id={parts[2]}/>;
  else if (path.startsWith("/hr/payroll/")) content = <BackOfficeRoute path={path} id={id}/>;
  else if (path.startsWith("/finance") || path.startsWith("/hr") || path.startsWith("/reports") || path === "/verify" || path === "/alerts" || path === "/notifications") content = <BackOfficeRoute path={path} id={id}/>;
  else if (path.startsWith("/admin")) content = <AdminRoute path={path} id={id}/>;
  else notFound();

  return content;
}
