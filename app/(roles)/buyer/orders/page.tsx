"use client";

import { useDemo } from "@/lib/demo/context";
import { formatDate, formatQty } from "@/lib/domain/format";
import { Card, DataTable, PageHeader, StatusBadge, Meter, LinkButton } from "@/components/ui/primitives";
import { Plus } from "lucide-react";

export default function BuyerOrdersPage() {
  const { data } = useDemo();
  
  // In a real application, we would filter by `order.buyerId === user.id`.
  // For this demo, we'll just mock it by showing a subset of orders.
  const myOrders = data.orders.slice(0, 4);

  return (
    <>
      <PageHeader 
        eyebrow="Purchasing Portal" 
        title="My Orders" 
        description="Track the real-time manufacturing progress of your textiles." 
        actions={
          <LinkButton href="/buyer/orders/new" variant="primary">
            <Plus size={15}/> Place New Order
          </LinkButton>
        }
      />
      <div className="stat-grid">
        <div className="stat-card stat-card--indigo">
          <div className="stat-card__top">Active Orders</div>
          <strong>{myOrders.length}</strong>
        </div>
        <div className="stat-card stat-card--neem">
          <div className="stat-card__top">Ready for Dispatch</div>
          <strong>{myOrders.filter(o => o.displayStatus === "READY_FOR_DISPATCH").length}</strong>
        </div>
      </div>
      <Card className="card--table" title="Order Tracking">
        <DataTable 
          headers={["Order ID", "Product", "Due Date", "Progress", "Status"]} 
          rows={myOrders.map(order => [
            <span className="cell-primary code" key="code">{order.code}</span>,
            <div key="product">
              <span className="cell-primary" style={{ display: "block" }}>{order.product}</span>
              <span className="cell-secondary">{order.colour}</span>
            </div>,
            <span className="cell-primary" key="due">{formatDate(order.due)}</span>,
            <div key="progress" style={{ minWidth: 120 }}>
              <Meter value={order.produced} total={order.ordered} showNumbers={false} />
              <span className="cell-secondary num" style={{ fontSize: 10, marginTop: 4, display: "block" }}>
                {formatQty(order.produced, order.unit, 0)} / {formatQty(order.ordered, order.unit, 0)}
              </span>
            </div>,
            <StatusBadge key="status" status={order.displayStatus} />
          ])} 
        />
      </Card>
    </>
  );
}
