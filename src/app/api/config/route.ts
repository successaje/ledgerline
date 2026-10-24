import { NextResponse } from "next/server";
import { relayerStatus } from "@/server/relayer";
import { CHAIN_ID, EAS_ADDRESS } from "@/services/chain";
import type { AppConfig } from "@/domain/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg: AppConfig = {
    chainId: CHAIN_ID,
    eas: EAS_ADDRESS,
    schemas: {
      payEvent: process.env.NEXT_PUBLIC_SCHEMA_PAYEVENT || "",
      countersign: process.env.NEXT_PUBLIC_SCHEMA_COUNTERSIGN || "",
      bankProof: process.env.NEXT_PUBLIC_SCHEMA_BANKPROOF || "",
    },
    bankAttestor: process.env.NEXT_PUBLIC_BANK_ATTESTOR_ADDRESS || "",
    zkTls: Boolean(process.env.RECLAIM_APP_ID && process.env.RECLAIM_APP_SECRET),
    relayerReady: relayerStatus().configured,
  };
  return NextResponse.json(cfg);
}
