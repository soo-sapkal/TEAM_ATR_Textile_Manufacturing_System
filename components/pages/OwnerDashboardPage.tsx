
"use client";

import { RoleLink as Link } from "@/components/ui/primitives";
import Decimal from "decimal.js";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, CircleDollarSign, Clock3, Factory, LineChart, PackageCheck, Truck, Wrench, BarChart4 } from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { formatCompactMoney, formatDate, formatQty, formatMoney } from "@/lib/domain/format";
import { Card, InfoStrip, Kicker, LinkButton, Meter, PageHeader, StatCard, StatusBadge, Tag } from "@/components/ui/primitives";

export function OwnerDashboardPage() {
  const { data } = useDemo();
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "2-digit", month: "long", timeZone: "Asia/Kolkata" }).format(new Date());
  
  // Financial metrics
  const invoices = data.invoices || [];
  const payments = data.payments || [];
  const supplierBills = data.supplierBills || [];
  const supplierPayments = data.supplierPayments || [];
  
  const totalRevenue = data.orders.reduce((sum, order) => sum.plus(order.revenue), new Decimal(0));
  const cashCollected = payments.reduce((sum, p) => sum.plus(p.amountPaid), new Decimal(0));
  const outstandingAR = invoices.reduce((sum, inv) => sum.plus(inv.amountDue), new Decimal(0)).minus(cashCollected);

  const cashPaidOut = supplierPayments.reduce((sum, p) => sum.plus(p.amountPaid), new Decimal(0));
  const outstandingAP = supplierBills.reduce((sum, bill) => sum.plus(bill.amountDue), new Decimal(0)).minus(cashPaidOut);

  // Financial metrics calculated
  const totalCosts = supplierBills.reduce((sum, bill) => sum.plus(bill.amountDue), new Decimal(0));
  const profitMargin = totalRevenue.gt(0) 
    ? totalRevenue.minus(totalCosts).dividedBy(totalRevenue).times(100) 
    : new Decimal(0);

  // Operations metrics
  const breakdowns = data.machines.filter((machine) => machine.status === "BREAKDOWN");
  const running = data.machines.filter((machine) => machine.status === "RUNNING").length;
  const readyOrders = data.orders.filter((order) => order.displayStatus === "READY_FOR_DISPATCH");
  const openOrders = data.orders.filter((order) => !["CANCELLED", "CLOSED"].includes(order.status));
  const atRisk = data.orders.filter((order) => order.atRisk);
  
  // Production totals
  const totalProduced = data.orders.reduce((sum, order) => sum.plus(order.produced), new Decimal(0));
  const totalOrdered = data.orders.reduce((sum, order) => sum.plus(order.ordered), new Decimal(0));
  const overallProgress = totalOrdered.gt(0) ? totalProduced.dividedBy(totalOrdered).times(100).toNumber() : 0;

  return (
    <>
      <PageHeader
        eyebrow={`Owner Executive View - ${today}`}
        title="Business & Operations Command"
        description="High-level factory performance, financials, and critical bottlenecks. This view is restricted to the Factory Owner."
        actions={<>
          <LinkButton href="/owner/finance" variant="secondary"><BarChart4 size={15}/> Full Financials</LinkButton>
          <LinkButton href="/orders/new" variant="primary">New order <ArrowRight size={15}/></LinkButton>
        </>}
        meta={<><Tag>ALL DIVISIONS</Tag><Tag>REAL-TIME</Tag></>}
      />

      <div className="stat-grid" style={{ marginBottom: "2rem" }}>
        <StatCard 
          label="Total Booked Revenue" 
          value={formatMoney(totalRevenue, "INR")} 
          detail="Total across all current orders" 
          icon={CircleDollarSign} 
          tone="cotton" 
        />
        <StatCard 
          label="Cash Collected" 
          value={formatMoney(cashCollected, "INR")} 
          detail={`${payments.length} receipts cleared`} 
          icon={LineChart} 
          tone="neem" 
        />
        <StatCard 
          label="Outstanding AR" 
          value={formatMoney(outstandingAR, "INR")} 
          detail="Pending from open invoices" 
          icon={CircleDollarSign} 
          tone="turmeric" 
        />
        <StatCard 
          label="Active Output" 
          value={`${formatCompactMoney(totalProduced.toFixed(0))} / ${formatCompactMoney(totalOrdered.toFixed(0))}`} 
          detail={`Overall fulfillment is at ${overallProgress.toFixed(0)}%`} 
          icon={Activity} 
          tone="cotton" 
        />
        <StatCard 
          label="System Health" 
          value={breakdowns.length === 0 && atRisk.length === 0 ? "Optimal" : "Attention"} 
          detail={`${breakdowns.length} down machines, ${atRisk.length} delayed orders`} 
          icon={breakdowns.length === 0 && atRisk.length === 0 ? CheckCircle2 : AlertTriangle} 
          tone={breakdowns.length === 0 && atRisk.length === 0 ? "neem" : "madder"} 
        />
      </div>

      <div className="stat-grid" style={{ marginBottom: "2rem" }}>
        <StatCard 
          label="Cash Paid Out (Suppliers)" 
          value={formatMoney(cashPaidOut, "INR")} 
          detail={`${supplierPayments.length} supplier payments sent`} 
          icon={CircleDollarSign} 
          tone="madder" 
        />
        <StatCard 
          label="Outstanding AP" 
          value={formatMoney(outstandingAP, "INR")} 
          detail="Pending supplier bills" 
          icon={AlertTriangle} 
          tone="indigo" 
        />
      </div>

      <div className="page-grid">
        <Card className="col-7" title="Executive Order Summary" action={<Link href="/owner/orders" className="btn btn--quiet btn--sm">All orders <ArrowRight size={12}/></Link>}>
          <div className="stack-sm">
            {openOrders.slice(0, 5).map((order) => (
              <div className="order-row" key={order.id} style={{ padding: "12px", border: "2px solid #000", borderRadius: "0", background: "var(--bg)", boxShadow: "2px 2px 0 #000" }}>
                <div>
                  <Link className="cell-primary code" href={`/orders/${order.id}`}>{order.code}</Link>
                  <span className="order-row__buyer">{order.buyer}</span>
                </div>
                <div>
                  <div className="num">{formatMoney(order.revenue, order.currency)}</div>
                  <StatusBadge status={order.priority}/>
                </div>
                <Meter value={order.produced} total={order.ordered} unit={order.unit} label="Produced" showNumbers={false} tone={order.atRisk ? "madder" : "indigo"}/>
                <div>
                  <StatusBadge status={order.displayStatus}/>
                  {order.atRisk && <span className="cell-secondary" style={{ color: "var(--madder)" }}>Date at risk</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-5" title="Critical Alerts & Bottlenecks">
          <div className="stack-sm">
            {breakdowns.map((machine) => (
              <Link href={`/owner/machines`} key={machine.id} className="info-strip info-strip--danger" style={{ border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}>
                <Wrench size={17}/>
                <div>
                  <strong>{machine.code} Breakdown - {machine.downtimeMinutes} min downtime</strong>
                  <div>Affecting {machine.orderCode}. Immediate maintenance required.</div>
                </div>
              </Link>
            ))}
            {atRisk.map((order) => (
              <Link href={`/orders/${order.id}`} key={order.id} className="info-strip info-strip--warning" style={{ border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}>
                <Clock3 size={17}/>
                <div>
                  <strong>{order.code} - Delivery at risk</strong>
                  <div>Due {formatDate(order.due)}. Expedite production or resolve shortages.</div>
                </div>
              </Link>
            ))}
            {!breakdowns.length && !atRisk.length && (
              <div style={{ padding: "2rem", textAlign: "center", border: "2px dashed #000", background: "var(--cotton-light)" }}>
                <CheckCircle2 size={32} style={{ margin: "0 auto 1rem", color: "var(--neem)" }} />
                <strong>No critical bottlenecks</strong>
                <p className="cell-secondary">Factory is running smoothly.</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="col-12" title="Department Performance">
          <div className="page-grid">
            <div className="col-4" style={{ padding: "16px", background: "var(--indigo-light)", border: "2px solid #000", boxShadow: "4px 4px 0 #000" }}>
              <Kicker>Production Floor</Kicker>
              <div style={{ fontSize: "2rem", fontWeight: "900", fontFamily: "var(--font-mono)", margin: "8px 0" }}>
                {running} / {data.machines.length}
              </div>
              <span className="cell-secondary" style={{ color: "#000" }}>Machines currently active</span>
              <div style={{ marginTop: "1rem" }}>
                <LinkButton href="/owner/production" variant="secondary" style={{ width: "100%", justifyContent: "center", background: "#fff" }}>View Floor <ArrowRight size={14}/></LinkButton>
              </div>
            </div>

            <div className="col-4" style={{ padding: "16px", background: "var(--turmeric-light)", border: "2px solid #000", boxShadow: "4px 4px 0 #000" }}>
              <Kicker>Supply Chain & Logistics</Kicker>
              <div style={{ fontSize: "2rem", fontWeight: "900", fontFamily: "var(--font-mono)", margin: "8px 0" }}>
                {readyOrders.length} Ready
              </div>
              <span className="cell-secondary" style={{ color: "#000" }}>Orders awaiting dispatch</span>
              <div style={{ marginTop: "1rem" }}>
                <LinkButton href="/owner/dispatch" variant="secondary" style={{ width: "100%", justifyContent: "center", background: "#fff" }}>View Dispatch <ArrowRight size={14}/></LinkButton>
              </div>
            </div>

            <div className="col-4" style={{ padding: "16px", background: "var(--neem-light)", border: "2px solid #000", boxShadow: "4px 4px 0 #000" }}>
              <Kicker>Financial Health</Kicker>
              <div style={{ fontSize: "2rem", fontWeight: "900", fontFamily: "var(--font-mono)", margin: "8px 0", color: "var(--neem-dark)" }}>
                {profitMargin.gt(15) ? "Healthy" : profitMargin.gt(5) ? "Stable" : "Critical"}
              </div>
              <span className="cell-secondary" style={{ color: "#000" }}>Based on projected margins</span>
              <div style={{ marginTop: "1rem" }}>
                <LinkButton href="/owner/finance" variant="secondary" style={{ width: "100%", justifyContent: "center", background: "#fff" }}>View Books <ArrowRight size={14}/></LinkButton>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

