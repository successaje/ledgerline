// Ethereum Attestation Service on Base Sepolia (OP-stack predeploys)
export const CHAIN_ID = 84532;
export const EAS_ADDRESS = "0x4200000000000000000000000000000000000021";
export const SCHEMA_REGISTRY_ADDRESS = "0x4200000000000000000000000000000000000020";
export const EAS_GRAPHQL = "https://base-sepolia.easscan.org/graphql";
export const EXPLORER_ATTESTATION = (uid: string) => `https://base-sepolia.easscan.org/attestation/view/${uid}`;
export const EXPLORER_TX = (hash: string) => `https://sepolia.basescan.org/tx/${hash}`;

// Schema strings. Registered once by scripts/register-schemas.mjs.
export const SCHEMAS = {
  payEvent: "bytes32 workerId,bytes32 employerId,uint32 period,uint256 amountCents,uint8 status,bytes32 detailHash",
  countersign: "bytes32 payEventUID,uint8 decision,bytes32 noteHash",
  bankProof: "bytes32 payEventUID,bytes32 predicateHash,bytes32 proofHash,uint8 method,bool satisfied",
} as const;

export const PAY_STATUS = { PAID: 1, UNPAID: 2, PARTIAL: 3 } as const;
export const DECISION = { CONFIRM: 1, DISPUTE: 2 } as const;
export const PROOF_METHOD = { ZKTLS: 1, SIGNED_ATTESTOR: 2 } as const;

export function schemaUIDs() {
  return {
    payEvent: process.env.NEXT_PUBLIC_SCHEMA_PAYEVENT || "",
    countersign: process.env.NEXT_PUBLIC_SCHEMA_COUNTERSIGN || "",
    bankProof: process.env.NEXT_PUBLIC_SCHEMA_BANKPROOF || "",
  };
}

export function periodLabel(period: number) {
  const y = Math.floor(period / 100);
  const m = period % 100;
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[m - 1]} ${y}`;
}

export function sgd(cents: number | bigint) {
  const n = Number(cents) / 100;
  return `S$${n.toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export type DecodedField = { name: string; type: string; value: { name: string; type: string; value: unknown } };

export async function fetchAttestation(uid: string) {
  const query = `query($id:String!){ attestation(where:{id:$id}){ id attester recipient refUID revoked time schemaId decodedDataJson txid } }`;
  const r = await fetch(EAS_GRAPHQL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { id: uid } }),
    cache: "no-store",
  });
  const j = await r.json();
  const a = j?.data?.attestation;
  if (!a) return null;
  let decoded: Record<string, unknown> = {};
  try {
    const fields = JSON.parse(a.decodedDataJson) as DecodedField[];
    for (const f of fields) decoded[f.name] = f.value.value;
  } catch {}
  return { ...a, decoded } as {
    id: string; attester: string; recipient: string; refUID: string; revoked: boolean; time: number; schemaId: string; txid: string; decoded: Record<string, unknown>;
  };
}

export async function fetchByRefUIDs(refUIDs: string[], schemaId: string) {
  if (!refUIDs.length) return [];
  const query = `query($refs:[String!],$schema:String!){ attestations(where:{refUID:{in:$refs}, schemaId:{equals:$schema}, revoked:{equals:false}}, orderBy:{time:desc}){ id attester recipient refUID time schemaId decodedDataJson txid } }`;
  const r = await fetch(EAS_GRAPHQL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { refs: refUIDs, schema: schemaId } }),
    cache: "no-store",
  });
  const j = await r.json();
  const list = (j?.data?.attestations || []) as Array<{ id: string; attester: string; recipient: string; refUID: string; time: number; schemaId: string; decodedDataJson: string; txid: string }>;
  return list.map(a => {
    const decoded: Record<string, unknown> = {};
    try { for (const f of JSON.parse(a.decodedDataJson) as DecodedField[]) decoded[f.name] = f.value.value; } catch {}
    return { ...a, decoded };
  });
}
