"use client";
import type { Activity } from "@/hooks/useLedger";
import type { Ledger, PayRecord } from "@/domain/types";
import { PAY_STATUS, PROOF_METHOD } from "@/domain/types";
import { daysSince, sgd, shortAddr } from "@/domain/format";
import { employerState as employerStateOf } from "@/domain/due";
import { explorer } from "@/services/chain";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Stages } from "@/components/ui/Stages";
import { useT } from "@/i18n";

type Props = {
  ledger: Ledger;
  activity: Activity | null;
  fastForward: boolean;
  busy: boolean;
  openPeriod: number | null;
  onOpenPeriod: (p: number | null) => void;
  onRecord: (period: number, status: 1 | 2) => void;
  onEdit: (record: PayRecord) => void;
  onProve: (period: number) => void;
  onAskEmployer: () => void;
};

export function LedgerList({ ledger, activity, fastForward, busy, openPeriod, onOpenPeriod, onRecord, onEdit, onProve, onAskEmployer }: Props) {
  const { t, tn, monthLabel, lang } = useT();
  const rows = [...ledger.records].sort((a, b) => b.period - a.period);
  const windowDays = ledger.profile.confirmWindowDays;
  const years = new Set(rows.map(r => Math.floor(r.period / 100)));
  const showYears = years.size > 1 || rows.length > 12;
  const dateFmt = (ms: number) => new Date(ms).toLocaleDateString(lang === "en" ? "en-SG" : lang);

  const proofSummary = (r: PayRecord) => {
    if (!r.proof) return "";
    if (!r.proof.proofJson) return t("ll_proof_elsewhere");
    const { from, to } = r.proof.window;
    if (r.proof.satisfied) return t("ll_proof_summary_none", { amount: sgd(r.amountCents), from, to });
    const count = (() => { try { return JSON.parse(r.proof.proofJson).extracted?.count ?? 1; } catch { return 1; } })();
    return tn("ll_proof_summary_found", count, { from, to });
  };

  return (
    <div className="ledger">
      <div className="ledger-head">
        <div>
          <div style={{ fontWeight: 600 }}>{t("ll_title", { name: ledger.profile.name })}</div>
          <div className="small muted">{t("ll_sub", { employer: ledger.profile.employerLabel, salary: sgd(ledger.profile.salaryCents) })}</div>
        </div>
        <Pill tone="outline">{tn("ll_months", rows.length)}</Pill>
      </div>
      {rows.map((r, idx) => {
        const unpaid = r.status === PAY_STATUS.UNPAID;
        const partial = r.status === PAY_STATUS.PARTIAL;
        const yearHead = showYears && (idx === 0 || Math.floor(rows[idx - 1].period / 100) !== Math.floor(r.period / 100));
        const es = employerStateOf(r, windowDays, fastForward);
        const isOpen = openPeriod === r.period;
        const act = activity?.period === r.period ? activity : null;
        const days = r.signedAt ? Math.floor(fastForward ? Math.max(daysSince(r.signedAt), windowDays) : daysSince(r.signedAt)) : 0;
        return (
          <div key={r.period} id={`month-${r.period}`}>
            {yearHead && <div className="year-head">{Math.floor(r.period / 100)}</div>}
            <button className="row" aria-expanded={isOpen} onClick={() => onOpenPeriod(isOpen ? null : r.period)}>
              <div>
                <div className="row-title">{monthLabel(r.period)}{unpaid && <Pill tone="bad" dot>{t("ll_not_paid")}</Pill>}{partial && <Pill tone="warn" dot>{t("ll_partly_paid")}</Pill>}</div>
                <div className="row-sub">
                  <span className="num">{sgd(r.amountCents)}</span>
                  {!r.payEventUID && <span className="faint">{t("ll_not_recorded")}</span>}
                  {es === "confirmed" && <span style={{ color: "var(--green)" }}>{t("ll_emp_confirmed")}</span>}
                  {es === "disputed" && <span style={{ color: "var(--red)" }}>{t("ll_emp_disputed")}</span>}
                  {es === "waiting" && <span className="faint">{t("ll_emp_waiting")}</span>}
                  {es === "silent" && <span style={{ color: "var(--red)" }}>{t("ll_emp_silent")}</span>}
                  {r.proof && <span style={{ color: "var(--green)" }}>{t("ll_bank_proof")}</span>}
                </div>
              </div>
              <div className="row-right">
                {r.payEventUID ? <Pill tone="ok"><Icon name="lock" size={12} />{t("ll_recorded")}</Pill> : <Pill tone="neutral">{t("ll_draft")}</Pill>}
                <Icon name="chevron" size={16} className="faint" />
              </div>
            </button>
            {isOpen && (
              <div className="row-detail">
                {act ? (
                  <Stages stage={act.stage} txHash={act.txHash} labels={act.kind === "proof" ? { preparing: t("st_proof_preparing"), signing: t("st_proof_signing"), done: t("st_proof_done") } : undefined} />
                ) : (
                  <>
                    <dl className="kv">
                      <dt>{t("ll_status")}</dt><dd>{unpaid ? t("ll_status_unpaid") : partial ? t("ll_status_partial", { amount: sgd(r.amountCents) }) : t("ll_status_paid")}</dd>
                      {r.note && <><dt>{t("ll_note")}</dt><dd>{r.note}</dd></>}
                      <dt>{t("ll_record")}</dt>
                      <dd>{r.payEventUID ? <a href={explorer.attestation(r.payEventUID)} target="_blank" rel="noreferrer">{t("ll_signed_on", { date: r.signedAt ? dateFmt(r.signedAt) : "" })} <Icon name="link" size={12} /></a> : <span className="faint">{t("ll_not_on_chain")}</span>}</dd>
                      <dt>{t("ll_employer")}</dt>
                      <dd>
                        {es === "confirmed" && <a href={explorer.attestation(r.countersign!.uid)} target="_blank" rel="noreferrer">{t("ll_confirmed_by", { key: shortAddr(r.countersign!.employer) })} <Icon name="link" size={12} /></a>}
                        {es === "disputed" && <a href={explorer.attestation(r.countersign!.uid)} target="_blank" rel="noreferrer" style={{ color: "var(--red)" }}>{t("ll_disputed_by", { key: shortAddr(r.countersign!.employer) })} <Icon name="link" size={12} /></a>}
                        {es === "waiting" && <span className="faint">{days === 0 ? t("ll_asked_today") : tn("ll_asked_days", days)}</span>}
                        {es === "silent" && <span style={{ color: "var(--red)" }}>{t("ll_silent_days", { n: windowDays })}</span>}
                        {es === "none" && <span className="faint">{t("ll_record_first")}</span>}
                      </dd>
                    </dl>
                    {r.proof && (
                      <div className="proof">
                        <div className="proof-head"><Icon name="bank" size={14} /> {t("ll_proof_head")} · {r.proof.method === PROOF_METHOD.ZKTLS ? t("ll_proof_zktls") : t("ll_proof_signed")}</div>
                        <div className="proof-body">{proofSummary(r)}</div>
                        <div className="proof-foot">{t("ll_proof_foot")} <a href={explorer.attestation(r.proof.uid)} target="_blank" rel="noreferrer">{t("ll_on_chain")}</a></div>
                      </div>
                    )}
                    <div className="actions">
                      {!r.payEventUID && <Button variant="primary" disabled={busy} onClick={() => onRecord(r.period, r.status === PAY_STATUS.UNPAID ? 2 : 1)} icon={<Icon name="lock" size={16} />}>{t("ll_sign_record")}</Button>}
                      {!r.payEventUID && <Button variant="ghost" disabled={busy} onClick={() => onRecord(r.period, unpaid ? 1 : 2)}>{unpaid ? t("ll_mark_paid") : t("ll_mark_unpaid")}</Button>}
                      {r.payEventUID && unpaid && !r.proof && <Button variant="accent" disabled={busy} onClick={() => onProve(r.period)} icon={<Icon name="bank" size={16} />}>{t("ll_prove")}</Button>}
                      {r.payEventUID && (es === "waiting" || es === "silent") && <Button variant="ghost" disabled={busy} onClick={onAskEmployer} icon={<Icon name="whatsapp" size={16} />}>{t("ll_remind")}</Button>}
                      <Button variant="ghost" disabled={busy} onClick={() => onEdit(r)}>{r.payEventUID ? t("ll_edit_rerecord") : t("ll_edit_draft")}</Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
