"use client";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
type Base = { variant?: Variant; size?: Size; block?: boolean; loading?: boolean; icon?: React.ReactNode };

function cls({ variant = "secondary", size = "md", block, loading }: Base, extra?: string) {
  return ["btn", variant !== "secondary" && `btn-${variant}`, size !== "md" && `btn-${size}`, block && "btn-block", loading && "is-loading", extra].filter(Boolean).join(" ");
}

export function Button({ variant, size, block, loading, icon, className, children, disabled, ...rest }: Base & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cls({ variant, size, block, loading }, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="spinner" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({ variant, size, block, icon, className, children, ...rest }: Base & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cls({ variant, size, block }, className)} {...rest}>
      {icon}
      {children}
    </a>
  );
}
