"use client";
import { EAS, SchemaEncoder, NO_EXPIRATION } from "@ethereum-attestation-service/eas-sdk";
import { JsonRpcProvider, Wallet, ZeroAddress, ZeroHash } from "ethers";
import { EAS_ADDRESS } from "./eas";

export type Field = { name: string; value: unknown; type: string };

// Signs an EIP-712 delegated attestation with a browser-held key and hands it to the relayer, which pays gas.
// The on-chain attester is the signer's own address.
export async function delegatedAttest(opts: {
  schemaUID: string;
  schemaString: string;
  fields: Field[];
  signer: Wallet;
  recipient?: string;
  refUID?: string;
}): Promise<{ uid: string; tx: string | null }> {
  const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org");
  const wallet = opts.signer.connect(provider);
  const eas = new EAS(EAS_ADDRESS);
  eas.connect(wallet);
  const encoder = new SchemaEncoder(opts.schemaString);
  const data = encoder.encodeData(opts.fields as never);
  const delegated = await eas.getDelegated();
  const nonce = await eas.getNonce(wallet.address);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const recipient = opts.recipient || ZeroAddress;
  const refUID = opts.refUID || ZeroHash;
  const resp = await delegated.signDelegatedAttestation(
    { schema: opts.schemaUID, recipient, expirationTime: NO_EXPIRATION, revocable: true, refUID, data, value: 0n, deadline, nonce },
    wallet
  );
  const r = await fetch("/api/attest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      schema: opts.schemaUID,
      attester: wallet.address,
      recipient,
      refUID,
      data,
      signature: { v: resp.signature.v, r: resp.signature.r, s: resp.signature.s },
      deadline: deadline.toString(),
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "relayer error");
  return j;
}
