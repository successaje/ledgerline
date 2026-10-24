import type { Bundle, BundleItem } from "@/domain/bundle";
import { PAY_STATUS } from "@/domain/types";
import { periodLabel, sgd } from "@/domain/format";
import { describePredicate, verifyProofJson } from "@/domain/proof";
import { getAttestation, getReferencing, type IndexedAttestation } from "./chain";

/**
 * Outcome of one independent check.
 * passed: the check ran and holds. failed: the check ran and does not hold.
 * not_checked: nothing to check (e.g. no proof in the bundle) or no finding yet (an employer still within their window).
 * unavailable: the check could not run (index lag, timeout). Never shown as a failure.
 */
export type Outcome = "passed" | "failed" | "not_checked" | "unavailable";
export type Check = { outcome: Outcome; category: "format" | "integrity" | "availability" | "response" | "evidence"; label: string; detail?: string; link?: string };
export type ItemVerdict = { item: BundleItem; checks: Check[]; sentence: string; employerKey?: string; found: boolean; paymentLabel: string };

export const DEFAULT_RESPONSE_WINDOW_DAYS = 3;

export function paymentLabel(status: number) {
  return status === PAY_STATUS.UNPAID ? "Not paid" : status === PAY_STATUS.PARTIAL ? "Partly paid" : "Paid";
}

