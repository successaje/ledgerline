"use client";
import { EAS, SchemaEncoder, NO_EXPIRATION } from "@ethereum-attestation-service/eas-sdk";
import { Interface, JsonRpcProvider, Wallet, ZeroAddress, ZeroHash } from "ethers";
import { EAS_ADDRESS, PUBLIC_RPCS } from "./chain";
import type { TxStage } from "@/domain/types";
import { toUserError } from "./errors";

export type Field = { name: string; value: unknown; type: string };

const EAS_IFACE = new Interface([
  "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
]);

function provider() {
  return new JsonRpcProvider(PUBLIC_RPCS[0], undefined, { staticNetwork: true });
}

/**
 * Signs an EIP-712 delegated attestation with a device-held key, hands it to the relayer (which pays gas),
 * then watches the transaction itself so the UI can show real stages.
 * The on-chain attester is the signer's own address.
 */
export async function delegatedAttest(opts: {
  schemaUID: string;
  schemaString: string;
  fields: Field[];
  signer: Wallet;
  recipient?: string;
  refUID?: string;
  onStage?: (s: TxStage, detail?: { txHash?: string }) => void;
}): Promise<{ uid: string; txHash: string }> {
  const stage = opts.onStage || (() => {});
  try {
    stage("preparing");
    const p = provider();
    const wallet = opts.signer.connect(p);
    const eas = new EAS(EAS_ADDRESS);
    eas.connect(wallet);
    const data = new SchemaEncoder(opts.schemaString).encodeData(opts.fields as never);
    const delegated = await eas.getDelegated();
    const nonce = await eas.getNonce(wallet.address);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const recipient = opts.recipient || ZeroAddress;
    const refUID = opts.refUID || ZeroHash;

    stage("signing");
    const signed = await delegated.signDelegatedAttestation(
      { schema: opts.schemaUID, recipient, expirationTime: NO_EXPIRATION, revocable: true, refUID, data, value: 0n, deadline, nonce },
      wallet,
    );

    stage("submitting");
    const r = await fetch("/api/attest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schema: opts.schemaUID, attester: wallet.address, recipient, refUID, data,
        signature: { v: signed.signature.v, r: signed.signature.r, s: signed.signature.s },
        deadline: deadline.toString(),
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.code ? `${j.code}:${j.error}` : j.error || "relayer error");
    const txHash: string = j.txHash;

    stage("confirming", { txHash });
    const receipt = await p.waitForTransaction(txHash, 1, 120_000);
    if (!receipt || receipt.status !== 1) throw new Error("tx-failed");
    let uid = "";
    for (const log of receipt.logs) {
      try {
        const parsed = EAS_IFACE.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed?.name === "Attested") { uid = parsed.args.uid; break; }
      } catch {}
    }
    if (!uid) throw new Error("uid-not-found");
    stage("done", { txHash });
    return { uid, txHash };
  } catch (e) {
    stage("error");
    throw toUserError(e);
  }
}
