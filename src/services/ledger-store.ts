"use client";
import type { Ledger, PayRecord, Profile } from "@/domain/types";
import { PAY_STATUS } from "@/domain/types";
import { idFromLabel } from "@/domain/ids";

/**
 * Local-first store of the worker's own ledger. On-chain attestations are the source of truth for what was recorded;
 * this holds the human-readable detail that never goes on chain (names, notes) and the UIDs that link to the chain.
 */
const KEY = "ll.ledger.v1";

export function loadLedger(): Ledger | null {
  try {
    const s = window.localStorage.getItem(KEY);
    if (s) return JSON.parse(s) as Ledger;
    return migrateLegacyState();
  } catch { return null; }
}

/** Pre-release builds kept a flat worker state. Convert it once so recorded months are not orphaned. */
function migrateLegacyState(): Ledger | null {
  const raw = window.localStorage.getItem("ll.worker.state");
  if (!raw) return null;
  try {
    const old = JSON.parse(raw) as { name: string; employerLabel: string; employerId: string; records: (PayRecord & { proof?: PayRecord["proof"] & { window?: { from: string; to: string } } })[] };
    const salary = old.records[0]?.amountCents || 0;
    const l: Ledger = {
      profile: { name: old.name, employerLabel: old.employerLabel, employerId: old.employerId, salaryCents: salary, payWindow: { fromDay: 1, toDay: 10 }, sample: old.name === "Maria" },
      records: old.records.map(r => ({ ...r, proof: r.proof ? { ...r.proof, window: r.proof.window || { from: "", to: "" } } : undefined })),
    };
    saveLedger(l);
    window.localStorage.removeItem("ll.worker.state");
    return l;
  } catch { return null; }
}

export function saveLedger(l: Ledger) {
  try { window.localStorage.setItem(KEY, JSON.stringify(l)); } catch {}
}

export function clearLedger() {
  try { window.localStorage.removeItem(KEY); } catch {}
}

export function newLedger(input: { name: string; employerLabel: string; salaryCents: number; startPeriod: number; endPeriod: number }): Ledger {
  const profile: Profile = {
    name: input.name.trim(),
    employerLabel: input.employerLabel.trim(),
    employerId: idFromLabel(input.employerLabel),
    salaryCents: input.salaryCents,
    payWindow: { fromDay: 1, toDay: 10 },
  };
  const records: PayRecord[] = [];
  for (let p = input.startPeriod; p <= input.endPeriod; p = p % 100 === 12 ? (Math.floor(p / 100) + 1) * 100 + 1 : p + 1) {
    records.push({ period: p, amountCents: input.salaryCents, status: PAY_STATUS.PAID });
  }
  return { profile, records };
}

/** The sample ledger used for evaluation: Maria, nine months at S$600, July unpaid. */
export function sampleLedger(): Ledger {
  const l = newLedger({ name: "Maria", employerLabel: "Mdm Tan (+65 9xxx 1234)", salaryCents: 60000, startPeriod: 202601, endPeriod: 202609 });
  l.profile.sample = true;
  const july = l.records.find(r => r.period === 202607)!;
  july.status = PAY_STATUS.UNPAID;
  return l;
}

export function upsertRecord(l: Ledger, period: number, patch: Partial<PayRecord>): Ledger {
  const records = l.records.some(r => r.period === period)
    ? l.records.map(r => (r.period === period ? { ...r, ...patch } : r))
    : [...l.records, { period, amountCents: l.profile.salaryCents, status: PAY_STATUS.PAID, ...patch }].sort((a, b) => a.period - b.period);
  return { ...l, records };
}
