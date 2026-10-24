import type { Ledger, PayRecord, Period } from "./types";
import { PAY_STATUS, expectedOf, receivedOf, submissionOf } from "./types";
import { currentPeriod, daysSince } from "./format";
import { periodDue, nextPeriod } from "./due";

/** Expected, received and the gap for one record. The gap is never negative. */
export function amounts(r: PayRecord, salaryCents: number) {
  const expected = expectedOf(r, salaryCents);
  const received = receivedOf(r);
  return { expected, received, gap: Math.max(0, expected - received) };
}

export type EmployerView =
  | { kind: "none" }
  | { kind: "waiting"; dueAt: number }
  | { kind: "acknowledged"; at: number; key: string }
  | { kind: "disagreed"; at: number; key: string }
  | { kind: "no_response"; dueAt: number };

/** The employer's position on a record, against the single response window carried by the profile. */
export function employerView(r: PayRecord, windowDays: number, fastForward = false, now = Date.now()): EmployerView {
  if (r.countersign) return { kind: r.countersign.decision === 1 ? "acknowledged" : "disagreed", at: r.countersign.at, key: r.countersign.employer };
  if (!r.payEventUID || !r.signedAt) return { kind: "none" };
  const dueAt = r.signedAt + windowDays * 86400000;
  const passed = fastForward || now >= dueAt;
  return passed ? { kind: "no_response", dueAt } : { kind: "waiting", dueAt };
}

/** The month Home shows: the current month once pay day has passed, otherwise the previous one. */
export function homePeriod(ledger: Ledger, now = new Date()): Period {
  return periodDue(now, ledger.profile.payDay ?? ledger.profile.payWindow.toDay);
}

/** Months between the latest record and the home period that have no record yet, oldest first. */
export function missingPeriods(ledger: Ledger, now = new Date()): Period[] {
  if (!ledger.records.length) return [];
  const target = homePeriod(ledger, now);
  let p = nextPeriod(Math.max(...ledger.records.map(r => r.period)));
  const out: Period[] = [];
  while (p <= target && p <= currentPeriod() && out.length < 24) { out.push(p); p = nextPeriod(p); }
  return out;
}

export type Attention =
  | { kind: "backup" }
  | { kind: "unknown"; periods: Period[] }
  | { kind: "drafts"; periods: Period[] }
  | { kind: "no_response"; periods: Period[] }
  | { kind: "waiting"; periods: Period[] };

/** What Home lists under "Needs your attention", most urgent first. */
export function attention(ledger: Ledger, fastForward = false, now = Date.now()): Attention[] {
  const out: Attention[] = [];
  const rs = ledger.records;
  const unknown = rs.filter(r => { const s = submissionOf(r); return s === "unknown" || s === "submitted"; }).map(r => r.period);
  if (unknown.length) out.push({ kind: "unknown", periods: unknown });
  if (!ledger.meta.backupVerifiedAt && !ledger.meta.demo && rs.some(r => r.payEventUID)) out.push({ kind: "backup" });
  const drafts = rs.filter(r => { const s = submissionOf(r); return s === "draft" || s === "failed"; }).map(r => r.period);
  if (drafts.length) out.push({ kind: "drafts", periods: drafts });
  const views = rs.map(r => ({ r, v: employerView(r, ledger.profile.confirmWindowDays, fastForward, now) }));
  const noresp = views.filter(x => x.v.kind === "no_response").map(x => x.r.period);
  if (noresp.length) out.push({ kind: "no_response", periods: noresp });
  const waiting = views.filter(x => x.v.kind === "waiting").map(x => x.r.period);
  if (waiting.length) out.push({ kind: "waiting", periods: waiting });
  return out;
}

export function isShort(r: PayRecord) { return r.status !== PAY_STATUS.PAID; }
export function ageDays(r: PayRecord) { return r.signedAt ? daysSince(r.signedAt) : 0; }
