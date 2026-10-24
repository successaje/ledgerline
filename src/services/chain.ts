/** Chain constants and the EAS indexer client. Base Sepolia only in this release. */
export const CHAIN_ID = 84532;
export const CHAIN_NAME = "Base Sepolia";
export const EAS_ADDRESS = "0x4200000000000000000000000000000000000021";
export const SCHEMA_REGISTRY_ADDRESS = "0x4200000000000000000000000000000000000020";
export const EAS_GRAPHQL = "https://base-sepolia.easscan.org/graphql";

export const explorer = {
  attestation: (uid: string) => `https://base-sepolia.easscan.org/attestation/view/${uid}`,
  schema: (uid: string) => `https://base-sepolia.easscan.org/schema/view/${uid}`,
  tx: (hash: string) => `https://sepolia.basescan.org/tx/${hash}`,
  address: (a: string) => `https://sepolia.basescan.org/address/${a}`,
};

export const SCHEMA_DEFS = {
  payEvent: "bytes32 workerId,bytes32 employerId,uint32 period,uint256 amountCents,uint8 status,bytes32 detailHash",
  countersign: "bytes32 payEventUID,uint8 decision,bytes32 noteHash",
  bankProof: "bytes32 payEventUID,bytes32 predicateHash,bytes32 proofHash,uint8 method,bool satisfied",
} as const;

export const PUBLIC_RPCS = [
  process.env.NEXT_PUBLIC_RPC_URL || "",
  "https://sepolia.base.org",
  "https://base-sepolia-rpc.publicnode.com",
  "https://base-sepolia.gateway.tenderly.co",
].filter(Boolean);

type DecodedField = { name: string; type: string; value: { name: string; type: string; value: unknown } };

export type IndexedAttestation = {
  id: string; attester: string; recipient: string; refUID: string; revoked: boolean; time: number; schemaId: string; txid: string;
  decoded: Record<string, string | number | boolean>;
};

/** Normalises the indexer's decodedDataJson (uint256 arrive as {type:"BigNumber",hex}) to plain values. */
function normalise(v: unknown): string | number | boolean {
  if (v && typeof v === "object" && "hex" in (v as Record<string, unknown>)) return BigInt((v as { hex: string }).hex).toString();
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") return v;
  return String(v);
}

function decode(json: string) {
  const out: Record<string, string | number | boolean> = {};
  try { for (const f of JSON.parse(json) as DecodedField[]) out[f.name] = normalise(f.value.value); } catch {}
  return out;
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const r = await fetch(EAS_GRAPHQL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }), cache: "no-store" });
  if (!r.ok) throw new Error(`indexer ${r.status}`);
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0]?.message || "indexer error");
  return j.data as T;
}

const FIELDS = "id attester recipient refUID revoked time schemaId txid decodedDataJson";

export async function getAttestation(uid: string): Promise<IndexedAttestation | null> {
  const d = await gql<{ attestation: (Omit<IndexedAttestation, "decoded"> & { decodedDataJson: string }) | null }>(
    `query($id:String!){ attestation(where:{id:$id}){ ${FIELDS} } }`, { id: uid });
  if (!d.attestation) return null;
  const { decodedDataJson, ...rest } = d.attestation;
  return { ...rest, decoded: decode(decodedDataJson) };
}

export async function getReferencing(refUIDs: string[], schemaId: string): Promise<IndexedAttestation[]> {
  if (!refUIDs.length) return [];
  const d = await gql<{ attestations: (Omit<IndexedAttestation, "decoded"> & { decodedDataJson: string })[] }>(
    `query($refs:[String!],$schema:String!){ attestations(where:{refUID:{in:$refs}, schemaId:{equals:$schema}, revoked:{equals:false}}, orderBy:{time:desc}){ ${FIELDS} } }`,
    { refs: refUIDs, schema: schemaId });
  return d.attestations.map(({ decodedDataJson, ...rest }) => ({ ...rest, decoded: decode(decodedDataJson) }));
}

export async function getByAttester(attester: string, schemaId: string): Promise<IndexedAttestation[]> {
  const d = await gql<{ attestations: (Omit<IndexedAttestation, "decoded"> & { decodedDataJson: string })[] }>(
    `query($a:String!,$schema:String!){ attestations(where:{attester:{equals:$a}, schemaId:{equals:$schema}, revoked:{equals:false}}, orderBy:{time:asc}){ ${FIELDS} } }`,
    { a: attester, schema: schemaId });
  return d.attestations.map(({ decodedDataJson, ...rest }) => ({ ...rest, decoded: decode(decodedDataJson) }));
}
