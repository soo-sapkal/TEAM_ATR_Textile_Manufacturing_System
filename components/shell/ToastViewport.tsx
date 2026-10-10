"use client";

import { Check, CircleAlert, CircleX, Info, X } from "lucide-react";
import { useDemo } from "@/lib/demo/context";

export function ToastViewport() {
  const { toasts, dismissToast } = useDemo();
  return <div className="toast-viewport" aria-live="polite" aria-atomic="false">
    {toasts.map((toast) => {
      const Icon = toast.tone === "success" ? Check : toast.tone === "warning" ? CircleAlert : toast.tone === "error" ? CircleX : Info;
      return <div key={toast.id} className={`toast toast--${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"}>
        <Icon size={18} aria-hidden="true"/><div><strong>{toast.title}</strong>{toast.detail && <p>{toast.detail}</p>}</div>
        <button type="button" className="icon-button toast__close" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}><X size={16}/></button>
      </div>;
    })}
  </div>;
}
