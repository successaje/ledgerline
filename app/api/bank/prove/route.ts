// Statement-window proof. Produces: "number of credits >= minAmount from `counterparty` between from..to".
// Method 1: Reclaim zkFetch over this server's own statement endpoint (real zkTLS) when credentials exist.
// Method 2: the synthetic bank's attestor key signs the extracted window (honest stand-in, same data shape).
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { statementFor, creditsInWindow } from "@/lib/bank";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = { account?: string; from: string; to: string; minAmountCents: number; counterparty?: string };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const account = body.account || "demo";
  const all = statementFor(account);
  const hits = creditsInWindow(all, body.from, body.to, body.minAmountCents).filter(t =>
    body.counterparty ? t.counterparty.toUpperCase().includes(body.counterparty.toUpperCase()) : true
  );
  const predicate = {
    kind: "no-credit-in-window",
    bank: "Ledgerline Synthetic Bank (stand-in for a real statement page)",
    from: body.from,
    to: body.to,
    minAmountCents: body.minAmountCents,
    counterparty: body.counterparty || null,
  };
  const extracted = {
    matchingCredits: hits.map(h => ({ date: h.date, creditCents: h.creditCents, counterparty: h.counterparty })),
    count: hits.length,
  };
  const satisfied = hits.length === 0; // "salary did NOT arrive" holds when there are zero matching credits
  const issuedAt = Math.floor(Date.now() / 1000);

  const zk = process.env.RECLAIM_APP_ID && process.env.RECLAIM_APP_SECRET;
  if (zk) {
    try {
      // Dynamic import so the app runs without the dependency installed.
      const mod: any = await import("@reclaimprotocol/zk-fetch" as string);
      const client = new mod.ReclaimClient(process.env.RECLAIM_APP_ID, process.env.RECLAIM_APP_SECRET);
      const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const url = `${base}/api/bank/statement?account=${account}&from=${body.from}&to=${body.to}`;
      const proof = await client.zkFetch(url, { method: "GET" }, { responseMatches: [{ type: "contains", value: '"txns"' }] });
      const proofJson = JSON.stringify({ method: 1, predicate, extracted, satisfied, issuedAt, reclaim: proof });
      return NextResponse.json({ method: 1, predicate, extracted, satisfied, issuedAt, proofJson });
    } catch (e) {
      // fall through to signed attestor, but say so
      console.error("zkFetch failed, using signed attestor:", e);
    }
  }

  const pk = process.env.BANK_ATTESTOR_PRIVATE_KEY;
  if (!pk) return NextResponse.json({ error: "bank attestor not configured" }, { status: 500 });
  const attestor = new ethers.Wallet(pk);
  const payload = { method: 2, predicate, extracted, satisfied, issuedAt, attestor: attestor.address };
  const message = JSON.stringify(payload);
  const signature = await attestor.signMessage(message);
  const proofJson = JSON.stringify({ ...payload, signature });
  return NextResponse.json({ ...payload, proofJson });
}
