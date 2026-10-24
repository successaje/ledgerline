"use client";
import { useToast } from "@/hooks/useToast";
import { Icon } from "./Icon";

export function Toasts() {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <Icon name={t.kind === "error" ? "alert" : t.kind === "success" ? "check" : "info"} size={18} />
          <div><strong>{t.title}</strong>{t.body && <div className="body">{t.body}</div>}</div>
          <button className="btn btn-ghost btn-sm" style={{ color: "inherit" }} onClick={() => dismiss(t.id)} aria-label="Dismiss"><Icon name="x" size={14} /></button>
        </div>
      ))}
    </div>
  );
}
