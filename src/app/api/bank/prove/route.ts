import { NextResponse } from "next/server";
import { buildProof, type ProofRequest } from "@/server/proof";
import { hit, clientIp } from "@/server/limits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const perIp = hit(`proof:${clientIp(req)}`, 60, 60 * 60 * 1000);
  if (!perIp.ok) return NextResponse.json({ error: "Too many proof requests. Try again later." }, { status: 429, headers: { "retry-after": String(perIp.retryAfterSec) } });
  let body: ProofRequest;
  try { body = (await req.json()) as ProofRequest; } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(body.to || "") || !Number.isFinite(body.minAmountCents) || body.minAmountCents < 0 || body.minAmountCents > 1e9 || (body.counterparty && body.counterparty.length > 64)) return NextResponse.json({ error: "from, to and minAmountCents are required" }, { status: 400 });
  try {
    return NextResponse.json(await buildProof({ ...body, account: body.account || "demo" }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
