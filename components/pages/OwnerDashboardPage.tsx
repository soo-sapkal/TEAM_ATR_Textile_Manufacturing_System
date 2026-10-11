"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { RoleLink as Link } from "@/components/ui/primitives";
import Decimal from "decimal.js";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Factory,
  LineChart,
  PackageCheck,
  Truck,
  Wrench,
  BarChart4,
  Receipt
} from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { formatCompactMoney, formatDate, formatQty, formatMoney } from "@/lib/domain/format";
import {
  Card,
  DataTable,
  EmptyState,
  InfoStrip,
  Kicker,
  LinkButton,
  Meter,
  PageHeader,
  StatCard,
  StatusBadge,
  Tag
} from "@/components/ui/primitives";

export function OwnerDashboardPage() {
  const { data } = useDemo();
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "Asia/Kolkata"
  }).format(new Date());

  // Financial metrics
  const invoices = data.invoices || [];
  const payments = data.payments || [];
  const supplierBills = data.supplierBills || [];
  const supplierPayments = data.supplierPayments || [];

  const totalRevenue = data.orders.reduce(
    (sum, order) => sum.plus(order.revenue),
    new Decimal(0)
  );
  const cashCollected = payments.reduce(
    (sum, p) => sum.plus(p.amountPaid),
    new Decimal(0)
  );
  const outstandingAR = invoices
    .reduce((sum, inv) => sum.plus(inv.amountDue), new Decimal(0))
    .minus(cashCollected);

  const cashPaidOut = supplierPayments.reduce(
    (sum, p) => sum.plus(p.amountPaid),
    new Decimal(0)
  );
  const outstandingAP = supplierBills
    .reduce((sum, bill) => sum.plus(bill.amountDue), new Decimal(0))
    .minus(cashPaidOut);

  // Financial metrics calculated
  const totalCosts = supplierBills.reduce(
    (sum, bill) => sum.plus(bill.amountDue),
    new Decimal(0)
  );
  const profitMargin = totalRevenue.gt(0)
    ? totalRevenue.minus(totalCosts).dividedBy(totalRevenue).times(100)
    : new Decimal(0);

  // Operations metrics
  const breakdowns = data.machines.filter((machine) => machine.status === "BREAKDOWN");
  const running = data.machines.filter((machine) => machine.status === "RUNNING").length;
  const readyOrders = data.orders.filter(
    (order) => order.displayStatus === "READY_FOR_DISPATCH"
  );
  const openOrders = data.orders.filter(
    (order) => !["CANCELLED", "CLOSED"].includes(order.status)
  );
  const atRisk = data.orders.filter((order) => order.atRisk);

  // Production totals
  const totalProduced = data.orders.reduce(
    (sum, order) => sum.plus(order.produced),
    new Decimal(0)
  );
  const totalOrdered = data.orders.reduce(
    (sum, order) => sum.plus(order.ordered),
    new Decimal(0)
  );
  const overallProgress = totalOrdered.gt(0)
    ? totalProduced.dividedBy(totalOrdered).times(100).toNumber()
    : 0;

  return (
    <>
      <PageHeader
        eyebrow={`Owner Executive View · ${today}`}
        title="Business & Operations Command"
        description="High-level factory performance, financials, commercial contracts, and critical bottlenecks. Executive view tailored for Mill Leadership."
        actions={
          <>
            <LinkButton href="/owner/finance" variant="secondary">
              <BarChart4 size={15} /> Full Financials
            </LinkButton>
            <LinkButton href="/orders/new" variant="primary">
              New order <ArrowRight size={15} />
            </LinkButton>
          </>
        }
        meta={
          <>
            <Tag>ALL DIVISIONS</Tag>
            <Tag>EXECUTIVE CONTROLS</Tag>
            <Tag>REAL-TIME</Tag>
          </>
        }
      />

      {/* Primary Financial & Operational KPIs */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="Total Booked Revenue"
          value={formatMoney(totalRevenue, "INR")}
          detail="Total contract value across orders"
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
          label="Outstanding Receivables (AR)"
          value={formatMoney(outstandingAR, "INR")}
          detail="Pending from customer invoices"
          icon={CircleDollarSign}
          tone="turmeric"
        />
        <StatCard
          label="Fulfillment Progress"
          value={`${overallProgress.toFixed(0)}% Output`}
          detail={`${formatCompactMoney(totalProduced.toFixed(0))} / ${formatCompactMoney(
            totalOrdered.toFixed(0)
          )} M`}
          icon={Activity}
          tone="cotton"
        />
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="Cash Paid Out (Suppliers)"
          value={formatMoney(cashPaidOut, "INR")}
          detail={`${supplierPayments.length} supplier payments sent`}
          icon={CircleDollarSign}
          tone="madder"
        />
        <StatCard
          label="Outstanding Payables (AP)"
          value={formatMoney(outstandingAP, "INR")}
          detail="Pending supplier yarn bills"
          icon={AlertTriangle}
          tone="indigo"
        />
        <StatCard
          label="Operational Margin"
          value={`${profitMargin.toFixed(1)}%`}
          detail={profitMargin.gt(15) ? "Healthy profitability" : "Watch raw material costs"}
          icon={BarChart4}
          tone={profitMargin.gt(15) ? "neem" : "turmeric"}
        />
        <StatCard
          label="Factory Health"
          value={
            breakdowns.length === 0 && atRisk.length === 0 ? "Optimal" : "Attention"
          }
          detail={`${breakdowns.length} down machines, ${atRisk.length} delayed orders`}
          icon={breakdowns.length === 0 && atRisk.length === 0 ? CheckCircle2 : AlertTriangle}
          tone={breakdowns.length === 0 && atRisk.length === 0 ? "neem" : "madder"}
        />
      </div>

      <div className="page-grid">
        {/* Executive Order Summary Table */}
        <Card
          className="col-8 card--table"
          title="Executive Order Summary"
          action={
            <Link href="/owner/orders" className="btn btn--quiet btn--sm">
              All orders <ArrowRight size={12} />
            </Link>
          }
        >
          <DataTable
            headers={[
              "Order / Buyer",
              "Revenue",
              "Due Date",
              "Production Progress",
              "Priority",
              "Status",
              "Action"
            ]}
            rows={openOrders.slice(0, 7).map((order) => [
              <div>
                <Link
                  className="cell-primary code"
                  href={`/orders/${order.id}`}
                  style={{ fontWeight: 800 }}
                >
                  {order.code}
                </Link>
                <span className="cell-secondary">{order.buyer}</span>
              </div>,
              <div>
                <strong className="num" style={{ fontWeight: 800 }}>
                  {formatMoney(order.revenue, order.currency)}
                </strong>
                <span className="cell-secondary">
                  {formatQty(order.ordered, order.unit, 0)} commitment
                </span>
              </div>,
              <div>
                <span>{formatDate(order.due)}</span>
                {order.atRisk && (
                  <span
                    className="cell-secondary"
                    style={{ color: "var(--madder)", fontWeight: 700 }}
                  >
                    At risk
                  </span>
                )}
              </div>,
              <div style={{ minWidth: 140 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    marginBottom: 2
                  }}
                >
                  <span style={{ fontWeight: 700 }}>
                    {formatQty(order.produced, order.unit, 0)}
                  </span>
                  <span style={{ color: "#666" }}>
                    / {formatQty(order.ordered, order.unit, 0)}
                  </span>
                </div>
                <Meter
                  value={order.produced}
                  total={order.ordered}
                  unit={order.unit}
                  showNumbers={false}
                  tone={order.atRisk ? "madder" : "indigo"}
                />
              </div>,
              <StatusBadge status={order.priority} />,
              <StatusBadge status={order.displayStatus} />,
              <Link
                href={`/orders/${order.id}`}
                className="btn btn--secondary btn--sm"
                style={{ fontWeight: 700 }}
              >
                View <ArrowRight size={12} />
              </Link>
            ])}
            empty={
              <EmptyState
                title="No active commitments"
                detail="All client contracts have been closed."
              />
            }
          />
        </Card>

        {/* Critical Alerts & Bottlenecks */}
        <Card className="col-4" title="Critical Bottlenecks & Exceptions">
          <div className="stack-sm">
            {breakdowns.map((machine) => (
              <Link
                href={`/owner/machines`}
                key={machine.id}
                className="info-strip info-strip--danger"
                style={{
                  margin: 0,
                  border: "2px solid #000",
                  boxShadow: "2px 2px 0 #000"
                }}
              >
                <Wrench size={17} />
                <div>
                  <strong>
                    {machine.code} Breakdown · {machine.downtimeMinutes} min downtime
                  </strong>
                  <div>Affecting {machine.orderCode}. Maintenance team dispatched.</div>
                </div>
              </Link>
            ))}

            {atRisk.map((order) => (
              <Link
                href={`/orders/${order.id}`}
                key={order.id}
                className="info-strip info-strip--warning"
                style={{
                  margin: 0,
                  border: "2px solid #000",
                  boxShadow: "2px 2px 0 #000"
                }}
              >
                <Clock3 size={17} />
                <div>
                  <strong>{order.code} · Delivery At Risk</strong>
                  <div>Due {formatDate(order.due)}. Expedite or review yarn supply.</div>
                </div>
              </Link>
            ))}

            {!breakdowns.length && !atRisk.length && (
              <div
                style={{
                  padding: "1.5rem",
                  textAlign: "center",
                  border: "2px dashed #000",
                  background: "var(--cotton-light)"
                }}
              >
                <CheckCircle2
                  size={30}
                  style={{ margin: "0 auto 8px", color: "var(--neem)" }}
                />
                <strong style={{ display: "block" }}>No Critical Bottlenecks</strong>
                <p className="cell-secondary">Factory operations running smoothly.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Invoices & Collections Table */}
        {invoices.length > 0 && (
          <Card
            className="col-12 card--table"
            title="Recent Commercial Invoices & Customer Billing"
            action={
              <Link href="/owner/finance" className="btn btn--quiet btn--sm">
                Full ledger <ArrowRight size={12} />
              </Link>
            }
          >
            <DataTable
              headers={[
                "Invoice Ref",
                "Customer / Buyer",
                "Amount Due",
                "Issue Date",
                "Status",
                "Action"
              ]}
              rows={invoices.slice(0, 5).map((inv) => [
                <span className="code" style={{ fontWeight: 800 }}>
                  {inv.code}
                </span>,
                <span style={{ fontWeight: 700 }}>{inv.buyer}</span>,
                <strong className="num" style={{ fontWeight: 800 }}>
                  {formatMoney(inv.amountDue, "INR")}
                </strong>,
                formatDate(inv.issuedAt || new Date().toISOString()),
                <StatusBadge status={inv.status || "PENDING"} />,
                <Link
                  href="/owner/finance"
                  className="btn btn--secondary btn--sm"
                >
                  Inspect <ArrowRight size={12} />
                </Link>
              ])}
            />
          </Card>
        )}

        {/* Department Performance Command Cards */}
        <Card className="col-12" title="Department Performance Command">
          <div className="page-grid" style={{ gap: 16 }}>
            <div
              className="col-4"
              style={{
                padding: "20px",
                background: "var(--indigo-soft)",
                border: "3px solid #000",
                boxShadow: "4px 4px 0 #000"
              }}
            >
              <Kicker>Production Floor</Kicker>
              <div
                style={{
                  fontSize: "2.2rem",
                  fontWeight: 900,
                  fontFamily: "var(--font-mono)",
                  margin: "8px 0"
                }}
              >
                {running} / {data.machines.length}
              </div>
              <span className="cell-secondary" style={{ color: "#000", fontWeight: 600 }}>
                Machines currently running active shifts
              </span>
              <div style={{ marginTop: "1.2rem" }}>
                <LinkButton
                  href="/owner/production"
                  variant="secondary"
                  style={{ width: "100%", justifyContent: "center", background: "#fff" }}
                >
                  View Floor Status <ArrowRight size={14} />
                </LinkButton>
              </div>
            </div>

            <div
              className="col-4"
              style={{
                padding: "20px",
                background: "var(--turmeric-soft)",
                border: "3px solid #000",
                boxShadow: "4px 4px 0 #000"
              }}
            >
              <Kicker>Supply Chain & Logistics</Kicker>
              <div
                style={{
                  fontSize: "2.2rem",
                  fontWeight: 900,
                  fontFamily: "var(--font-mono)",
                  margin: "8px 0"
                }}
              >
                {readyOrders.length} Orders
              </div>
              <span className="cell-secondary" style={{ color: "#000", fontWeight: 600 }}>
                Orders packaged & ready for dispatch loading
              </span>
              <div style={{ marginTop: "1.2rem" }}>
                <LinkButton
                  href="/owner/dispatch"
                  variant="secondary"
                  style={{ width: "100%", justifyContent: "center", background: "#fff" }}
                >
                  View Dispatch Desk <ArrowRight size={14} />
                </LinkButton>
              </div>
            </div>

            <div
              className="col-4"
              style={{
                padding: "20px",
                background: "var(--neem-soft)",
                border: "3px solid #000",
                boxShadow: "4px 4px 0 #000"
              }}
            >
              <Kicker>Commercial Profit Margin</Kicker>
              <div
                style={{
                  fontSize: "2.2rem",
                  fontWeight: 900,
                  fontFamily: "var(--font-mono)",
                  margin: "8px 0",
                  color: "var(--neem)"
                }}
              >
                {profitMargin.gt(15) ? "Healthy" : profitMargin.gt(5) ? "Stable" : "Alert"}
              </div>
              <span className="cell-secondary" style={{ color: "#000", fontWeight: 600 }}>
                Net operating margin estimated at {profitMargin.toFixed(1)}%
              </span>
              <div style={{ marginTop: "1.2rem" }}>
                <LinkButton
                  href="/owner/finance"
                  variant="secondary"
                  style={{ width: "100%", justifyContent: "center", background: "#fff" }}
                >
                  Inspect Finance Books <ArrowRight size={14} />
                </LinkButton>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
