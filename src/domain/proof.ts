import { getAddress, verifyMessage } from "ethers";
import { hashText } from "./ids";
import type { ProofMethod } from "./types";

export type Predicate = {
  kind: "no-credit-in-window";
  bank: string;
  from: string;
  to: string;
  minAmountCents: number;
  counterparty: string | null;
};

export type ProofPayload = {
  method: ProofMethod;
  predicate: Predicate;
  extracted: { matchingCredits: { date: string; creditCents: number; counterparty: string }[]; count: number };
  satisfied: boolean;
  issuedAt: number;
  attestor?: string;
  signature?: string;
  reclaim?: unknown;
};

export function describePredicate(p: Predicate, sgd: (c: number) => string) {
  return `no credit of ${sgd(p.minAmountCents)} or more${p.counterparty ? ` from ${p.counterparty}` : ""} between ${p.from} and ${p.to}`;
}

/** Verifies a proof JSON string against the hash recorded on chain and, for signed-attestor proofs, the attestor's signature. */
export function verifyProofJson(proofJson: string, onChainProofHash: string, expectedAttestor?: string) {
  const result = { parsed: null as ProofPayload | null, hashOk: false, sigOk: false, attestorOk: false };
  try {
    result.parsed = JSON.parse(proofJson) as ProofPayload;
  } catch {
    return result;
  }
  result.hashOk = hashText(proofJson).toLowerCase() === onChainProofHash.toLowerCase();
  const p = result.parsed;
  if (p.method === 2 && p.signature && p.attestor) {
    const { signature, ...payload } = p;
    try {
      const recovered = verifyMessage(JSON.stringify(payload), signature);
      result.sigOk = getAddress(recovered) === getAddress(p.attestor);
      result.attestorOk = !expectedAttestor || getAddress(p.attestor) === getAddress(expectedAttestor);
    } catch {}
  } else if (p.method === 1) {
    // A full zkTLS check would call Reclaim's verifier; presence of the proof object is surfaced, not trusted.
    result.sigOk = Boolean(p.reclaim);
    result.attestorOk = true;
  }
  return result;
}
