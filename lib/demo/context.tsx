"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { DEMO_USERS } from "@/lib/auth/permissions";
import { applyDemoCommand } from "@/lib/demo/commands";
import { createDemoCommandAdapter } from "@/lib/api/adapter";

import type { DemoData, DemoUser } from "@/lib/domain/types";

export interface ToastMessage { id: string; title: string; detail?: string; tone: "success" | "warning" | "error" | "info" }
export interface DemoActionResult { ok: boolean; reference?: string }
type DemoContextValue = {
  user: DemoUser | null;
  data: DemoData;
  ready: boolean;
  toasts: ToastMessage[];
  loginAs: (id: string) => void;
  logout: () => void;
  act: (kind: string, payload?: Record<string, unknown>) => Promise<DemoActionResult>;
  toast: (title: string, detail?: string, tone?: ToastMessage["tone"]) => void;
  dismissToast: (id: string) => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);
const STORAGE_KEY = "loom-ledger-demo-user";
const SESSION_CHANGE_EVENT = "loom-ledger-demo-session-change";
const demoCommandAdapter = createDemoCommandAdapter(applyDemoCommand);

function subscribeSession(onStoreChange: () => void) {
  window.addEventListener(SESSION_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(SESSION_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSessionUserId(): string | null {
  return window.sessionStorage.getItem(STORAGE_KEY);
}

function getServerSessionUserId(): null {
  return null;
}

function subscribeReady(): () => void {
  return () => undefined;
}

function getClientReady(): boolean {
  return true;
}

function getServerReady(): boolean {
  return false;
}

function cloneSeed(): DemoData {
  return {
    orders: [],
    yarnItems: [],
    yarnBatches: [],
    machines: [],
    rolls: [],
    shipments: [],
    operations: [],
    yarnMovements: [],
    outputEvents: [],
    inspectionEvents: [],
    reworkEvents: [],
    dispatchEvents: [],
    machineEvents: [],
    processedCommandKeys: [],
    notifications: [],
    invoices: [],
    payments: [],
    supplierBills: [],
    supplierPayments: []
  };
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoData>(cloneSeed);
  const dataRef = useRef(data);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const clientReady = useSyncExternalStore(subscribeReady, getClientReady, getServerReady);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const ready = clientReady && isAuthLoaded && isDataLoaded;

  const refreshData = useCallback(() => {
    Promise.all([
      fetch("/api/orders").then(r => r.json()),
      fetch("/api/inventory").then(r => r.json()),
      fetch("/api/dispatch").then(r => r.json()),
      fetch("/api/production").then(r => r.json()),
      fetch("/api/quality").then(r => r.json()),
      fetch("/api/finance/receivables").then(r => r.json()),
      fetch("/api/finance/payables").then(r => r.json())
    ]).then(([ordersRes, inventoryRes, dispatchRes, productionRes, qualityRes, receivablesRes, payablesRes]) => {
      setData((prev) => {
        const next = { ...prev };
        
        if (ordersRes.success && ordersRes.data) next.orders = ordersRes.data;
        
        if (inventoryRes.success && inventoryRes.data) {
          if (inventoryRes.data.yarnItems) next.yarnItems = inventoryRes.data.yarnItems;
          if (inventoryRes.data.yarnBatches) next.yarnBatches = inventoryRes.data.yarnBatches;
          if (inventoryRes.data.yarnMovements) next.yarnMovements = inventoryRes.data.yarnMovements;
        }

        if (dispatchRes.success && dispatchRes.data) {
          if (dispatchRes.data.shipments) next.shipments = dispatchRes.data.shipments;
          if (dispatchRes.data.dispatchEvents) next.dispatchEvents = dispatchRes.data.dispatchEvents;
          if (dispatchRes.data.rolls) next.rolls = dispatchRes.data.rolls;
        }

        if (productionRes.success && productionRes.data) {
          if (productionRes.data.machines) next.machines = productionRes.data.machines;
          if (productionRes.data.operations) next.operations = productionRes.data.operations;
          if (productionRes.data.outputEvents) next.outputEvents = productionRes.data.outputEvents;
          if (productionRes.data.machineEvents) next.machineEvents = productionRes.data.machineEvents;
        }

        if (qualityRes.success && qualityRes.data) {
          if (qualityRes.data.inspectionEvents) next.inspectionEvents = qualityRes.data.inspectionEvents;
          if (qualityRes.data.reworkEvents) next.reworkEvents = qualityRes.data.reworkEvents;
          if (qualityRes.data.rolls) next.rolls = qualityRes.data.rolls;
        }

        if (receivablesRes.data) {
          if (receivablesRes.data.invoices) next.invoices = receivablesRes.data.invoices;
          if (receivablesRes.data.payments) next.payments = receivablesRes.data.payments;
        }

        if (payablesRes.data) {
          if (payablesRes.data.supplierBills) next.supplierBills = payablesRes.data.supplierBills;
          if (payablesRes.data.supplierPayments) next.supplierPayments = payablesRes.data.supplierPayments;
        }

        dataRef.current = next;
        return next;
      });
    }).catch(console.error).finally(() => setIsDataLoaded(true));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          const perms = d.user.permissions?.length ? d.user.permissions : (DEMO_USERS.find(u => u.roles.includes(d.user.roles[0]))?.permissions || []);
          setUser({ ...d.user, permissions: perms, landing: "/" });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setIsAuthLoaded(true));

    refreshData();
  }, [refreshData]);

  const toast = useCallback((title: string, detail?: string, tone: ToastMessage["tone"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, title, detail, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5200);
  }, []);

  const loginAs = useCallback((id: string) => {
    const selected = DEMO_USERS.find((candidate) => candidate.id === id);
    if (!selected) return;
    window.sessionStorage.setItem(STORAGE_KEY, selected.id);
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
    toast(`Signed in as ${selected.name}`, "Session active · Connected to Supabase", "success");
    refreshData();
  }, [toast, refreshData]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const act = useCallback(async (kind: string, payload: Record<string, unknown> = {}): Promise<DemoActionResult> => {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
    const applied = await demoCommandAdapter.execute({ state: dataRef.current, user, kind, payload });
    if (applied.state) {
      dataRef.current = applied.state;
      setData(applied.state);
    }
    const detail = applied.ok ? "Records saved to database." : "Operation could not be saved.";
    toast(applied.message, detail, applied.ok ? (kind === "mark-read" ? "info" : "warning") : "error");
    return { ok: applied.ok, reference: applied.reference };
  }, [toast, user]);

  const dismissToast = useCallback((id: string) => setToasts((current) => current.filter((item) => item.id !== id)), []);
  const value = useMemo(() => ({ user, data, ready, toasts, loginAs, logout, act, toast, dismissToast }), [user, data, ready, toasts, loginAs, logout, act, toast, dismissToast]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider");
  return context;
}
