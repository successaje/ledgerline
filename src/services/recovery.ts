import type { Ledger, PayRecord, PayStatus, ProofMethod } from "@/domain/types";
import { idFromLabel } from "@/domain/ids";
import { getByAttester, getReferencing, type IndexedAttestation } from "./chain";

type Schemas = { payEvent: string; payEventV2?: string; countersign: string; bankProof: string };

/** PayEvents for a key across both schema versions, ascending by time. */
async function payEvents(address: string, schemas: Schemas): Promise<IndexedAttestation[]> {
  const [v1, v2] = await Promise.all([getByAttester(address, schemas.payEvent), schemas.payEventV2 ? getByAttester(address, schemas.payEventV2) : Promise.resolve([])]);
  return [...v1, ...v2].sort((a, b) => a.time - b.time);
}

/** The record fields an attestation carries, for either schema version. */
export function fieldsOf(a: IndexedAttestation): Pick<PayRecord, "amountCents" | "expectedCents" | "status" | "supersedes" | "payEventSchema"> {
  const status = Number(a.decoded.status) as PayStatus;
  if ("receivedCents" in a.decoded) {
    const sup = String(a.decoded.supersedes || "");
    return { amountCents: Number(a.decoded.receivedCents), expectedCents: Number(a.decoded.expectedCents), status, supersedes: /^0x0+$/.test(sup) ? undefined : sup, payEventSchema: 2 };
  }
  return { amountCents: Number(a.decoded.amountCents), status, payEventSchema: 1 };
}

/**
 * Rebuilds a ledger from the chain for a worker key. Names and notes were never on chain,
 * so the person supplies them again; months, amounts, statuses, employer answers and proofs come from attestations.
 */
export async function rebuildFromChain(input: {
  address: string;
  schemas: Schemas;
  name: string; employerLabel: string; salaryCents: number;
}): Promise<Ledger> {
  const events = await payEvents(input.address, input.schemas);
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
      ...fieldsOf(a),
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
    profile: { name: input.name.trim(), employerLabel: input.employerLabel.trim(), employerId, salaryCents: input.salaryCents, payWindow: { fromDay: 1, toDay: 10 }, confirmWindowDays: 3 },
    records,
    meta: { createdAt: Date.now(), lastSyncAt: Date.now() },
  };
}

export type MergeResult = { ledger: Ledger; added: number; updated: number; answers: number; proofs: number };

/**
 * Reconciles the local ledger with the chain for this key: adopts records the device does not know about
 * (a refresh mid-transaction, another device), picks up employer answers and proofs, and keeps local detail
 * (notes, proof text) untouched. Never deletes anything local.
 */
export async function mergeFromChain(ledger: Ledger, address: string, schemas: Schemas): Promise<MergeResult> {
  const events = await payEvents(address, schemas);
  const byPeriod = new Map<number, (typeof events)[number]>();
  for (const a of events) byPeriod.set(Number(a.decoded.period), a); // ascending time: last wins
  let added = 0, updated = 0;
  const records = [...ledger.records];
  for (const [period, a] of byPeriod) {
    const i = records.findIndex(r => r.period === period);
    const fromChain = { payEventUID: a.id, payEventTx: a.txid, signedAt: Number(a.time) * 1000, ...fieldsOf(a) };
    const confirmed = { state: "confirmed" as const, txHash: a.txid, at: Number(a.time) * 1000 };
    if (i === -1) { records.push({ period, ...fromChain, submission: confirmed }); added++; }
    else if (records[i].payEventUID !== a.id) {
      // Chain has a newer or unknown attestation for this month; adopt it but keep notes and any proof/countersign that reference it.
      const keepCountersign = records[i].countersign && records[i].payEventUID === a.id ? records[i].countersign : undefined;
      records[i] = { ...records[i], ...fromChain, submission: confirmed, countersign: keepCountersign, proof: records[i].proof && records[i].payEventUID === a.id ? records[i].proof : undefined };
      updated++;
    } else if (records[i].submission && records[i].submission!.state !== "confirmed") {
      records[i] = { ...records[i], submission: confirmed };
    }
  }
  records.sort((x, y) => x.period - y.period);
  const needAnswers = records.filter(r => r.payEventUID && !r.countersign).map(r => r.payEventUID!);
  const needProofs = records.filter(r => r.payEventUID && !r.proof).map(r => r.payEventUID!);
  const [cs, pf] = await Promise.all([getReferencing(needAnswers, schemas.countersign), getReferencing(needProofs, schemas.bankProof)]);
  let answers = 0, proofs = 0;
  for (const c of cs) {
    const r = records.find(x => x.payEventUID === c.refUID);
    if (r && !r.countersign) { r.countersign = { uid: c.id, decision: Number(c.decoded.decision) as 1 | 2, employer: c.attester, at: Number(c.time) * 1000 }; answers++; }
  }
  for (const p of pf) {
    const r = records.find(x => x.payEventUID === p.refUID);
    if (r && !r.proof && p.attester.toLowerCase() === address.toLowerCase()) {
      r.proof = { uid: p.id, satisfied: Boolean(p.decoded.satisfied), method: Number(p.decoded.method) as ProofMethod, summary: "Bank proof recorded on chain from another device; the proof text is not on this phone.", proofJson: "", window: { from: "", to: "" }, at: Number(p.time) * 1000 };
      proofs++;
    }
  }
  return { ledger: { ...ledger, records, meta: { ...ledger.meta, lastSyncAt: Date.now() } }, added, updated, answers, proofs };
}
