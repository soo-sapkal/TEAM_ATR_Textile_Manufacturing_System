"use client";

import Link from "next/link";
import Decimal from "decimal.js";
import { Activity, AlertTriangle, ArrowRight, Boxes, ClipboardCheck, Clock3, Factory, PackageCheck, Truck, Wrench } from "lucide-react";
import { hasAnyPermission, hasPermission } from "@/lib/auth/permissions";
import { useDemo } from "@/lib/demo/context";
import { formatCompactMoney, formatDate, formatQty } from "@/lib/domain/format";
import { Card, InfoStrip, Kicker, LinkButton, Meter, PageHeader, StatCard, StatusBadge, Tag } from "@/components/ui/primitives";

export function DashboardPage() {
  const { data, user } = useDemo();
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "2-digit", month: "long", timeZone: "Asia/Kolkata" }).format(new Date());
  const canMachine = hasPermission(user, "production.read");
  const canOrders = hasPermission(user, "orders.read");
  const canInventory = hasPermission(user, "inventory.read");
  const canQuality = hasPermission(user, "quality.read");
  const canDispatch = hasPermission(user, "dispatch.read");
  const canFinance = hasPermission(user, "finance.read");
  const canAlerts = hasAnyPermission(user, ["orders.read", "production.read", "inventory.read", "quality.read", "dispatch.read"]);
  const breakdowns = canMachine ? data.machines.filter((machine) => machine.status === "BREAKDOWN") : [];
  const waiting = canQuality ? data.rolls.filter((roll) => ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED"].includes(roll.status)) : [];
  const readyOrders = canDispatch ? data.orders.filter((order) => order.displayStatus === "READY_FOR_DISPATCH") : [];
  const atRisk = canOrders ? data.orders.filter((order) => order.atRisk) : [];
  const running = canMachine ? data.machines.filter((machine) => machine.status === "RUNNING").length : 0;
  const openOrders = canOrders ? data.orders.filter((order) => !["CANCELLED", "CLOSED"].includes(order.status)) : [];
  const acceptedRolls = canQuality || canDispatch ? data.rolls.filter((roll) => roll.status === "ACCEPTED") : [];
  const acceptedByUnit = [...new Set(acceptedRolls.map((roll) => roll.unit))].map((unit) => ({ unit, rolls: acceptedRolls.filter((roll) => roll.unit === unit), quantity: acceptedRolls.filter((roll) => roll.unit === unit).reduce((sum, roll) => sum.plus(roll.qty), new Decimal(0)) }));
  const availableYarnByUnit = canInventory ? [...new Set(data.yarnItems.map((item) => item.unit))].map((unit) => ({ unit, total: data.yarnItems.filter((item) => item.unit === unit).reduce((sum, item) => sum.plus(item.available), new Decimal(0)) })) : [];
  const fastPaths = [
    hasPermission(user, "inventory.receive") && { href: "/inventory/receive", label: "Receive yarn", icon: Boxes },
    hasPermission(user, "production.read") && { href: "/production", label: "Open production board", icon: Activity },
    hasPermission(user, "quality.read") && { href: "/quality", label: "Inspect queue", icon: PackageCheck },
    hasPermission(user, "dispatch.create") && { href: "/dispatch/new", label: "Build a shipment", icon: Truck },
  ].filter((item): item is { href: string; label: string; icon: typeof Boxes } => Boolean(item));

  return <>
    <PageHeader
      eyebrow={`Shift book · ${today}`}
      title="The mill, at a glance."
      description="One working view across yarn, machines, quality, buyer orders, and today's exceptions. Sections appear only when your permission profile can read them."
      actions={<>
        {canQuality && <LinkButton href="/scan" variant="secondary"><ClipboardCheck size={15}/> Find a roll</LinkButton>}
        {hasPermission(user, "orders.create") && <LinkButton href="/orders/new" variant="primary">New order <ArrowRight size={15}/></LinkButton>}
      </>}
      meta={<><Tag>SHIFT B · 14:00–22:00</Tag><Tag>ASIA/KOLKATA</Tag><Tag>LAST SYNC · DEMO DATA</Tag></>}
    />
    <div className="stat-grid">
      <StatCard label="Machines running" value={canMachine ? `${running} / ${data.machines.length}` : "Restricted"} detail={canMachine ? `${breakdowns.length} breakdown · ${data.machines.filter((machine) => machine.status === "IDLE").length} idle` : "production.read required"} icon={Factory} tone="indigo" href={canMachine ? "/machines" : undefined}/>
      <StatCard label="Rolls to inspect" value={canQuality ? waiting.length : "Restricted"} detail={canQuality ? "Includes re-inspection queue" : "quality.read required"} icon={ClipboardCheck} tone="turmeric" href={canQuality ? "/quality" : undefined}/>
      <StatCard label="Ready to dispatch" value={canDispatch ? readyOrders.length : "Restricted"} detail={canDispatch ? `${acceptedRolls.length} accepted rolls in FG` : "dispatch.read required"} icon={Truck} tone="neem" href={canDispatch ? "/dispatch" : undefined}/>
      <StatCard label="Orders at risk" value={canOrders ? atRisk.length : "Restricted"} detail={canOrders ? atRisk.map((order) => order.code).join(" · ") || "No urgent date risk" : "orders.read required"} icon={AlertTriangle} tone={atRisk.length ? "madder" : "cotton"} href={canOrders ? "/orders" : undefined}/>
    </div>
    {breakdowns.length > 0 && <InfoStrip tone="danger" title="A machine is down; check shift impact.">{breakdowns.map((machine) => `${machine.code} · ${machine.downtimeMinutes} min`).join(" / ")} · <Link href="/machines">Open machine board</Link></InfoStrip>}
    <div className="page-grid">
      {hasPermission(user, "production.read") && <Card className="col-8" title="Production, by stage" action={<Link href="/production" className="btn btn--quiet btn--sm">Open board <ArrowRight size={12}/></Link>}>
        <div className="stack-sm">{(["SPINNING", "WEAVING", "DYEING"] as const).map((stage) => {
          const operations = data.operations.filter((operation) => operation.stage === stage && operation.status !== "CANCELLED");
          const groups = [...new Set(operations.map((operation) => operation.unit))].map((unit) => ({ unit, rows: operations.filter((operation) => operation.unit === unit), good: operations.filter((operation) => operation.unit === unit).reduce((sum, operation) => sum.plus(operation.good), new Decimal(0)), target: operations.filter((operation) => operation.unit === unit).reduce((sum, operation) => sum.plus(operation.target), new Decimal(0)) }));
          return <section className="stage-summary" key={stage} style={{ padding: "9px 0", borderBottom: "1px solid #c9c4b2" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 6 }}><span className="cell-primary">{stage[0] + stage.slice(1).toLowerCase()}</span><span className="cell-secondary">{operations.filter((operation) => operation.status === "IN_PROGRESS").length} live · {operations.filter((operation) => operation.status === "PAUSED").length} paused</span></div>
            {groups.length ? groups.map(({ unit, rows, good, target }) => <div key={unit} className="stage-summary__unit"><span className="num">{formatQty(good.toFixed(3), unit, 1)} / {formatQty(target.toFixed(3), unit, 1)}</span><Meter value={good.toFixed(3)} total={target.toFixed(3)} label={`${stage.toLowerCase()} output · ${unit}`} showNumbers={false} tone={stage === "DYEING" ? "neem" : stage === "SPINNING" ? "turmeric" : "indigo"}/><span className="field__hint">{rows.length} operation{rows.length === 1 ? "" : "s"}</span></div>) : <span className="field__hint">No operation rows in this stage.</span>}
          </section>;
        })}</div>
      </Card>}
      {canInventory && <Card className="col-4" title="Stock signal" action={<Link href="/inventory" className="btn btn--quiet btn--sm">Yarn room <ArrowRight size={12}/></Link>}>
        <Kicker>Available · grouped by unit</Kicker>{availableYarnByUnit.map(({ unit, total }) => <div key={unit} className="stock-signal__total">{formatQty(total.toFixed(3), unit, 1)}</div>)}<p className="cell-secondary">Reserved yarn stays separate. Held lots are not treated as available.</p>
        <div className="stack-sm" style={{ marginTop: 14 }}>{data.yarnItems.map((item) => { const low = new Decimal(item.available).lt(item.reorderLevel); return <div key={item.id} className="stock-signal__item"><span className="code">{item.code}</span><span className="num">{formatQty(item.available, item.unit, 1)}</span>{low && <StatusBadge status="HIGH" label="Reorder"/>}</div>; })}</div>
      </Card>}
      {canOrders && <Card className="col-7" title="Orders to keep in view" action={<Link href="/orders" className="btn btn--quiet btn--sm">All orders <ArrowRight size={12}/></Link>}>
        {openOrders.map((order) => <div className="order-row" key={order.id}><div><Link className="cell-primary code" href={`/orders/${order.id}`}>{order.code}</Link><span className="order-row__buyer">{order.buyer}</span></div><div><span className="cell-secondary">Due {formatDate(order.due)}</span><StatusBadge status={order.priority}/></div><Meter value={order.produced} total={order.ordered} unit={order.unit} label="Produced" showNumbers={false} tone={order.atRisk ? "madder" : "indigo"}/><div><StatusBadge status={order.displayStatus}/>{order.atRisk && <span className="cell-secondary" style={{ color: "var(--madder)" }}>Date at risk</span>}</div></div>)}
      </Card>}
      {canMachine && <Card className="col-5" title="Now needs a person" action={canAlerts ? <Link href="/alerts" className="btn btn--quiet btn--sm">Alert list <ArrowRight size={12}/></Link> : undefined}>
        <div className="stack-sm">
          {breakdowns.map((machine) => <Link href={`/machines/${machine.id}`} key={machine.id} className="info-strip info-strip--danger" style={{ margin: 0 }}><Wrench size={17}/><div><strong>{machine.code} breakdown · {machine.downtimeMinutes} min</strong><div>Assigned {machine.orderCode} · reason and maintenance close-out needed.</div></div></Link>)}
          {atRisk.map((order) => <Link href={`/orders/${order.id}`} key={order.id} className="info-strip info-strip--warning" style={{ margin: 0 }}><Clock3 size={17}/><div><strong>{order.code} · due {formatDate(order.due)}</strong><div>Material readiness is below the amount required for plan release.</div></div></Link>)}
          {waiting.length > 0 && <Link href="/quality" className="info-strip" style={{ margin: 0 }}><ClipboardCheck size={17}/><div><strong>{waiting.length} rolls in inspection queue</strong><div>Record result, defect, and disposition before finished stock is eligible.</div></div></Link>}
          {!breakdowns.length && !atRisk.length && !waiting.length && <p>No open exception visible to this permission profile in the demo set.</p>}
        </div>
      </Card>}
      {(canQuality || canDispatch) && <Card className="col-8" title="Accepted fabric by unit" action={<Link href={canQuality ? "/rolls" : "/dispatch/stock"} className="btn btn--quiet btn--sm">{canQuality ? "Roll passport" : "Finished stock"} <ArrowRight size={12}/></Link>}>
        <div className="page-grid" style={{ gap: 10 }}>{acceptedByUnit.map(({ unit, rolls, quantity }) => <div className="col-6" key={unit}><div className="permission-note"><Kicker>Accepted · {unit}</Kicker><div className="num" style={{ fontSize: 25, fontWeight: 900, marginTop: 7 }}>{formatQty(quantity.toFixed(3), unit, 1)}</div><span className="cell-secondary">{rolls.length} accepted roll{rolls.length === 1 ? "" : "s"} · held/rework/rejected excluded</span></div></div>)}</div>
        {acceptedByUnit.length === 0 && <InfoStrip>No accepted roll is in the current demo view.</InfoStrip>}
      </Card>}
      {fastPaths.length > 0 && <Card className="col-4" title="Fast paths"><div className="stack-sm">{fastPaths.map(({ href, label, icon: Icon }) => <LinkButton key={href} href={href} variant={href === "/dispatch/new" ? "primary" : "secondary"}><Icon size={15}/>{label}</LinkButton>)}</div></Card>}
      {canFinance && <Card className="col-12" title="Cost basis is part of the record" action={<Link href="/finance" className="btn btn--quiet btn--sm">Finance desk <ArrowRight size={12}/></Link>}><div className="page-grid"><div className="col-4"><Kicker>Recorded cost · allocated</Kicker><strong className="dashboard-cost">{formatCompactMoney(data.orders.reduce((sum, order) => sum.plus(order.recordedCost), new Decimal(0)).toFixed(2))}</strong></div><div className="col-4"><Kicker>Estimated cost · not posted</Kicker><strong className="dashboard-cost">{formatCompactMoney(data.orders.reduce((sum, order) => sum.plus(order.estimatedCost), new Decimal(0)).toFixed(2))}</strong></div><div className="col-4"><InfoStrip tone="warning">Machine rates or yarn costs marked missing are never assumed to be zero.</InfoStrip></div></div></Card>}
    </div>
  </>;
}
