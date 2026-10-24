"use client";
import { useEffect, useState } from "react";
import type { PayRecord, PayStatus } from "@/domain/types";
import { PAY_STATUS } from "@/domain/types";
import { periodLabel } from "@/domain/format";
import { nextPeriod } from "@/domain/due";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, MoneyInput, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { Icon } from "@/components/ui/Icon";

type Props = {
  open: boolean; onClose: () => void;
  record?: PayRecord;                 // editing an existing month
  suggestedPeriod?: number;           // adding a new month
  takenPeriods: number[];
  salaryCents: number;
  busy: boolean;
  onSaveDraft: (period: number, status: PayStatus, amountCents: number, note?: string) => void;
  onRecord: (period: number, status: PayStatus, amountCents: number, note?: string) => Promise<unknown>;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Add or edit a month: period, paid / partly paid / not paid, amount, note. Re-recording supersedes the old attestation. */
export function MonthSheet({ open, onClose, record, suggestedPeriod, takenPeriods, salaryCents, busy, onSaveDraft, onRecord }: Props) {
  const editing = Boolean(record);
  const [period, setPeriod] = useState(record?.period ?? suggestedPeriod ?? 202601);
  const [status, setStatus] = useState<PayStatus>(record?.status ?? PAY_STATUS.PAID);
  const [amount, setAmount] = useState(String((record?.amountCents ?? salaryCents) / 100));
  const [note, setNote] = useState(record?.note ?? "");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPeriod(record?.period ?? suggestedPeriod ?? nextPeriod(Math.max(...takenPeriods, 202512)));
    setStatus(record?.status ?? PAY_STATUS.PAID);
    setAmount(String((record?.amountCents ?? salaryCents) / 100));
    setNote(record?.note ?? "");
    setErr(null);
  }, [open, record, suggestedPeriod, salaryCents, takenPeriods]);

  const cents = Math.round(parseFloat(amount || "0") * 100);
  const year = Math.floor(period / 100), month = period % 100;
  const clash = !editing && takenPeriods.includes(period);

  function validate() {
    if (clash) { setErr(`${periodLabel(period)} is already in your record. Edit it from the list instead.`); return false; }
    if (status !== PAY_STATUS.UNPAID && !(cents > 0)) { setErr("Enter the amount you received."); return false; }
    if (status === PAY_STATUS.PARTIAL && cents >= salaryCents) { setErr("A partial payment should be less than your full salary."); return false; }
    return true;
  }

  const effectiveAmount = status === PAY_STATUS.UNPAID ? (record?.amountCents ?? salaryCents) : cents;

  return (
    <Sheet open={open} onClose={onClose} title={editing ? `Edit ${periodLabel(record!.period)}` : "Add a month"}>
      <div style={{ display: "grid", gap: 14 }}>
        {!editing && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field id="m" label="Month"><select id="m" className="input" value={month} onChange={e => setPeriod(year * 100 + Number(e.target.value))}>{MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></Field>
            <Field id="y" label="Year"><select id="y" className="input" value={year} onChange={e => setPeriod(Number(e.target.value) * 100 + month)}>{[year - 2, year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}</select></Field>
          </div>
        )}
        <div className="field">
          <label>Were you paid?</label>
          <div className="segment" role="radiogroup" aria-label="Payment status">
            {([PAY_STATUS.PAID, PAY_STATUS.PARTIAL, PAY_STATUS.UNPAID] as PayStatus[]).map(s => (
              <button key={s} type="button" role="radio" aria-checked={status === s} className={`segment-btn ${status === s ? "on" : ""} ${s === PAY_STATUS.UNPAID ? "bad" : s === PAY_STATUS.PARTIAL ? "warn" : "ok"}`} onClick={() => setStatus(s)}>
                {s === PAY_STATUS.PAID ? "Paid in full" : s === PAY_STATUS.PARTIAL ? "Partly paid" : "Not paid"}
              </button>
            ))}
          </div>
        </div>
        {status !== PAY_STATUS.UNPAID && (
          <Field id="amt" label={status === PAY_STATUS.PARTIAL ? "Amount received" : "Amount"} hint={status === PAY_STATUS.PARTIAL ? `Your full salary is S$${salaryCents / 100}.` : undefined}>
            <MoneyInput id="amt" value={amount} onChange={e => setAmount(e.target.value)} />
          </Field>
        )}
        <Field id="note" label="Note (stays on this phone)" hint="Only a hash of the note goes on chain. Useful for dates, deductions or what the employer said.">
          <TextInput id="note" value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="e.g. paid on the 12th, S$50 deducted for breakage" />
        </Field>
        {editing && record?.payEventUID && <Notice kind="warn" title="Re-recording replaces this month">The employer's answer and any bank proof for the old record will no longer apply. The employer will be asked again.</Notice>}
        {err && <Notice kind="error">{err}</Notice>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Button disabled={busy} onClick={() => { if (!validate()) return; onSaveDraft(period, status, effectiveAmount, note.trim() || undefined); onClose(); }}>Save as draft</Button>
          <Button variant="primary" disabled={busy} icon={<Icon name="lock" />} onClick={async () => { if (!validate()) return; onClose(); await onRecord(period, status, effectiveAmount, note.trim() || undefined).catch(() => {}); }}>{editing && record?.payEventUID ? "Re-record" : "Sign and record"}</Button>
        </div>
      </div>
    </Sheet>
  );
}
