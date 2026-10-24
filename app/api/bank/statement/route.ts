import { NextResponse } from "next/server";
import { statementFor } from "@/lib/bank";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const u = new URL(req.url);
  const account = u.searchParams.get("account") || "demo";
  const from = u.searchParams.get("from") || "2026-01-01";
  const to = u.searchParams.get("to") || "2026-12-31";
  const txns = statementFor(account).filter(t => t.date >= from && t.date <= to);
  return NextResponse.json({ account, from, to, txns });
}
