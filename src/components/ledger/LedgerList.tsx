"use client";
import { useState } from "react";
import type { Activity } from "@/hooks/useLedger";
import type { Ledger, PayRecord } from "@/domain/types";
import { PAY_STATUS, PROOF_METHOD } from "@/domain/types";
import { daysSince, periodLabel, sgd, shortAddr } from "@/domain/format";
import { employerState as employerStateOf } from "@/domain/due";
import { explorer } from "@/services/chain";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Stages } from "@/components/ui/Stages";

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
  const open = openPeriod;
  const setOpen = onOpenPeriod;
  const rows = [...ledger.records].sort((a, b) => b.period - a.period);
  const CONFIRM_WINDOW_DAYS = ledger.profile.confirmWindowDays;
  const employerState = (r: PayRecord, ff: boolean) => employerStateOf(r, CONFIRM_WINDOW_DAYS, ff);
  const years = new Set(rows.map(r => Math.floor(r.period / 100)));
  const showYears = years.size > 1 || rows.length > 12;

  return (
    <div className="ledger">
      <div className="ledger-head">
        <div>
          <div style={{ fontWeight: 600 }}>{ledger.profile.name}'s pay record</div>
          <div className="small muted">{ledger.profile.employerLabel} · {sgd(ledger.profile.salaryCents)} a month</div>
        </div>
        <Pill tone="outline">{rows.length} months</Pill>
      </div>
      {rows.map((r, idx) => {
        const unpaid = r.status === PAY_STATUS.UNPAID;
        const partial = r.status === PAY_STATUS.PARTIAL;
        const yearHead = showYears && (idx === 0 || Math.floor(rows[idx - 1].period / 100) !== Math.floor(r.period / 100));
        const es = employerState(r, fastForward);
        const isOpen = open === r.period;
        const act = activity?.period === r.period ? activity : null;
        const days = r.signedAt ? Math.floor(fastForward ? Math.max(daysSince(r.signedAt), CONFIRM_WINDOW_DAYS) : daysSince(r.signedAt)) : 0;
        return (
          <div key={r.period} id={`month-${r.period}`}>
            {yearHead && <div className="year-head">{Math.floor(r.period / 100)}</div>}
            <button className="row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.period)}>
              <div>
                <div className="row-title">{periodLabel(r.period)}{unpaid && <Pill tone="bad" dot>Not paid</Pill>}{partial && <Pill tone="warn" dot>Partly paid</Pill>}</div>
                <div className="row-sub">
                  <span className="num">{sgd(r.amountCents)}</span>
                  {!r.payEventUID && <span className="faint">not recorded yet</span>}
                  {es === "confirmed" && <span style={{ color: "var(--green)" }}>employer confirmed</span>}
                  {es === "disputed" && <span style={{ color: "var(--red)" }}>employer disputed</span>}
                  {es === "waiting" && <span className="faint">waiting for employer</span>}
                  {es === "silent" && <span style={{ color: "var(--red)" }}>employer did not confirm</span>}
                  {r.proof && <span style={{ color: "var(--green)" }}>bank proof</span>}
                </div>
              </div>
              <div className="row-right">
                {r.payEventUID ? <Pill tone="ok"><Icon name="lock" size={12} />Recorded</Pill> : <Pill tone="neutral">Draft</Pill>}
                <Icon name="chevron" size={16} className="faint" />
              </div>
            </button>
            {isOpen && (
              <div className="row-detail">
                {act ? (
                  <Stages stage={act.stage} txHash={act.txHash} labels={act.kind === "proof" ? { preparing: "Reading your statement window", signing: "Signing the proof on this device", submitting: "Sending to Base", confirming: "Confirming on chain", done: "Proof recorded" } : undefined} />
                ) : (
                  <>
                    <dl className="kv">
                      <dt>Status</dt><dd>{unpaid ? "You marked this month as not paid" : partial ? `You marked this month as partly paid (${sgd(r.amountCents)})` : "You marked this month as paid"}</dd>
                      {r.note && <><dt>Note</dt><dd>{r.note}</dd></>}
                      <dt>Record</dt>
                      <dd>{r.payEventUID ? <a href={explorer.attestation(r.payEventUID)} target="_blank" rel="noreferrer">Signed {r.signedAt ? new Date(r.signedAt).toLocaleDateString("en-SG") : ""} <Icon name="link" size={12} /></a> : <span className="faint">Not on chain yet</span>}</dd>
                      <dt>Employer</dt>
                      <dd>
                        {es === "confirmed" && <a href={explorer.attestation(r.countersign!.uid)} target="_blank" rel="noreferrer">Confirmed by {shortAddr(r.countersign!.employer)} <Icon name="link" size={12} /></a>}
                        {es === "disputed" && <a href={explorer.attestation(r.countersign!.uid)} target="_blank" rel="noreferrer" style={{ color: "var(--red)" }}>Disputed by {shortAddr(r.countersign!.employer)} <Icon name="link" size={12} /></a>}
                        {es === "waiting" && <span className="faint">Asked {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`}, no answer yet</span>}
                        {es === "silent" && <span style={{ color: "var(--red)" }}>Did not confirm within {CONFIRM_WINDOW_DAYS} days</span>}
                        {es === "none" && <span className="faint">Record this month first</span>}
                      </dd>
                    </dl>
                    {r.proof && (
                      <div className="proof">
                        <div className="proof-head"><Icon name="bank" size={14} /> Bank statement proof · {r.proof.method === PROOF_METHOD.ZKTLS ? "zkTLS" : "signed attestor"}</div>
                        <div className="proof-body">{r.proof.summary}</div>
                        <div className="proof-foot">Nothing else from the statement was disclosed. <a href={explorer.attestation(r.proof.uid)} target="_blank" rel="noreferrer">On chain</a></div>
                      </div>
                    )}
                    <div className="actions">
                      {!r.payEventUID && <Button variant="primary" disabled={busy} onClick={() => onRecord(r.period, r.status === PAY_STATUS.UNPAID ? 2 : 1)} icon={<Icon name="lock" size={16} />}>Sign and record</Button>}
                      {!r.payEventUID && <Button variant="ghost" disabled={busy} onClick={() => onRecord(r.period, unpaid ? 1 : 2)}>{unpaid ? "Mark as paid instead" : "Mark as not paid"}</Button>}
                      {r.payEventUID && unpaid && !r.proof && <Button variant="accent" disabled={busy} onClick={() => onProve(r.period)} icon={<Icon name="bank" size={16} />}>Prove from my bank</Button>}
                      {r.payEventUID && (es === "waiting" || es === "silent") && <Button variant="ghost" disabled={busy} onClick={onAskEmployer} icon={<Icon name="whatsapp" size={16} />}>Remind employer</Button>}
                      <Button variant="ghost" disabled={busy} onClick={() => onEdit(r)}>{r.payEventUID ? "Edit or re-record" : "Edit draft"}</Button>
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
