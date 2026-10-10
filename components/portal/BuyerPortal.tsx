"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck } from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { formatDate, formatQty } from "@/lib/domain/format";
import { BrandMark, Card, EmptyState, InfoStrip, LinkButton, PageHeader, StatusBadge, Tag, Thread } from "@/components/ui/primitives";
import type { Order } from "@/lib/domain/types";

export function BuyerPortalShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useDemo();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(path)}`);
    else if (!user.buyerId) router.replace(user.landing);
  }, [ready, user, path, router]);
  if (!ready || !user?.buyerId) return <main className="permission-denied"><span className="kicker">Buyer account boundary</span><h1>Opening buyer portal…</h1><p>Checking the signed-in buyer profile.</p></main>;
  return <div className="portal-shell"><header className="portal-header"><Link href="/portal" aria-label="Buyer portal home"><BrandMark/></Link><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="tag">Buyer portal · {user.name}</span><button type="button" className="btn btn--secondary btn--sm" onClick={() => { logout(); router.push("/login"); }}>Sign out</button></div></header>{children}<footer className="public-footer"><span>EVEREST TEXTILE MILLS</span><span>Buyer view · costs and internal employee/machine details are not shown</span></footer></div>;
}

export function BuyerOrdersPage() {
  const { data, user } = useDemo();
  const orders = data.orders.filter((order) => order.buyerId === user?.buyerId);
  return <main className="portal-main"><PageHeader eyebrow="Buyer account · order tracker" title="Your orders, on the thread." description="A clear milestone view for your purchase orders. Quantity is shown in the ordered unit; internal costs and mill-only notes stay private." meta={<Tag>MY ACCOUNT · {orders.length} ORDERS</Tag>}/>{orders.map((order) => <BuyerOrderCard order={order} key={order.id}/>) }{orders.length===0 && <EmptyState title="No orders on this buyer account" detail="Contact your mill representative if an order should be linked."/>}<InfoStrip tone="info">This demo restricts orders to the buyer ID on the signed-in demo persona. A live API must enforce the same filter server-side.</InfoStrip></main>;
}

export function BuyerOrderDetailPage({ id }: { id: string }) {
  const { data, user } = useDemo();
  const order = data.orders.find((candidate) => (candidate.id === id || candidate.code === id) && candidate.buyerId === user?.buyerId);
  if (!order) return <main className="portal-main"><PageHeader eyebrow="Buyer account" title="Order not found" description="We couldn't find this purchase order under your account."/><EmptyState title="No order on this account" detail="Order existence is not disclosed to other buyer accounts." action={<LinkButton href="/portal">Back to my orders</LinkButton>}/></main>;
  const stageIndex = order.displayStatus === "READY_FOR_DISPATCH" ? 4 : order.stage === "DYEING" ? 3 : order.stage === "WEAVING" ? 2 : order.status === "CONFIRMED" ? 1 : 0;
  return <main className="portal-main"><PageHeader eyebrow="Buyer order tracker" title={order.code} description={`${order.product} · ${order.colour} · ${formatQty(order.ordered,order.unit,0)}`} actions={<LinkButton href="/portal" variant="secondary"><ArrowLeft size={14}/> My orders</LinkButton>} meta={<><StatusBadge status={order.displayStatus}/><Tag>Due {formatDate(order.due)}</Tag></>}/><Card className="portal-order"><div className="page-grid"><div className="col-8"><span className="kicker">Progress, without the phone call</span><h2>{buyerStatus(order,stageIndex)}</h2><p>The mill will update this view as the next production and inspection milestones are recorded.</p></div><div className="col-4"><span className="cell-secondary">Order quantity</span><strong style={{ display: "block", font: "900 29px var(--font-display)" }}>{formatQty(order.ordered,order.unit,0)}</strong></div></div><div className="portal-thread"><Thread stages={[
    {key:"confirmed",label:"Confirmed",state:stageIndex>=1?"done":"current",meta:"Order accepted"},
    {key:"production",label:"In production",state:stageIndex>=2?"done":stageIndex===1?"current":"todo",meta:order.stage ? "Mill update available" : "Awaiting plan"},
    {key:"quality",label:"Quality check",state:stageIndex>=3?"done":stageIndex===2?"current":"todo",meta:`${formatQty(order.accepted,order.unit,0)} accepted`},
    {key:"dispatch",label:"Dispatch",state:stageIndex>=4?"done":stageIndex===3?"current":"todo",meta:`${formatQty(order.dispatched,order.unit,0)} dispatched`},
    {key:"complete",label:"Complete",state:order.dispatched===order.ordered?"done":"todo",meta:`${formatQty(order.remaining,order.unit,0)} remaining`},
  ]}/></div><div className="page-grid"><div className="col-4"><div className="permission-note"><span className="cell-secondary">Produced</span><strong className="num">{formatQty(order.produced,order.unit,0)}</strong></div></div><div className="col-4"><div className="permission-note"><span className="cell-secondary">Quality accepted</span><strong className="num">{formatQty(order.accepted,order.unit,0)}</strong></div></div><div className="col-4"><div className="permission-note"><span className="cell-secondary">Dispatched</span><strong className="num">{formatQty(order.dispatched,order.unit,0)}</strong></div></div></div><div className="info-strip"><BadgeCheck size={17}/><div><strong>Buyer-facing view</strong><div>Supplier, machine identifier, employee, defect notes, and cost figures are hidden here.</div></div></div><div className="form-actions"><span className="field__hint">If the milestone changes, refresh to see the latest posted state.</span><Link href="mailto:orders@everest.demo" className="btn btn--secondary btn--sm">Ask the mill · demo contact</Link></div></Card></main>;
}

function BuyerOrderCard({ order }: { order: Order }) {
  const stageIndex = order.displayStatus === "READY_FOR_DISPATCH" ? 4 : order.stage === "DYEING" ? 3 : order.stage === "WEAVING" ? 2 : order.status === "CONFIRMED" ? 1 : 0;
  return <article className="portal-order"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap" }}><div><span className="kicker">{order.code}</span><h2>{order.product} · {order.colour}</h2><p>Due {formatDate(order.due)} · {formatQty(order.ordered,order.unit,0)}</p></div><StatusBadge status={order.displayStatus}/></div><Thread className="portal-thread" stages={[{key:"confirmed",label:"Confirmed",state:stageIndex>=1?"done":"current"},{key:"production",label:"Production",state:stageIndex>=2?"done":stageIndex===1?"current":"todo"},{key:"quality",label:"Quality",state:stageIndex>=3?"done":stageIndex===2?"current":"todo"},{key:"dispatch",label:"Dispatch",state:stageIndex>=4?"done":stageIndex===3?"current":"todo"}]}/><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap" }}><span className="cell-secondary">{formatQty(order.accepted,order.unit,0)} accepted · {formatQty(order.dispatched,order.unit,0)} dispatched</span><Link href={`/portal/orders/${order.id}`} className="btn btn--primary btn--sm">View tracker <ArrowRight size={12}/></Link></div></article>;
}
function buyerStatus(order: Order, stageIndex: number): string { if (order.displayStatus === "READY_FOR_DISPATCH") return "Quality passed; accepted rolls are being prepared to ship."; if (stageIndex >= 2) return "Your order is on the production floor."; if (order.status === "CONFIRMED") return "Your order is confirmed; production planning is next."; return "The mill is preparing your order."; }
