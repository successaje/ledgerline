"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type Toast = { id: number; title: string; body?: string; kind: "info" | "success" | "error"; ttl?: number };
type Ctx = { toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; dismiss: (id: number) => void };

const ToastCtx = createContext<Ctx | null>(null);
let seq = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), []);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = seq++;
    setToasts(cur => [...cur, { ...t, id }]);
    const ttl = t.ttl ?? (t.kind === "error" ? 8000 : 4000);
    if (ttl > 0) setTimeout(() => dismiss(id), ttl);
  }, [dismiss]);
  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);
  return <ToastCtx.Provider value={value}>{children}</ToastCtx.Provider>;
}

export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast outside ToastProvider");
  return c;
}
