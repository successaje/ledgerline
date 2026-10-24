import type { Ledger, PayRecord, Period } from "./types";
import { currentPeriod, prevPeriod, daysSince } from "./format";

export type Due =
  | { kind: "record-month"; period: Period }                       // pay window has passed, month not in the ledger
  | { kind: "draft"; count: number }                               // months saved but not signed
  | { kind: "awaiting"; count: number; oldestDays: number }        // asked employer, no answer yet
  | { kind: "silent"; count: number }                              // employer window elapsed
  | { kind: "first-month" };                                       // nothing recorded yet

export function nextPeriod(p: Period): Period {
  const y = Math.floor(p / 100), m = p % 100;
  return m === 12 ? (y + 1) * 100 + 1 : p + 1;
}

/** The month that should be recorded next: the current month once its pay window has closed, otherwise last month. */
export function periodDue(now: Date, payWindowToDay: number): Period {
  const cur = now.getFullYear() * 100 + now.getMonth() + 1;
  return now.getDate() > payWindowToDay ? cur : prevPeriod(cur);
}

export function employerState(r: PayRecord, windowDays: number, fastForward = false): "none" | "confirmed" | "disputed" | "waiting" | "silent" {
  if (r.countersign) return r.countersign.decision === 1 ? "confirmed" : "disputed";
  if (!r.payEventUID) return "none";
  const d = r.signedAt ? daysSince(r.signedAt) : 0;
  return (fastForward ? Math.max(d, windowDays + 0.5) : d) >= windowDays ? "silent" : "waiting";
}

/** What needs attention, most important first. At most three items. */
export function computeDue(ledger: Ledger, now = new Date(), fastForward = false): Due[] {
  const out: Due[] = [];
  const recorded = ledger.records.filter(r => r.payEventUID);
  if (ledger.records.length === 0 || recorded.length === 0) { out.push({ kind: "first-month" }); return out; }
  const due = periodDue(now, ledger.profile.payWindow.toDay);
  const latest = Math.max(...ledger.records.map(r => r.period));
  if (due > latest && due <= currentPeriod()) out.push({ kind: "record-month", period: due });
  const drafts = ledger.records.filter(r => !r.payEventUID).length;
  if (drafts) out.push({ kind: "draft", count: drafts });
  const states = recorded.map(r => ({ r, s: employerState(r, ledger.profile.confirmWindowDays, fastForward) }));
  const silent = states.filter(x => x.s === "silent").length;
  if (silent) out.push({ kind: "silent", count: silent });
  const waiting = states.filter(x => x.s === "waiting");
  if (waiting.length) out.push({ kind: "awaiting", count: waiting.length, oldestDays: Math.floor(Math.max(...waiting.map(x => daysSince(x.r.signedAt || Date.now())))) });
  return out.slice(0, 3);
}
