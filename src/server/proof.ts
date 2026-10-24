import "server-only";
import { ethers } from "ethers";
import { statementFor, creditsInWindow } from "./bank-data";
import type { Predicate, ProofPayload } from "@/domain/proof";

export type ProofRequest = { account: string; from: string; to: string; minAmountCents: number; counterparty?: string };

/**
 * Builds a statement-window proof. Two methods, identical data shape:
 *  1. Reclaim zkFetch (zkTLS) over this server's statement endpoint, when credentials exist.
 *  2. Signed attestor stand-in: the synthetic bank signs the extracted window with its key.
 * Only the predicate and the matching rows are disclosed; the rest of the statement never leaves the bank.
 */
export async function buildProof(req: ProofRequest): Promise<ProofPayload & { proofJson: string }> {
  const all = statementFor(req.account);
  const hits = creditsInWindow(all, req.from, req.to, req.minAmountCents).filter(t =>
    req.counterparty ? t.counterparty.toUpperCase().includes(req.counterparty.toUpperCase()) : true,
  );
  const predicate: Predicate = {
    kind: "no-credit-in-window",
    bank: "Ledgerline synthetic bank (stand-in for a real statement page)",
    from: req.from, to: req.to, minAmountCents: req.minAmountCents, counterparty: req.counterparty || null,
  };
  const extracted = { matchingCredits: hits.map(h => ({ date: h.date, creditCents: h.creditCents, counterparty: h.counterparty })), count: hits.length };
  const satisfied = hits.length === 0;
  const issuedAt = Math.floor(Date.now() / 1000);

  if (process.env.RECLAIM_APP_ID && process.env.RECLAIM_APP_SECRET) {
    try {
      const modName = "@reclaimprotocol/zk-fetch";
      const mod = (await import(/* webpackIgnore: true */ modName)) as { ReclaimClient: new (id: string, secret: string) => { zkFetch: (u: string, o: unknown, p: unknown) => Promise<unknown> } };
      const client = new mod.ReclaimClient(process.env.RECLAIM_APP_ID, process.env.RECLAIM_APP_SECRET);
      const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const url = `${base}/api/bank/statement?account=${encodeURIComponent(req.account)}&from=${req.from}&to=${req.to}`;
      const reclaim = await client.zkFetch(url, { method: "GET" }, { responseMatches: [{ type: "contains", value: '"txns"' }] });
      const payload: ProofPayload = { method: 1, predicate, extracted, satisfied, issuedAt, reclaim };
      return { ...payload, proofJson: JSON.stringify(payload) };
    } catch (e) {
      console.error("zkFetch failed; falling back to signed attestor", e);
    }
  }

  const pk = process.env.BANK_ATTESTOR_PRIVATE_KEY;
  if (!pk) throw new Error("bank attestor not configured");
  const attestor = new ethers.Wallet(pk);
  const payload: ProofPayload = { method: 2, predicate, extracted, satisfied, issuedAt, attestor: attestor.address };
  const signature = await attestor.signMessage(JSON.stringify(payload));
  const signed = { ...payload, signature };
  return { ...signed, proofJson: JSON.stringify(signed) };
}
