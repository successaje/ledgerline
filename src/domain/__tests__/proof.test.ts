import { describe, expect, it } from "vitest";
import { Wallet, type BaseWallet } from "ethers";
import { verifyProofJson, describePredicate, type ProofPayload } from "../proof";
import { hashText } from "../ids";

async function signedProof(attestor: BaseWallet, satisfied = true) {
  const payload: ProofPayload = {
    method: 2,
    predicate: { kind: "no-credit-in-window", bank: "test", from: "2026-07-01", to: "2026-07-10", minAmountCents: 60000, counterparty: "TAN" },
    extracted: { matchingCredits: [], count: 0 },
    satisfied, issuedAt: 1792834685, attestor: attestor.address,
  };
  const signature = await attestor.signMessage(JSON.stringify(payload));
  return JSON.stringify({ ...payload, signature });
}

describe("proof verification", () => {
  it("accepts a proof whose hash and attestor signature match", async () => {
    const attestor = Wallet.createRandom();
    const json = await signedProof(attestor);
    const v = verifyProofJson(json, hashText(json), attestor.address);
    expect(v.hashOk && v.sigOk && v.attestorOk).toBe(true);
    expect(v.parsed?.satisfied).toBe(true);
  });
  it("rejects a tampered proof", async () => {
    const attestor = Wallet.createRandom();
    const json = await signedProof(attestor);
    const tampered = json.replace('"satisfied":true', '"satisfied":false');
    const v = verifyProofJson(tampered, hashText(json), attestor.address);
    expect(v.hashOk).toBe(false);
    expect(v.sigOk).toBe(false);
  });
  it("rejects a proof from an unexpected attestor", async () => {
    const attestor = Wallet.createRandom();
    const json = await signedProof(attestor);
    const v = verifyProofJson(json, hashText(json), Wallet.createRandom().address);
    expect(v.sigOk).toBe(true);
    expect(v.attestorOk).toBe(false);
  });
  it("describes predicates in plain words", () => {
    expect(describePredicate({ kind: "no-credit-in-window", bank: "x", from: "2026-07-01", to: "2026-07-10", minAmountCents: 60000, counterparty: "TAN" }, c => `S$${c / 100}`))
      .toBe("no credit of S$600 or more from TAN between 2026-07-01 and 2026-07-10");
  });
});
