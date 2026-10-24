import { NextResponse } from "next/server";
import { buildProof, type ProofRequest } from "@/server/proof";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: ProofRequest;
  try { body = (await req.json()) as ProofRequest; } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  if (!body.from || !body.to || !Number.isFinite(body.minAmountCents)) return NextResponse.json({ error: "from, to and minAmountCents are required" }, { status: 400 });
  try {
    return NextResponse.json(await buildProof({ ...body, account: body.account || "demo" }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
