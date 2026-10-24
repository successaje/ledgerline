import { Icon } from "./Icon";
type Kind = "info" | "error" | "warn" | "ok";
const icon: Record<Kind, "info" | "alert" | "check"> = { info: "info", error: "alert", warn: "alert", ok: "check" };
export function Notice({ kind = "info", title, children, action }: { kind?: Kind; title?: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon name={icon[kind]} size={18} />
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </div>
    </div>
  );
}
