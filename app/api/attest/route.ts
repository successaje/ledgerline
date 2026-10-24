// Relayer: submits delegated attestations. The attester on chain is the worker's or employer's own key;
// this server only pays gas. Testnet only.
import { NextResponse } from "next/server";
import { EAS, NO_EXPIRATION } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EAS_ADDRESS = "0x4200000000000000000000000000000000000021";

type Body = {
  schema: string;
  attester: string;
  recipient?: string;
  refUID?: string;
  data: string; // ABI-encoded schema data (hex)
  signature: { v: number; r: string; s: string };
  deadline: string; // bigint as string
};

export async function POST(req: Request) {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) return NextResponse.json({ error: "relayer not configured" }, { status: 500 });
  const body = (await req.json()) as Body;
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://sepolia.base.org");
    const relayer = new ethers.Wallet(pk, provider);
    const eas = new EAS(EAS_ADDRESS);
    eas.connect(relayer);
    const tx = await eas.attestByDelegation({
      schema: body.schema,
      data: {
        recipient: body.recipient || ethers.ZeroAddress,
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUID: body.refUID || ethers.ZeroHash,
        data: body.data,
        value: 0n,
      },
      signature: body.signature,
      attester: body.attester,
      deadline: BigInt(body.deadline),
    });
    const uid = await tx.wait();
    const receipt = tx.receipt;
    return NextResponse.json({ uid, tx: receipt?.hash || null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
