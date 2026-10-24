import type { Ledger, PayRecord, PayStatus, ProofMethod } from "@/domain/types";
import { idFromLabel } from "@/domain/ids";
import { getByAttester, getReferencing } from "./chain";

/**
 * Rebuilds a ledger from the chain for a worker key. Names and notes were never on chain,
 * so the person supplies them again; months, amounts, statuses, employer answers and proofs come from attestations.
 */
export async function rebuildFromChain(input: {
  address: string;
  schemas: { payEvent: string; countersign: string; bankProof: string };
  name: string; employerLabel: string; salaryCents: number;
}): Promise<Ledger> {
  const events = await getByAttester(input.address, input.schemas.payEvent);
  // Keep the latest attestation per period (a month can be re-recorded).
  const byPeriod = new Map<number, (typeof events)[number]>();
  for (const a of events) byPeriod.set(Number(a.decoded.period), a);
  const latest = [...byPeriod.values()];
  const uids = latest.map(a => a.id);
  const [countersigns, proofs] = await Promise.all([
    getReferencing(uids, input.schemas.countersign),
    getReferencing(uids, input.schemas.bankProof),
  ]);
  const records: PayRecord[] = latest.map(a => {
    const cs = countersigns.find(c => c.refUID === a.id);
    const pf = proofs.find(p => p.refUID === a.id && p.attester.toLowerCase() === input.address.toLowerCase());
    const r: PayRecord = {
      period: Number(a.decoded.period),
      amountCents: Number(a.decoded.amountCents),
      status: Number(a.decoded.status) as PayStatus,
      payEventUID: a.id,
      payEventTx: a.txid,
      signedAt: Number(a.time) * 1000,
    };
    if (cs) r.countersign = { uid: cs.id, decision: Number(cs.decoded.decision) as 1 | 2, employer: cs.attester, at: Number(cs.time) * 1000 };
    if (pf) r.proof = {
      uid: pf.id, satisfied: Boolean(pf.decoded.satisfied), method: Number(pf.decoded.method) as ProofMethod,
      summary: "Bank proof recorded on chain. The proof text stayed on the previous device, so this month cannot be re-bundled with it.",
      proofJson: "", window: { from: "", to: "" }, at: Number(pf.time) * 1000,
    };
    return r;
  }).sort((x, y) => x.period - y.period);
  const employerId = latest[0] ? String(latest[0].decoded.employerId) : idFromLabel(input.employerLabel);
  return {
    profile: { name: input.name.trim(), employerLabel: input.employerLabel.trim(), employerId, salaryCents: input.salaryCents, payWindow: { fromDay: 1, toDay: 10 } },
    records,
  };
}
