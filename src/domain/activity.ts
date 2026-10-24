import type { Ledger, Period } from "./types";
import { periodLabel, sgd } from "./format";

export type ActivityKind = "recorded" | "confirmed" | "disputed" | "proof" | "unpaid";
export type ActivityEvent = { at: number; kind: ActivityKind; period: Period; text: string; uid?: string };

/** Human-readable history derived from the ledger. Newest first. No hashes in the text. */
export function deriveActivity(ledger: Ledger): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const r of ledger.records) {
    const m = periodLabel(r.period);
    if (r.payEventUID && r.signedAt) {
      out.push({ at: r.signedAt, kind: r.status === 2 ? "unpaid" : "recorded", period: r.period, uid: r.payEventUID,
        text: r.status === 2 ? `You recorded ${m} as not paid (${sgd(r.amountCents)})` : r.status === 3 ? `You recorded ${m} as partly paid (${sgd(r.amountCents)})` : `You recorded ${m} as paid (${sgd(r.amountCents)})` });
    }
    if (r.countersign) {
      out.push({ at: r.countersign.at, kind: r.countersign.decision === 1 ? "confirmed" : "disputed", period: r.period, uid: r.countersign.uid,
        text: r.countersign.decision === 1 ? `Employer confirmed ${m}` : `Employer disputed ${m}` });
    }
    if (r.proof) {
      out.push({ at: r.proof.at, kind: "proof", period: r.period, uid: r.proof.uid,
        text: r.proof.satisfied ? `Bank proof added for ${m}: no salary-sized credit in the pay window` : `Bank proof added for ${m}: a matching credit was found` });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

/** Events that happened after the person last opened the app. */
export function sinceLastVisit(ledger: Ledger, lastSeenAt: number | undefined): ActivityEvent[] {
  if (!lastSeenAt) return [];
  return deriveActivity(ledger).filter(e => e.at > lastSeenAt && (e.kind === "confirmed" || e.kind === "disputed"));
}
