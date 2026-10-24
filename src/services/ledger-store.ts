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
    if (s) return normalise(JSON.parse(s) as Ledger);
    const legacy = migrateLegacyState();
    return legacy ? normalise(legacy) : null;
  } catch { return null; }
}

/** Fills in fields added after a ledger was first saved, so older local data keeps working. */
export function normalise(l: Ledger): Ledger {
  const profile: Profile = { ...l.profile, confirmWindowDays: l.profile.confirmWindowDays ?? 3, payWindow: l.profile.payWindow || { fromDay: 1, toDay: 10 }, payDay: l.profile.payDay ?? (l.profile.payWindow?.toDay ?? 10) };
  const meta = l.meta || { createdAt: Math.min(Date.now(), ...l.records.map(r => r.signedAt || Date.now())) };
  if (profile.sample && meta.demo === undefined) meta.demo = true;
  const records = l.records.map(r => {
    const n: PayRecord = { ...r };
    if (typeof n.expectedCents !== "number") n.expectedCents = n.status === PAY_STATUS.PAID ? n.amountCents : profile.salaryCents;
    if (n.status === PAY_STATUS.UNPAID && n.amountCents !== 0 && n.payEventUID) {
      // v1 records stored the owed amount for unpaid months; keep the chain value in amountCents but expose 0 received through receivedOf().
    }
    if (!n.submission) n.submission = { state: n.payEventUID ? "confirmed" : "draft", at: n.signedAt || meta.createdAt, txHash: n.payEventTx };
    return n;
  });
  return { profile, records: records.sort((a, b) => a.period - b.period), meta };
}

export function exportLedger(l: Ledger): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: "ledgerline", version: 1, ...l }, null, 2);
}

/** Pre-release builds kept a flat worker state. Convert it once so recorded months are not orphaned. */
function migrateLegacyState(): Ledger | null {
  const raw = window.localStorage.getItem("ll.worker.state");
  if (!raw) return null;
  try {
    const old = JSON.parse(raw) as { name: string; employerLabel: string; employerId: string; records: (PayRecord & { proof?: PayRecord["proof"] & { window?: { from: string; to: string } } })[] };
    const salary = old.records[0]?.amountCents || 0;
    const l: Ledger = {
      profile: { name: old.name, employerLabel: old.employerLabel, employerId: old.employerId, salaryCents: salary, payWindow: { fromDay: 1, toDay: 10 }, confirmWindowDays: 3, sample: old.name === "Maria" },
      records: old.records.map(r => ({ ...r, proof: r.proof ? { ...r.proof, window: r.proof.window || { from: "", to: "" } } : undefined })),
      meta: { createdAt: Date.now() },
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

export function newLedger(input: { name: string; employerLabel: string; salaryCents: number; startPeriod?: number; endPeriod?: number; payDay?: number }): Ledger {
  const payDay = input.payDay ?? 10;
  const profile: Profile = {
    name: input.name.trim(),
    employerLabel: input.employerLabel.trim(),
    employerId: idFromLabel(input.employerLabel),
    salaryCents: input.salaryCents,
    payDay,
    payWindow: { fromDay: 1, toDay: Math.min(28, Math.max(payDay, 1)) },
    confirmWindowDays: 3,
  };
  const records: PayRecord[] = [];
  if (input.startPeriod && input.endPeriod) {
    for (let p = input.startPeriod; p <= input.endPeriod; p = p % 100 === 12 ? (Math.floor(p / 100) + 1) * 100 + 1 : p + 1) {
      records.push({ period: p, expectedCents: input.salaryCents, amountCents: input.salaryCents, status: PAY_STATUS.PAID, submission: { state: "draft", at: Date.now() } });
    }
  }
  return { profile, records, meta: { createdAt: Date.now() } };
}

/** The sample ledger: Maria, nine months at S$700, July partly paid (S$500 received). Labelled demo everywhere. */
export function sampleLedger(): Ledger {
  const l = newLedger({ name: "Maria", employerLabel: "Mdm Tan (+65 9xxx 1234)", salaryCents: 70000, startPeriod: 202601, endPeriod: 202609, payDay: 10 });
  l.profile.sample = true;
  l.meta.demo = true;
  const july = l.records.find(r => r.period === 202607)!;
  july.status = PAY_STATUS.PARTIAL;
  july.amountCents = 50000;
  return l;
}

export function upsertRecord(l: Ledger, period: number, patch: Partial<PayRecord>): Ledger {
  const records = l.records.some(r => r.period === period)
    ? l.records.map(r => (r.period === period ? { ...r, ...patch } : r))
    : [...l.records, { period, expectedCents: l.profile.salaryCents, amountCents: l.profile.salaryCents, status: PAY_STATUS.PAID, submission: { state: "draft" as const, at: Date.now() }, ...patch }].sort((a, b) => a.period - b.period);
  return { ...l, records };
}
