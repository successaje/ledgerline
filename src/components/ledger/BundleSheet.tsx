"use client";
import { useMemo, useState } from "react";
import type { Ledger } from "@/domain/types";
import { PAY_STATUS } from "@/domain/types";
import { sgd } from "@/domain/format";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n";

type Props = { open: boolean; onClose: () => void; ledger: Ledger; onCreate: (periods: number[]) => void };

/** Choose which months to disclose. Unpaid months are preselected; nothing else is included. */
export function BundleSheet({ open, onClose, ledger, onCreate }: Props) {
  const { t, tn, monthLabel } = useT();
  const recorded = useMemo(() => ledger.records.filter(r => r.payEventUID).sort((a, b) => b.period - a.period), [ledger]);
  const [sel, setSel] = useState<Record<number, boolean>>(() => Object.fromEntries(recorded.filter(r => r.status === PAY_STATUS.UNPAID).map(r => [r.period, true])));
  const count = Object.values(sel).filter(Boolean).length;
  return (
    <Sheet open={open} onClose={onClose} title={t("bs_title")}>
      <p className="small muted">{t("bs_intro")}</p>
      {recorded.length === 0 ? (
        <div className="empty"><h3>{t("bs_empty_title")}</h3><p>{t("bs_empty_text")}</p></div>
      ) : (
        <div style={{ display: "grid", gap: 6, margin: "14px 0" }}>
          {recorded.map(r => (
            <label key={r.period} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, cursor: "pointer", background: sel[r.period] ? "var(--paper-3)" : "var(--paper-2)" }}>
              <input type="checkbox" checked={!!sel[r.period]} onChange={e => setSel({ ...sel, [r.period]: e.target.checked })} />
              <span><strong>{monthLabel(r.period)}</strong> <span className="small muted">· {sgd(r.amountCents)} · {r.status === PAY_STATUS.UNPAID ? t("bs_not_paid") : r.status === PAY_STATUS.PARTIAL ? t("ll_partly_paid") : t("bs_paid")}</span></span>
              <span className="xs faint">{[r.countersign && t("bs_employer"), r.proof && t("bs_bank_proof")].filter(Boolean).join(" · ")}</span>
            </label>
          ))}
        </div>
      )}
      <Button variant="primary" size="lg" block disabled={count === 0} onClick={() => onCreate(Object.entries(sel).filter(([, v]) => v).map(([k]) => Number(k)))} icon={<Icon name="shield" />}>
        {count ? tn("bs_create_n", count) : t("bs_create")}
      </Button>
    </Sheet>
  );
}
