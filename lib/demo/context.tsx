"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { DEMO_USERS } from "@/lib/auth/permissions";
import { applyDemoCommand } from "@/lib/demo/commands";
import { createDemoCommandAdapter } from "@/lib/api/adapter";
import { seedData } from "@/lib/demo/seed";
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
  return structuredClone(seedData);
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoData>(cloneSeed);
  const dataRef = useRef(data);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const clientReady = useSyncExternalStore(subscribeReady, getClientReady, getServerReady);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const ready = clientReady && isAuthLoaded;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          const perms = DEMO_USERS.find(u => u.roles.includes(d.user.roles[0]))?.permissions || [];
          setUser({ ...d.user, permissions: perms, landing: "/" });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setIsAuthLoaded(true));

    fetch("/api/orders")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setData((prev) => {
            const next = { ...prev, orders: res.data };
            dataRef.current = next;
            return next;
          });
        }
      })
      .catch(console.error);

    fetch("/api/inventory")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setData((prev) => {
            const next = { 
              ...prev, 
              yarnItems: res.data.yarnItems || prev.yarnItems,
              yarnBatches: res.data.yarnBatches || prev.yarnBatches,
              yarnMovements: res.data.yarnMovements || prev.yarnMovements
            };
            dataRef.current = next;
            return next;
          });
        }
      })
      .catch(console.error);

    fetch("/api/dispatch")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setData((prev) => {
            const next = { 
              ...prev, 
              shipments: res.data.shipments || prev.shipments,
              dispatchEvents: res.data.dispatchEvents || prev.dispatchEvents,
              rolls: res.data.rolls || prev.rolls
            };
            dataRef.current = next;
            return next;
          });
        }
      })
      .catch(console.error);

    fetch("/api/production")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setData((prev) => {
            const next = { 
              ...prev, 
              machines: res.data.machines || prev.machines,
              operations: res.data.operations || prev.operations,
              outputEvents: res.data.outputEvents || prev.outputEvents,
              machineEvents: res.data.machineEvents || prev.machineEvents
            };
            dataRef.current = next;
            return next;
          });
        }
      })
      .catch(console.error);

    fetch("/api/quality")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setData((prev) => {
            const next = {
              ...prev,
              inspectionEvents: res.data.inspectionEvents || prev.inspectionEvents,
              reworkEvents: res.data.reworkEvents || prev.reworkEvents,
              rolls: res.data.rolls || prev.rolls
            };
            dataRef.current = next;
            return next;
          });
        }
      })
      .catch(console.error);
  }, []);

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
    toast(`Signed in as ${selected.name}`, "Demo session only — records are not sent to a mill system.", "success");
  }, [toast]);

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
    const detail = "Session-only demo state; refresh to reset. No factory, finance, or buyer system was contacted.";
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
