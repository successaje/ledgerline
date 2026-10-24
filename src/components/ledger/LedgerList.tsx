"use client";
import { useState } from "react";
import type { Activity } from "@/hooks/useLedger";
import type { Ledger, PayRecord } from "@/domain/types";
import { PAY_STATUS, PROOF_METHOD } from "@/domain/types";
import { daysSince, periodLabel, sgd, shortAddr } from "@/domain/format";
import { explorer } from "@/services/chain";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Stages } from "@/components/ui/Stages";

export const CONFIRM_WINDOW_DAYS = 3;

type Props = {
  ledger: Ledger;
  activity: Activity | null;
  fastForward: boolean;
  busy: boolean;
  onRecord: (period: number, status: 1 | 2) => void;
  onProve: (period: number) => void;
  onAskEmployer: () => void;
};

function employerState(r: PayRecord, ff: boolean) {
  if (r.countersign) return r.countersign.decision === 1 ? "confirmed" : "disputed";
  if (!r.payEventUID) return "none";
  const d = r.signedAt ? daysSince(r.signedAt) : 0;
  return (ff ? Math.max(d, CONFIRM_WINDOW_DAYS + 0.5) : d) >= CONFIRM_WINDOW_DAYS ? "silent" : "waiting";
}

export function LedgerList({ ledger, activity, fastForward, busy, onRecord, onProve, onAskEmployer }: Props) {
  const [open, setOpen] = useState<number | null>(() => ledger.records.find(r => r.status === PAY_STATUS.UNPAID)?.period ?? null);
  const rows = [...ledger.records].sort((a, b) => b.period - a.period);

  return (
    <div className="ledger">
      <div className="ledger-head">
        <div>
          <div style={{ fontWeight: 600 }}>{ledger.profile.name}'s pay record</div>
          <div className="small muted">{ledger.profile.employerLabel} · {sgd(ledger.profile.salaryCents)} a month</div>
        </div>
        <Pill tone="outline">{rows.length} months</Pill>
      </div>
      {rows.map(r => {
        const unpaid = r.status === PAY_STATUS.UNPAID;
        const es = employerState(r, fastForward);
        const isOpen = open === r.period;
        const act = activity?.period === r.period ? activity : null;
        const days = r.signedAt ? Math.floor(fastForward ? Math.max(daysSince(r.signedAt), CONFIRM_WINDOW_DAYS) : daysSince(r.signedAt)) : 0;
        return (
          <div key={r.period}>
            <button className="row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.period)}>
              <div>
                <div className="row-title">{periodLabel(r.period)}{unpaid && <Pill tone="bad" dot>Not paid</Pill>}</div>
                <div className="row-sub">
                  <span className="num">{sgd(r.amountCents)}</span>
                  {!r.payEventUID && <span className="faint">· not recorded yet</span>}
                  {es === "confirmed" && <span style={{ color: "var(--green)" }}>· employer confirmed</span>}
                  {es === "disputed" && <span style={{ color: "var(--red)" }}>· employer disputed</span>}
                  {es === "waiting" && <span className="faint">· waiting for employer</span>}
                  {es === "silent" && <span style={{ color: "var(--red)" }}>· employer did not confirm</span>}
                  {r.proof && <span style={{ color: "var(--green)" }}>· bank proof</span>}
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
                      <dt>Status</dt><dd>{unpaid ? "You marked this month as not paid" : "You marked this month as paid"}</dd>
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
