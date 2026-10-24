import type { InputHTMLAttributes } from "react";

export function Field({ label, hint, error, id, children }: { label: string; hint?: string; error?: string; id: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <span className="hint" style={{ color: "var(--red)" }} role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function MoneyInput({ prefix = "S$", ...props }: InputHTMLAttributes<HTMLInputElement> & { prefix?: string }) {
  return (
    <div className="input-money">
      <span className="prefix">{prefix}</span>
      <input className="input" inputMode="decimal" {...props} />
    </div>
  );
}
