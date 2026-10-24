// Registers the three Ledgerline schemas on Base Sepolia (idempotent) and writes schemas.env.
// Usage: node --env-file=.env.local scripts/register-schemas.cjs
const { SchemaRegistry } = require("@ethereum-attestation-service/eas-sdk");

const { ethers } = require("ethers");
const fs = require("node:fs");
const getSchemaUID = (schema, resolver, revocable) => ethers.solidityPackedKeccak256(["string", "address", "bool"], [schema, resolver, revocable]);

const RPC = process.env.RPC_URL || "https://sepolia.base.org";
const PK = process.env.RELAYER_PRIVATE_KEY;
if (!PK) { console.error("RELAYER_PRIVATE_KEY missing"); process.exit(1); }

const SCHEMAS = {
  PAYEVENT: "bytes32 workerId,bytes32 employerId,uint32 period,uint256 amountCents,uint8 status,bytes32 detailHash",
  COUNTERSIGN: "bytes32 payEventUID,uint8 decision,bytes32 noteHash",
  BANKPROOF: "bytes32 payEventUID,bytes32 predicateHash,bytes32 proofHash,uint8 method,bool satisfied",
};

(async () => {
  const provider = new ethers.JsonRpcProvider(RPC);
  const signer = new ethers.Wallet(PK, provider);
  const registry = new SchemaRegistry("0x4200000000000000000000000000000000000020");
  registry.connect(signer);
  const out = [];
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    const uid = getSchemaUID(schema, ethers.ZeroAddress, true);
    let exists = false;
    try { const rec = await registry.getSchema({ uid }); exists = rec && rec.uid === uid; } catch {}
    if (exists) {
      console.log(name, uid, "(already registered)");
    } else {
      const tx = await registry.register({ schema, resolverAddress: ethers.ZeroAddress, revocable: true });
      const got = await tx.wait();
      console.log(name, got, "(registered)");
    }
    out.push(`NEXT_PUBLIC_SCHEMA_${name}=${uid}`);
  }
  fs.writeFileSync("schemas.env", out.join("\n") + "\n");
  console.log("\nWrote schemas.env");
})().catch(e => { console.error(e.shortMessage || e.message || e); process.exit(1); });
