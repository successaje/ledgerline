"use client";
import { useEffect, useRef } from "react";
import { Icon } from "./Icon";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Bottom sheet on phones, centred dialog on larger screens. Traps focus while open and returns it on close. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the first control (not the close button) so keyboard users land in the content.
    const t = setTimeout(() => {
      const nodes = panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      (nodes && nodes.length > 1 ? nodes[1] : nodes?.[0])?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(n => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="sheet-backdrop" aria-hidden
        onMouseDown={() => { pressedOnBackdrop.current = true; }}
        onClick={() => { if (pressedOnBackdrop.current) onClose(); pressedOnBackdrop.current = false; }} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={panel}>
        <div className="sheet-handle" aria-hidden />
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        </div>
        {children}
      </div>
    </>
  );
}
