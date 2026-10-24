import { NextResponse } from "next/server";
import { submitDelegatedAttestation, RelayerError, type DelegatedAttestRequest } from "@/server/relayer";
import { hit, clientIp } from "@/server/limits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY = 8 * 1024;

export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BODY) return NextResponse.json({ code: "bad-request", error: "request too large" }, { status: 413 });
  const ip = clientIp(req);
  const perIp = hit(`ip:${ip}`, 40, 60 * 60 * 1000);
  if (!perIp.ok) return NextResponse.json({ code: "rate-limited", error: "Too many records from this network. Try again later." }, { status: 429, headers: { "retry-after": String(perIp.retryAfterSec) } });
  let body: DelegatedAttestRequest;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return NextResponse.json({ code: "bad-request", error: "request too large" }, { status: 413 });
    body = JSON.parse(text) as DelegatedAttestRequest;
  } catch { return NextResponse.json({ code: "bad-request", error: "invalid json" }, { status: 400 }); }
  if (typeof body.attester === "string") {
    const perKey = hit(`key:${body.attester.toLowerCase()}`, 120, 24 * 60 * 60 * 1000);
    if (!perKey.ok) return NextResponse.json({ code: "rate-limited", error: "This key has recorded a lot today. Try again tomorrow." }, { status: 429, headers: { "retry-after": String(perKey.retryAfterSec) } });
  }
  try {
    const { txHash } = await submitDelegatedAttestation(body);
    return NextResponse.json({ txHash });
  } catch (e) {
    if (e instanceof RelayerError) {
      const status = e.code === "bad-request" ? 400 : e.code === "chain-rejected" ? 422 : e.code === "rate-limited" ? 429 : 503;
      return NextResponse.json({ code: e.code, error: e.message }, { status });
    }
    return NextResponse.json({ code: "unknown", error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
