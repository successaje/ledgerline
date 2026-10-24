import type { Bundle, BundleItem } from "@/domain/bundle";
import { PAY_STATUS } from "@/domain/types";
import { periodLabel, sgd } from "@/domain/format";
import { describePredicate, verifyProofJson } from "@/domain/proof";
import { getAttestation, getReferencing, type IndexedAttestation } from "./chain";

export type Check = { ok: boolean | null; label: string; detail?: string; link?: string };
export type ItemVerdict = { item: BundleItem; checks: Check[]; sentence: string; employerKey?: string; found: boolean };

const CONFIRM_WINDOW_DAYS = 3;

/** Re-verifies one bundle item from the chain. Pure apart from indexer reads; the page only renders what comes back. */
export async function verifyItem(bundle: Bundle, item: BundleItem, schemas: { countersign: string }, explorerLink: (uid: string) => string): Promise<ItemVerdict> {
  const checks: Check[] = [];
  const pe = await getAttestation(item.payEventUID);
  if (!pe) {
    return { item, checks: [{ ok: null, label: "Record not found in the index yet", detail: "The index can lag the chain by a minute. Try again shortly." }], sentence: `${periodLabel(item.period)}: could not be verified yet.`, found: false };
  }
  const attesterOk = pe.attester.toLowerCase() === bundle.worker.address.toLowerCase();
  const fieldsOk = Number(pe.decoded.period) === item.period && String(pe.decoded.amountCents) === String(item.amountCents) && Number(pe.decoded.status) === item.status;
  checks.push({
    ok: attesterOk && fieldsOk && !pe.revoked,
    label: attesterOk ? `Worker's own record, signed ${new Date(pe.time * 1000).toLocaleDateString("en-SG")}` : "Record was not signed by the worker's key",
    detail: `${fieldsOk ? "Month, amount and status match the bundle" : "Fields differ from the bundle"}${pe.revoked ? " · revoked" : ""}`,
    link: explorerLink(pe.id),
  });

  const cs = await getReferencing([item.payEventUID], schemas.countersign);
  const chosen: IndexedAttestation | undefined = item.countersignUID ? cs.find(c => c.id === item.countersignUID) || cs[0] : cs[0];
  let employer: "confirmed" | "disputed" | "silent" = "silent";
  if (chosen) {
    const decision = Number(chosen.decoded.decision);
    employer = decision === 1 ? "confirmed" : "disputed";
    checks.push({ ok: decision === 1, label: decision === 1 ? "Employer confirmed this month" : "Employer disputed this month", detail: `Signed ${new Date(chosen.time * 1000).toLocaleDateString("en-SG")} by key ${chosen.attester.slice(0, 10)}…`, link: explorerLink(chosen.id) });
  } else {
    const days = Math.floor((Date.now() - pe.time * 1000) / 86400000);
    const elapsed = days >= CONFIRM_WINDOW_DAYS;
    checks.push({ ok: false, label: elapsed ? `Employer did not confirm within ${CONFIRM_WINDOW_DAYS} days` : `No employer answer yet (${days} day${days === 1 ? "" : "s"} since signing)`, detail: "No countersign attestation references this record." });
  }

  let bankSentence = "";
  if (item.proof) {
    const bp = await getAttestation(item.proof.uid);
    const v = verifyProofJson(item.proof.proofJson, bp ? String(bp.decoded.proofHash) : "", bundle.bankAttestor || undefined);
    const refOk = !!bp && bp.refUID.toLowerCase() === item.payEventUID.toLowerCase();
    const all = v.hashOk && v.sigOk && v.attestorOk && refOk;
    const predicate = v.parsed ? describePredicate(v.parsed.predicate, c => sgd(c)) : "";
    checks.push({
      ok: all,
      label: v.parsed?.method === 1 ? "Bank statement proof (zkTLS)" : "Bank statement proof (signed attestor, stand-in for zkTLS)",
      detail: [v.hashOk ? "hash matches the chain" : "hash does not match", v.sigOk ? "attestor signature valid" : "signature invalid", refOk ? "linked to this month" : "not linked to this month", predicate].filter(Boolean).join(" · "),
      link: bp ? explorerLink(bp.id) : undefined,
    });
    bankSentence = all ? (v.parsed?.satisfied ? `Her bank statement shows ${predicate}.` : "Her bank statement shows a matching credit in that window.") : "The bank proof could not be verified.";
  }

  const month = periodLabel(item.period, true);
  const who = bundle.worker.name;
  const emp = employer === "confirmed" ? "The employer confirmed it." : employer === "disputed" ? "The employer disputed it." : "The employer did not confirm it within the window.";
  const sentence = item.status === PAY_STATUS.UNPAID
    ? `${month}: ${who} recorded this month as not paid (${sgd(item.amountCents)}). ${emp} ${bankSentence}`.trim()
    : `${month}: ${who} recorded ${sgd(item.amountCents)} as paid. ${emp}`;
  return { item, checks, sentence, employerKey: chosen?.attester, found: true };
}
