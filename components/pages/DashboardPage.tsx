"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { RoleLink as Link } from "@/components/ui/primitives";
import Decimal from "decimal.js";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardCheck,
  Clock3,
  Factory,
  PackageCheck,
  Truck,
  Wrench
} from "lucide-react";
import { hasAnyPermission, hasPermission } from "@/lib/auth/permissions";
import { useDemo } from "@/lib/demo/context";
import { formatCompactMoney, formatDate, formatQty } from "@/lib/domain/format";
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

export function DashboardPage() {
  const { data, user } = useDemo();
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "Asia/Kolkata"
  }).format(new Date());

  const canMachine = hasPermission(user, "production.read");
  const canOrders = hasPermission(user, "orders.read");
  const canInventory = hasPermission(user, "inventory.read");
  const canQuality = hasPermission(user, "quality.read");
  const canDispatch = hasPermission(user, "dispatch.read");
  const canFinance = hasPermission(user, "finance.read");
  const canAlerts = hasAnyPermission(user, [
    "orders.read",
    "production.read",
    "inventory.read",
    "quality.read",
    "dispatch.read"
  ]);

  const breakdowns = canMachine
    ? data.machines.filter((machine) => machine.status === "BREAKDOWN")
    : [];
  const waiting = canQuality
    ? data.rolls.filter((roll) =>
        ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED"].includes(roll.status)
      )
    : [];
  const readyOrders = canDispatch
    ? data.orders.filter((order) => order.displayStatus === "READY_FOR_DISPATCH")
    : [];
  const atRisk = canOrders ? data.orders.filter((order) => order.atRisk) : [];
  const running = canMachine
    ? data.machines.filter((machine) => machine.status === "RUNNING").length
    : 0;
  const openOrders = canOrders
    ? data.orders.filter((order) => !["CANCELLED", "CLOSED"].includes(order.status))
    : [];

  const acceptedRolls =
    canQuality || canDispatch
      ? data.rolls.filter((roll) => roll.status === "ACCEPTED")
      : [];
  const acceptedByUnit = [...new Set(acceptedRolls.map((roll) => roll.unit))].map((unit) => ({
    unit,
    rolls: acceptedRolls.filter((roll) => roll.unit === unit),
    quantity: acceptedRolls
      .filter((roll) => roll.unit === unit)
      .reduce((sum, roll) => sum.plus(roll.qty), new Decimal(0))
  }));

  const availableYarnByUnit = canInventory
    ? [...new Set(data.yarnItems.map((item) => item.unit))].map((unit) => ({
        unit,
        total: data.yarnItems
          .filter((item) => item.unit === unit)
          .reduce((sum, item) => sum.plus(item.available), new Decimal(0))
      }))
    : [];

  const criticalYarnItems = canInventory
    ? data.yarnItems.filter((item) => new Decimal(item.available).lt(item.reorderLevel))
    : [];
  const orderShortages = canOrders
    ? data.orders.filter((order) => order.materialShortage)
    : [];

  const fastPaths = [
    hasPermission(user, "inventory.receive") && {
      href: "/inventory/receive",
      label: "Receive yarn",
      icon: Boxes
    },
    hasPermission(user, "production.read") && {
      href: "/production",
      label: "Open production board",
      icon: Activity
    },
    hasPermission(user, "quality.read") && {
      href: "/quality",
      label: "Inspect queue",
      icon: PackageCheck
    },
    hasPermission(user, "dispatch.create") && {
      href: "/dispatch/new",
      label: "Build a shipment",
      icon: Truck
    }
  ].filter((item): item is { href: string; label: string; icon: typeof Boxes } =>
    Boolean(item)
  );

  return (
    <>
      <PageHeader
        eyebrow={`Shift book · ${today}`}
        title="The mill, at a glance."
        description="One working view across raw material yarn, machines, quality, buyer orders, and today's exceptions. Real-time safety thresholds protect production schedules."
        actions={
          <>
            {canQuality && (
              <LinkButton href="/quality/scan" variant="secondary">
                <ClipboardCheck size={15} /> Find / Scan roll
              </LinkButton>
            )}
            {hasPermission(user, "orders.create") && (
              <LinkButton href="/orders/new" variant="primary">
                New order <ArrowRight size={15} />
              </LinkButton>
            )}
          </>
        }
        meta={
          <>
            <Tag>SHIFT B · 14:00–22:00</Tag>
            <Tag>ASIA/KOLKATA</Tag>
            <Tag>LIVE FACTORY SYNC</Tag>
          </>
        }
      />

      {criticalYarnItems.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <InfoStrip
            tone="danger"
            title={`🚨 Raw Material Alert: ${criticalYarnItems.length} yarn item${
              criticalYarnItems.length > 1 ? "s are" : " is"
            } critically low!`}
          >
            {criticalYarnItems
              .map(
                (item) =>
                  `${item.description} (${item.code}): only ${formatQty(
                    item.available,
                    item.unit,
                    1
                  )} available (Safety threshold: ${formatQty(
                    item.reorderLevel,
                    item.unit,
                    1
                  )})`
              )
              .join(" · ")}
            {" — "}
            <Link
              href="/inventory"
              style={{ textDecoration: "underline", fontWeight: 700 }}
            >
              Inspect Yarn Store & Reorder Raw Material →
            </Link>
          </InfoStrip>
        </div>
      )}

      {orderShortages.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <InfoStrip
            tone="warning"
            title={`⚠️ Incoming Orders Blocked by Material Shortage (${orderShortages.length} order${
              orderShortages.length > 1 ? "s" : ""
            })`}
          >
            {orderShortages.map((o) => `${o.code} (${o.buyer})`).join(", ")} cannot start
            until required yarn is received.{" "}
            <Link href="/orders" style={{ textDecoration: "underline", fontWeight: 700 }}>
              View Order Material Readiness →
            </Link>
          </InfoStrip>
        </div>
      )}

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="Raw material items"
          value={canInventory ? `${data.yarnItems.length} yarns` : "Restricted"}
          detail={
            canInventory
              ? `${criticalYarnItems.length} critical low · ${
                  data.yarnItems.length - criticalYarnItems.length
                } safe`
              : "inventory.read required"
          }
          icon={Boxes}
          tone={criticalYarnItems.length ? "madder" : "neem"}
          href={canInventory ? "/inventory" : undefined}
        />
        <StatCard
          label="Machines running"
          value={canMachine ? `${running} / ${data.machines.length}` : "Restricted"}
          detail={
            canMachine
              ? `${breakdowns.length} breakdown · ${
                  data.machines.filter((m) => m.status === "IDLE").length
                } idle`
              : "production.read required"
          }
          icon={Factory}
          tone="indigo"
          href={canMachine ? "/machines" : undefined}
        />
        <StatCard
          label="Rolls to inspect"
          value={canQuality ? waiting.length : "Restricted"}
          detail={canQuality ? "Includes re-inspection queue" : "quality.read required"}
          icon={ClipboardCheck}
          tone="turmeric"
          href={canQuality ? "/quality" : undefined}
        />
        <StatCard
          label="Orders material check"
          value={
            canOrders
              ? `${data.orders.length - orderShortages.length} / ${
                  data.orders.length
                } ready`
              : "Restricted"
          }
          detail={
            canOrders
              ? orderShortages.length
                ? `${orderShortages.length} blocked by shortage`
                : "All orders yarn ready"
              : "orders.read required"
          }
          icon={AlertTriangle}
          tone={orderShortages.length ? "madder" : "neem"}
          href={canOrders ? "/orders" : undefined}
        />
      </div>

      {breakdowns.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <InfoStrip tone="danger" title="A machine is down; check shift impact.">
            {breakdowns
              .map((machine) => `${machine.code} · ${machine.downtimeMinutes} min downtime`)
              .join(" / ")}{" "}
            · <Link href="/machines" style={{ fontWeight: 700, textDecoration: "underline" }}>Open machine board →</Link>
          </InfoStrip>
        </div>
      )}

      <div className="page-grid">
        {/* Production By Stage Table */}
        {hasPermission(user, "production.read") && (
          <Card
            className="col-8 card--table"
            title="Production by Stage"
            action={
              <Link href="/production" className="btn btn--quiet btn--sm">
                Open board <ArrowRight size={12} />
              </Link>
            }
          >
            <DataTable
              headers={[
                "Stage",
                "Active Operations",
                "Output / Target",
                "Stage Progress",
                "Action"
              ]}
              rows={(["SPINNING", "WEAVING", "DYEING"] as const).map((stage) => {
                const operations = data.operations.filter(
                  (op) => op.stage === stage && op.status !== "CANCELLED"
                );
                const activeCount = operations.filter(
                  (op) => op.status === "IN_PROGRESS"
                ).length;
                const pausedCount = operations.filter(
                  (op) => op.status === "PAUSED"
                ).length;
                const totalGood = operations.reduce(
                  (sum, op) => sum.plus(op.good),
                  new Decimal(0)
                );
                const totalTarget = operations.reduce(
                  (sum, op) => sum.plus(op.target),
                  new Decimal(0)
                );
                const pct = totalTarget.gt(0)
                  ? totalGood.dividedBy(totalTarget).times(100).toNumber()
                  : 0;

                const tone =
                  stage === "DYEING"
                    ? "neem"
                    : stage === "SPINNING"
                    ? "turmeric"
                    : "indigo";

                return [
                  <div>
                    <span className="cell-primary" style={{ textTransform: "capitalize", fontWeight: 800 }}>
                      {stage.toLowerCase()}
                    </span>
                    <span className="cell-secondary">{operations.length} operations</span>
                  </div>,
                  <div>
                    <span style={{ fontWeight: 700 }}>{activeCount} Live</span>
                    {pausedCount > 0 && (
                      <span className="cell-secondary" style={{ color: "var(--turmeric)" }}>
                        {pausedCount} Paused
                      </span>
                    )}
                  </div>,
                  <div>
                    <span className="num" style={{ fontWeight: 800 }}>
                      {formatQty(totalGood.toFixed(1), "M", 0)}
                    </span>
                    <span className="cell-secondary">
                      of {formatQty(totalTarget.toFixed(1), "M", 0)}
                    </span>
                  </div>,
                  <div style={{ minWidth: 140 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700 }}>{pct.toFixed(0)}%</span>
                    </div>
                    <Meter
                      value={totalGood.toFixed(1)}
                      total={totalTarget.toFixed(1)}
                      showNumbers={false}
                      tone={tone}
                    />
                  </div>,
                  <Link
                    href={`/production`}
                    className="btn btn--secondary btn--sm"
                  >
                    View <ArrowRight size={12} />
                  </Link>
                ];
              })}
            />
          </Card>
        )}

        {/* Raw Material Stock Signals Table */}
        {canInventory && (
          <Card
            className="col-4 card--table"
            title="Raw Material Stock Signals"
            action={
              <Link href="/inventory" className="btn btn--quiet btn--sm">
                Yarn room <ArrowRight size={12} />
              </Link>
            }
          >
            <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid var(--line)" }}>
              <Kicker>Available Stock by Unit</Kicker>
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                {availableYarnByUnit.map(({ unit, total }) => (
                  <div key={unit} style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                    {formatQty(total.toFixed(1), unit, 0)}
                  </div>
                ))}
              </div>
            </div>
            <DataTable
              headers={["Yarn Code", "Available", "Safety Min", "Signal"]}
              rows={data.yarnItems.slice(0, 5).map((item) => {
                const low = new Decimal(item.available).lt(item.reorderLevel);
                const approaching =
                  !low &&
                  new Decimal(item.available).lte(
                    new Decimal(item.reorderLevel).mul(1.25)
                  );

                return [
                  <div>
                    <strong className="code">{item.code}</strong>
                    <span className="cell-secondary" style={{ fontSize: 10 }}>
                      {item.description}
                    </span>
                  </div>,
                  <span
                    className="num"
                    style={{
                      fontWeight: 800,
                      color: low
                        ? "var(--madder)"
                        : approaching
                        ? "var(--turmeric)"
                        : "inherit"
                    }}
                  >
                    {formatQty(item.available, item.unit, 0)}
                  </span>,
                  <span className="cell-secondary">
                    {formatQty(item.reorderLevel, item.unit, 0)}
                  </span>,
                  low ? (
                    <StatusBadge status="HIGH" label="Low" />
                  ) : approaching ? (
                    <StatusBadge status="PENDING" label="Near" />
                  ) : (
                    <StatusBadge status="AVAILABLE" label="OK" />
                  )
                ];
              })}
            />
          </Card>
        )}

        {/* Orders to Keep in View Table (Clean DataTable replacement) */}
        {canOrders && (
          <Card
            className="col-8 card--table"
            title="Orders to Keep in View"
            action={
              <Link href="/orders" className="btn btn--quiet btn--sm">
                All orders <ArrowRight size={12} />
              </Link>
            }
          >
            <DataTable
              headers={[
                "Order / Buyer",
                "Due Date",
                "Priority",
                "Production Progress",
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
                  <span style={{ fontWeight: 600 }}>{formatDate(order.due)}</span>
                  {order.atRisk && (
                    <span
                      className="cell-secondary"
                      style={{ color: "var(--madder)", fontWeight: 700 }}
                    >
                      At risk
                    </span>
                  )}
                </div>,
                <StatusBadge status={order.priority} />,
                <div style={{ minWidth: 150 }}>
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
                <div>
                  <StatusBadge status={order.displayStatus} />
                  {order.materialShortage ? (
                    <span
                      className="cell-secondary"
                      style={{ color: "var(--madder)", fontWeight: 700, display: "block", marginTop: 2 }}
                    >
                      Yarn short
                    </span>
                  ) : (
                    <span
                      className="cell-secondary"
                      style={{ color: "var(--neem)", display: "block", marginTop: 2 }}
                    >
                      Yarn ready
                    </span>
                  )}
                </div>,
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
                  title="No active customer orders"
                  detail="All open production commitments are fulfilled."
                />
              }
            />
          </Card>
        )}

        {/* Critical Alerts & Exceptions Card */}
        {canMachine && (
          <Card
            className="col-4"
            title="Now Needs Attention"
            action={
              canAlerts ? (
                <Link href="/alerts" className="btn btn--quiet btn--sm">
                  Alert list <ArrowRight size={12} />
                </Link>
              ) : undefined
            }
          >
            <div className="stack-sm">
              {criticalYarnItems.map((item) => (
                <Link
                  href="/inventory"
                  key={item.id}
                  className="info-strip info-strip--danger"
                  style={{ margin: 0, border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}
                >
                  <Boxes size={17} />
                  <div>
                    <strong>Raw Material Low · {item.code}</strong>
                    <div>
                      {item.description}: {formatQty(item.available, item.unit, 1)} available.
                    </div>
                  </div>
                </Link>
              ))}

              {breakdowns.map((machine) => (
                <Link
                  href={`/machines/${machine.id}`}
                  key={machine.id}
                  className="info-strip info-strip--danger"
                  style={{ margin: 0, border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}
                >
                  <Wrench size={17} />
                  <div>
                    <strong>
                      {machine.code} breakdown · {machine.downtimeMinutes} min
                    </strong>
                    <div>Assigned {machine.orderCode}. Needs maintenance.</div>
                  </div>
                </Link>
              ))}

              {orderShortages.map((order) => (
                <Link
                  href={`/orders/${order.id}`}
                  key={order.id}
                  className="info-strip info-strip--warning"
                  style={{ margin: 0, border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}
                >
                  <Clock3 size={17} />
                  <div>
                    <strong>{order.code} · Yarn Shortage</strong>
                    <div>{order.materialReadiness?.deficitSummary || "Yarn inventory deficit."}</div>
                  </div>
                </Link>
              ))}

              {waiting.length > 0 && (
                <Link
                  href="/quality"
                  className="info-strip"
                  style={{ margin: 0, border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}
                >
                  <ClipboardCheck size={17} />
                  <div>
                    <strong>{waiting.length} rolls in QC inspection queue</strong>
                    <div>Record result & disposition before finished stock is eligible.</div>
                  </div>
                </Link>
              )}

              {!breakdowns.length && !atRisk.length && !waiting.length && (
                <p className="cell-secondary">No open exceptions at this time.</p>
              )}
            </div>
          </Card>
        )}

        {/* Accepted Fabric By Unit */}
        {(canQuality || canDispatch) && (
          <Card
            className="col-8"
            title="Accepted Fabric in Warehouse"
            action={
              <Link
                href={canQuality ? "/quality/scan" : "/dispatch/stock"}
                className="btn btn--quiet btn--sm"
              >
                {canQuality ? "Roll scan & registry" : "Finished stock"}{" "}
                <ArrowRight size={12} />
              </Link>
            }
          >
            <div className="page-grid" style={{ gap: 12 }}>
              {acceptedByUnit.map(({ unit, rolls, quantity }) => (
                <div className="col-6" key={unit}>
                  <div
                    style={{
                      border: "2px solid #000",
                      boxShadow: "3px 3px 0 #000",
                      padding: 16,
                      background: "var(--cotton)"
                    }}
                  >
                    <Kicker>Accepted · {unit}</Kicker>
                    <div
                      className="num"
                      style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}
                    >
                      {formatQty(quantity.toFixed(1), unit, 0)}
                    </div>
                    <span className="cell-secondary" style={{ marginTop: 4 }}>
                      {rolls.length} accepted rolls · ready for dispatch packing
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {acceptedByUnit.length === 0 && (
              <InfoStrip>No accepted rolls in warehouse stock.</InfoStrip>
            )}
          </Card>
        )}

        {/* Fast Paths */}
        {fastPaths.length > 0 && (
          <Card className="col-4" title="Quick Navigation">
            <div className="stack-sm">
              {fastPaths.map(({ href, label, icon: Icon }) => (
                <LinkButton
                  key={href}
                  href={href}
                  variant={href === "/dispatch/new" ? "primary" : "secondary"}
                >
                  <Icon size={15} />
                  {label}
                </LinkButton>
              ))}
            </div>
          </Card>
        )}

        {/* Cost Basis Card */}
        {canFinance && (
          <Card
            className="col-12"
            title="Cost Basis & Operating Expense"
            action={
              <Link href="/finance" className="btn btn--quiet btn--sm">
                Finance desk <ArrowRight size={12} />
              </Link>
            }
          >
            <div className="page-grid" style={{ gap: 16 }}>
              <div
                className="col-4"
                style={{
                  border: "2px solid #000",
                  padding: 16,
                  background: "#fff",
                  boxShadow: "3px 3px 0 #000"
                }}
              >
                <Kicker>Recorded Production Cost</Kicker>
                <strong
                  className="dashboard-cost"
                  style={{ fontSize: "1.8rem", fontWeight: 900 }}
                >
                  {formatCompactMoney(
                    data.orders
                      .reduce(
                        (sum, order) => sum.plus(order.recordedCost),
                        new Decimal(0)
                      )
                      .toFixed(2)
                  )}
                </strong>
                <span className="cell-secondary">Allocated machine & labor expenses</span>
              </div>
              <div
                className="col-4"
                style={{
                  border: "2px solid #000",
                  padding: 16,
                  background: "#fff",
                  boxShadow: "3px 3px 0 #000"
                }}
              >
                <Kicker>Estimated Remaining Cost</Kicker>
                <strong
                  className="dashboard-cost"
                  style={{ fontSize: "1.8rem", fontWeight: 900 }}
                >
                  {formatCompactMoney(
                    data.orders
                      .reduce(
                        (sum, order) => sum.plus(order.estimatedCost),
                        new Decimal(0)
                      )
                      .toFixed(2)
                  )}
                </strong>
                <span className="cell-secondary">Expected cost to complete work</span>
              </div>
              <div className="col-4">
                <InfoStrip tone="warning">
                  Machine run rates and yarn batch costs are tracked per transaction. Missing rates are never defaulted to zero.
                </InfoStrip>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
