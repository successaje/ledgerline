import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    chainId: 84532,
    eas: "0x4200000000000000000000000000000000000021",
    schemas: {
      payEvent: process.env.NEXT_PUBLIC_SCHEMA_PAYEVENT || "",
      countersign: process.env.NEXT_PUBLIC_SCHEMA_COUNTERSIGN || "",
      bankProof: process.env.NEXT_PUBLIC_SCHEMA_BANKPROOF || "",
    },
    bankAttestor: process.env.NEXT_PUBLIC_BANK_ATTESTOR_ADDRESS || "",
    zkTls: Boolean(process.env.RECLAIM_APP_ID && process.env.RECLAIM_APP_SECRET),
  });
}