/** Re-verifies one bundle item from the chain. Pure apart from indexer reads; the page only renders what comes back. */
export async function verifyItem(bundle: Bundle, item: BundleItem, schemas: { countersign: string }, explorerLink: (uid: string) => string): Promise<ItemVerdict> {
  const checks: Check[] = [];
  const label = paymentLabel(item.status);
  let pe: IndexedAttestation | null;
  try { pe = await getAttestation(item.payEventUID); } catch {
    return { item, checks: [{ outcome: "unavailable", category: "availability", label: "Record index unavailable", detail: "The index did not answer. This is not a finding about the record; try again." }], sentence: `${periodLabel(item.period)}: could not be checked right now.`, found: false, paymentLabel: label };
  }
  if (!pe) {
    return { item, checks: [{ outcome: "unavailable", category: "availability", label: "Record not in the index yet", detail: "The index can lag the chain by a minute. This page re-checks on its own." }], sentence: `${periodLabel(item.period)}: could not be checked yet.`, found: false, paymentLabel: label };
  }
  const attesterOk = pe.attester.toLowerCase() === bundle.worker.address.toLowerCase();
  const v2 = "receivedCents" in pe.decoded;
  const chainAmount = String(v2 ? pe.decoded.receivedCents : pe.decoded.amountCents);
  const expectedOk = !v2 || typeof item.expectedCents !== "number" || String(pe.decoded.expectedCents) === String(item.expectedCents);
  const fieldsOk = Number(pe.decoded.period) === item.period && chainAmount === String(item.amountCents) && Number(pe.decoded.status) === item.status && expectedOk;
  const supersedes = v2 ? String(pe.decoded.supersedes || "") : "";
  const corrects = supersedes && !/^0x0+$/.test(supersedes) ? supersedes : "";
  checks.push({
    outcome: attesterOk && fieldsOk && !pe.revoked ? "passed" : "failed",
    category: "integrity",
    label: attesterOk ? `Signature matches the worker's key (signed ${new Date(pe.time * 1000).toLocaleDateString("en-SG")})` : "Record was not signed by the worker's key",
    detail: `${fieldsOk ? (v2 ? "Month, expected, received and payment status match the shared record" : "Month, amount and payment status match the shared record") : "Fields differ from the shared record"}${pe.revoked ? " · revoked" : ""}${corrects ? ` · this record corrects an earlier one (${corrects.slice(0, 10)}…), which stays on chain` : ""}. A matching signature shows origin and integrity; it does not by itself show that money moved.`,
    link: explorerLink(pe.id),
  });

  // Employer response: one authoritative window, carried in the bundle from the worker's settings.
  const windowDays = bundle.responseWindowDays ?? DEFAULT_RESPONSE_WINDOW_DAYS;
  const dueAt = pe.time * 1000 + windowDays * 86400000;
  let cs: IndexedAttestation[] = [];
  let responseUnavailable = false;
  try { cs = await getReferencing([item.payEventUID], schemas.countersign); } catch { responseUnavailable = true; }
  const chosen: IndexedAttestation | undefined = item.countersignUID ? cs.find(c => c.id === item.countersignUID) || cs[0] : cs[0];
  let employer: "acknowledged" | "disagreed" | "awaiting" | "none" | "unknown" = "none";
  if (responseUnavailable) {
    employer = "unknown";
    checks.push({ outcome: "unavailable", category: "response", label: "Employer response could not be looked up", detail: "The index did not answer; the response state is unknown, not absent." });
  } else if (chosen) {
    const decision = Number(chosen.decoded.decision);
    employer = decision === 1 ? "acknowledged" : "disagreed";
    checks.push({ outcome: "passed", category: "response", label: decision === 1 ? `Employer response recorded: acknowledged "${label}"` : `Employer response recorded: disagreed with "${label}"`, detail: `Signed ${new Date(chosen.time * 1000).toLocaleDateString("en-SG")} from the device that opened the link (key ${chosen.attester.slice(0, 10)}…). An acknowledgment is agreement with the worker's statement; it is not proof that a bank payment occurred.`, link: explorerLink(chosen.id) });
  } else if (Date.now() < dueAt) {
    employer = "awaiting";
    checks.push({ outcome: "not_checked", category: "response", label: `Awaiting employer response (due ${new Date(dueAt).toLocaleString("en-SG")})`, detail: `The employer has ${windowDays} day${windowDays === 1 ? "" : "s"} from signing to respond. No response is recorded yet.` });
  } else {
    employer = "none";
    checks.push({ outcome: "failed", category: "response", label: `No employer response recorded by the deadline (${new Date(dueAt).toLocaleDateString("en-SG")})`, detail: "No response attestation references this record. This records silence; it is not a finding of wrongdoing." });
  }

  let bankSentence = "";
  let found = true;
  if (item.proof) {
    let bp: IndexedAttestation | null = null;
    let lookupFailed = false;
    try { bp = await getAttestation(item.proof.uid); } catch { lookupFailed = true; }
    if (lookupFailed) {
      checks.push({ outcome: "unavailable", category: "evidence", label: "Bank evidence could not be looked up", detail: "The index did not answer. Try again." });
      found = false;
    } else if (!bp) {
      checks.push({ outcome: "unavailable", category: "evidence", label: "Bank evidence not in the index yet", detail: "The proof was recorded moments ago; the index usually catches up within a minute. This page re-checks on its own." });
      found = false;
    } else {
      const v = verifyProofJson(item.proof.proofJson, String(bp.decoded.proofHash), bundle.bankAttestor || undefined);
      const refOk = bp.refUID.toLowerCase() === item.payEventUID.toLowerCase();
      const all = v.hashOk && v.sigOk && v.attestorOk && refOk;
      const predicate = v.parsed ? describePredicate(v.parsed.predicate, c => sgd(c)) : "";
      const source = v.parsed?.method === 1 ? "zkTLS proof over the statement page" : "Demo bank data, attestor signed (stand-in; not a real bank)";
      checks.push({
        outcome: all ? "passed" : "failed",
        category: "evidence",
        label: `Bank evidence: ${source}`,
        detail: [v.hashOk ? "hash matches the chain" : "hash does not match", v.sigOk ? "attestor signature valid" : "signature invalid", refOk ? "linked to this month" : "not linked to this month", predicate].filter(Boolean).join(" · "),
        link: explorerLink(bp.id),
      });
      bankSentence = all ? (v.parsed?.satisfied ? `The ${v.parsed?.method === 1 ? "statement proof" : "demo bank data"} shows ${predicate}.` : "The bank data shows a matching credit in that window.") : "The bank evidence did not check out.";
    }
  } else {
    checks.push({ outcome: "not_checked", category: "evidence", label: "No bank evidence in this bundle", detail: "The worker did not attach a statement proof for this month." });
  }

  const month = periodLabel(item.period, true);
  const who = bundle.worker.name;
  const emp = employer === "acknowledged" ? "The employer acknowledged this statement." : employer === "disagreed" ? "The employer disagreed with this statement." : employer === "awaiting" ? "The employer's response window is still open." : employer === "unknown" ? "The employer response could not be looked up." : "No employer response was recorded by the deadline.";
  const expected = v2 ? Number(pe.decoded.expectedCents) : typeof item.expectedCents === "number" ? item.expectedCents : item.status === PAY_STATUS.UNPAID && item.amountCents > 0 ? item.amountCents : undefined;
  const exp = expected !== undefined ? ` of ${sgd(expected)} expected` : "";
  const stated = item.status === PAY_STATUS.UNPAID ? `recorded this month as not paid${expected !== undefined ? ` (${sgd(expected)} expected, nothing received)` : ""}` : item.status === PAY_STATUS.PARTIAL ? `recorded this month as partly paid (${sgd(item.amountCents)} received${exp})` : `recorded ${sgd(item.amountCents)} as paid in full`;
  const sentence = `${month}: ${who} ${stated}. ${emp} ${bankSentence}`.trim();
  return { item, checks, sentence, employerKey: chosen?.attester, found, paymentLabel: label };
}
