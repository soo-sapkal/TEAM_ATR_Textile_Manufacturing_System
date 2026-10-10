import { Activity, Archive, BadgeIndianRupee, Bell, Boxes, Box, CalendarDays, ChartNoAxesCombined, ClipboardCheck, ClipboardList, Command, Factory, FileClock, Gauge, Grid2X2, HeartPulse, Home, Layers3, ListChecks, PackageCheck, PackagePlus, Plus, QrCode, ScanLine, Search, Settings2, ShieldCheck, ShoppingBag, Truck, UsersRound, Wallet, Wrench, type LucideIcon } from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  grid: Grid2X2, work: ListChecks, alert: HeartPulse, orders: ClipboardList, inventory: Boxes, receive: PackagePlus,
  production: Activity, machine: Factory, quality: ClipboardCheck, roll: Layers3, dispatch: Truck, finance: Wallet,
  people: UsersRound, report: ChartNoAxesCombined, admin: Settings2, audit: FileClock, verify: ShieldCheck,
  search: Search, notification: Bell, scan: ScanLine, qr: QrCode, home: Home, calendar: CalendarDays,
  package: PackageCheck, store: Archive, command: Command, gauge: Gauge, money: BadgeIndianRupee, wrench: Wrench, bag: ShoppingBag,
  plus: Plus, box: Box,
};
