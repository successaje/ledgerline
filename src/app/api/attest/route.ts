import { NextResponse } from "next/server";
import { submitDelegatedAttestation, RelayerError, type DelegatedAttestRequest } from "@/server/relayer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: DelegatedAttestRequest;
  try { body = (await req.json()) as DelegatedAttestRequest; } catch { return NextResponse.json({ code: "bad-request", error: "invalid json" }, { status: 400 }); }
  try {
    const { txHash } = await submitDelegatedAttestation(body);
    return NextResponse.json({ txHash });
  } catch (e) {
    if (e instanceof RelayerError) {
      const status = e.code === "bad-request" ? 400 : e.code === "chain-rejected" ? 422 : 503;
      return NextResponse.json({ code: e.code, error: e.message }, { status });
    }
    return NextResponse.json({ code: "unknown", error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
