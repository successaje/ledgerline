// Registers the three Ledgerline schemas on Base Sepolia and prints env lines.
import { SchemaRegistry } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import fs from "node:fs";

const RPC = process.env.RPC_URL || "https://sepolia.base.org";
const PK = process.env.RELAYER_PRIVATE_KEY;
if (!PK) { console.error("RELAYER_PRIVATE_KEY missing"); process.exit(1); }

const SCHEMAS = {
  PAYEVENT: "bytes32 workerId,bytes32 employerId,uint32 period,uint256 amountCents,uint8 status,bytes32 detailHash",
  COUNTERSIGN: "bytes32 payEventUID,uint8 decision,bytes32 noteHash",
  BANKPROOF: "bytes32 payEventUID,bytes32 predicateHash,bytes32 proofHash,uint8 method,bool satisfied",
};

const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(PK, provider);
const registry = new SchemaRegistry("0x4200000000000000000000000000000000000020");
registry.connect(signer);

const out = [];
for (const [name, schema] of Object.entries(SCHEMAS)) {
  const tx = await registry.register({ schema, resolverAddress: ethers.ZeroAddress, revocable: true });
  const uid = await tx.wait();
  console.log(name, uid);
  out.push(`NEXT_PUBLIC_SCHEMA_${name}=${uid}`);
}
fs.writeFileSync("schemas.env", out.join("\n") + "\n");
console.log("\nWrote schemas.env:\n" + out.join("\n"));
