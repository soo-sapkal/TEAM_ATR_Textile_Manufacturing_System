"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bell, ChevronDown, LogOut, Search, ScanLine } from "lucide-react";
import Decimal from "decimal.js";
import { BrandMark, Button, StatusBadge } from "@/components/ui/primitives";
import { ICONS } from "@/components/ui/icons";
import { useDemo } from "@/lib/demo/context";
import { DEMO_USERS, hasAnyPermission, NAV_SECTIONS } from "@/lib/auth/permissions";
import { requiredPermissions, titleForPath } from "@/lib/auth/route-access";

function initials(name: string) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, data, ready, loginAs, logout, act } = useDemo();
  const [query, setQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [floorMode, setFloorMode] = useState(false);
  const [motionMode, setMotionMode] = useState<"system" | "reduced">("system");
  const searchRef = useRef<HTMLInputElement>(null);
  const title = titleForPath(pathname);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (user.permissions.includes("portal.read") && !user.permissions.some((p) => p !== "portal.read")) router.replace("/portal");
  }, [ready, user, pathname, router]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") { setNotificationsOpen(false); setMenuOpen(false); setQuery(""); }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const result: { label: string; detail: string; href: string; type: string }[] = [];
    for (const order of data.orders) if (`${order.code} ${order.buyer} ${order.product}`.toLowerCase().includes(needle)) result.push({ label: order.code, detail: `${order.buyer} · ${order.product}`, href: `/orders/${order.id}`, type: "Order" });
    for (const roll of data.rolls) if (`${roll.code} ${roll.orderCode}`.toLowerCase().includes(needle)) result.push({ label: roll.code, detail: `${roll.orderCode} · ${roll.status.replaceAll("_", " ")}`, href: `/rolls/${roll.code}`, type: "Roll" });
    for (const batch of data.yarnBatches) if (`${batch.code} ${batch.itemCode} ${batch.supplier}`.toLowerCase().includes(needle)) result.push({ label: batch.code, detail: `${batch.itemCode} · ${batch.supplier}`, href: `/inventory/batches/${batch.id}`, type: "Yarn batch" });
    for (const shipment of data.shipments) if (`${shipment.code} ${shipment.orderCode} ${shipment.invoice ?? ""}`.toLowerCase().includes(needle)) result.push({ label: shipment.code, detail: `${shipment.orderCode} · ${shipment.status}`, href: `/dispatch/${shipment.id}`, type: "Shipment" });
    return result.slice(0, 8);
  }, [query, data]);

  const permission = user?.permissions ?? [];
  const visibleSections = NAV_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => hasAnyPermission(user, item.any)) })).filter((section) => section.items.length > 0);
  const unreadCount = data.notifications.filter((notice) => notice.unread).length;
  const alertCount = data.machines.filter((machine) => machine.status === "BREAKDOWN").length + data.yarnItems.filter((item) => new Decimal(item.available).lt(item.reorderLevel)).length;

  if (!ready || !user || (user.permissions.includes("portal.read") && !user.permissions.some((p) => p !== "portal.read"))) {
    return <main className="permission-denied"><span className="kicker">Opening the ledger</span><h1>One moment…</h1><p>Checking this demo session and permission set.</p></main>;
  }

  const pathPerms = requiredPermissions(pathname);
  const routeAllowed = pathPerms.length === 0 || pathPerms.some((perm) => permission.includes(perm));
  const topLinks = visibleSections.flatMap((section) => section.items).slice(0, 3);

  return <div className="staff-shell">
    <aside className="sidebar" aria-label="Staff navigation">
      <div className="sidebar__identity"><Link href="/dashboard" aria-label="Loom Ledger dashboard"><BrandMark /></Link><span className="role-chip">{user.roles.join(" + ")} · Demo</span></div>
      <nav className="sidebar__nav">{visibleSections.map((section) => <div className="nav-section" key={section.label}><span className="nav-section__label">{section.label}</span>{section.items.map((item) => { const Icon = ICONS[item.icon]; const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} className={`nav-link${active ? " nav-link--active" : ""}`} href={item.href} aria-current={active ? "page" : undefined}>{Icon && <Icon size={16} strokeWidth={2.2}/>}<span>{item.label}</span>{item.href === "/machines" && alertCount > 0 && <span className="nav-badge" aria-label={`${alertCount} alerts`}>{alertCount}</span>}{item.href === "/quality" && data.rolls.filter((roll) => roll.status === "AWAITING_INSPECTION").length > 0 && <span className="nav-badge" aria-label="Rolls waiting for inspection">{data.rolls.filter((roll) => roll.status === "AWAITING_INSPECTION").length}</span>}</Link>; })}</div>)}</nav>
      <div className="sidebar__bottom"><div className="sidebar-control"><span>Floor mode</span><button type="button" aria-pressed={floorMode} onClick={() => { const enabled = !floorMode; setFloorMode(enabled); document.documentElement.dataset.floorMode = enabled ? "on" : "off"; }}>{floorMode ? "On · large targets" : "Off"}</button></div><div className="sidebar-control"><span>Motion</span><button type="button" aria-pressed={motionMode === "reduced"} onClick={() => { const next = motionMode === "system" ? "reduced" : "system"; setMotionMode(next); document.documentElement.dataset.motion = next; window.dispatchEvent(new Event("loom-motion-change")); }}>{motionMode === "reduced" ? "Reduced" : "System"}</button></div></div>
    </aside>
    <div className="app-main">
      <header className="topbar">
        <div className="breadcrumb"><Link href="/dashboard">MILL</Link><span>/</span><strong>{title}</strong></div>
        <div className="topbar__actions">
          <div className="search-box"><Search size={14} aria-hidden="true"/><input ref={searchRef} aria-label="Search orders, rolls, batches, and shipments" placeholder="Search or jump · ⌘K" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && results[0]) router.push(results[0].href); }}/>
            {query && <div className="command-results" role="listbox" aria-label="Search results">{results.length ? results.map((item) => <Link role="option" key={`${item.type}-${item.href}`} href={item.href} onClick={() => setQuery("")}><span className="cell-primary">{item.label}</span><span className="cell-secondary">{item.type} · {item.detail}</span></Link>) : <div className="permission-note">No matching demo record.</div>}<button type="button" className="filter-chip" onClick={() => setQuery("")}>Close search</button></div>}
          </div>
          <div style={{ position: "relative" }}><button type="button" className="icon-button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((value) => !value)}><Bell size={17}/>{unreadCount > 0 && <span className="notification-dot"/>}</button>{notificationsOpen && <div className="popover" role="dialog" aria-label="Notifications"><div className="popover__head"><span>Notifications</span><button type="button" className="btn btn--quiet btn--sm" onClick={() => act("mark-read", { all: true, commandKey: `mark-all-read:${data.notifications.filter((notice) => notice.unread).map((notice) => notice.id).sort().join(",")}` })}>Mark all read</button></div>{data.notifications.map((notice) => <Link className={`notification-row${notice.unread ? " notification-row--unread" : ""}`} key={notice.id} href={notice.href} onClick={() => { act("mark-read", { id: notice.id, commandKey: `mark-read:${notice.id}` }); setNotificationsOpen(false); }}><strong>{notice.title}</strong><p>{notice.body}</p><span className="cell-secondary">{notice.when}</span></Link>)}<Link className="cell-secondary" href="/notifications" onClick={() => setNotificationsOpen(false)}>All notifications <ArrowRight size={12}/></Link></div>}</div>
          <div style={{ position: "relative" }}><button type="button" className="user-menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><span className="user-menu__avatar">{initials(user.name)}</span><span className="user-menu__name"><strong>{user.name}</strong><small>{user.roles.join(" + ")}</small></span><ChevronDown size={13}/></button>{menuOpen && <div className="popover" role="dialog" aria-label="Demo account menu"><div className="popover__head">Switch demo role</div><p className="cell-secondary">Select a permission profile; this is not a live account switch.</p>{DEMO_USERS.map((demoUser) => <button key={demoUser.id} type="button" className="notification-row" style={{ width: "100%", textAlign: "left", border: 0, background: demoUser.id === user.id ? "#f9e2a1" : "transparent", cursor: "pointer" }} onClick={() => { loginAs(demoUser.id); setMenuOpen(false); router.push(demoUser.landing); }}><strong>{demoUser.roles.join(" + ")}</strong><span className="cell-secondary">{demoUser.name}</span></button>)}<Button variant="quiet" size="sm" onClick={() => { logout(); router.push("/login"); }}><LogOut size={14}/> Sign out</Button></div>}</div>
        </div>
      </header>
      <div className="demo-banner"><strong>DEMO MODE</strong><span>Seeded examples · Session-only actions · No records sent to a mill system</span><span aria-hidden="true">·</span><span>{alertCount} active sample alerts</span></div>
      <main id="main-content" className="page-content">{routeAllowed ? children : <div className="permission-denied"><StatusBadge status="FORBIDDEN"/><h2>Access is limited here</h2><p>Your current permission set does not include {pathPerms.join(" or ")}. Switch to an authorized demo profile or return to your landing page.</p><Button onClick={() => router.push(user.landing)}>Go to my landing page <ArrowRight size={14}/></Button></div>}</main>
      <nav className="mobile-bottom-nav" aria-label="Quick navigation">{topLinks.map((item) => { const Icon = ICONS[item.icon]; return <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>{Icon && <Icon size={17}/>}<span>{item.label}</span></Link>; })}<Link href="/scan"><ScanLine size={17}/><span>Scan</span></Link></nav>
    </div>
  </div>;
}
