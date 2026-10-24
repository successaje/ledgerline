import "server-only";
import { EAS, NO_EXPIRATION } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import { EAS_ADDRESS } from "@/services/chain";

/**
 * The relayer pays gas for delegated attestations. It never signs attestations itself:
 * the attester is always the worker's or employer's own key. Testnet only.
 */
const RPCS = [process.env.RPC_URL || "", "https://sepolia.base.org", "https://base-sepolia-rpc.publicnode.com", "https://base-sepolia.gateway.tenderly.co"].filter(Boolean);

export class RelayerError extends Error {
  constructor(public code: "relayer-config" | "relayer-gas" | "rpc-unavailable" | "bad-request" | "chain-rejected", message: string) { super(message); }
}

export type DelegatedAttestRequest = {
  schema: string; attester: string; recipient?: string; refUID?: string; data: string;
  signature: { v: number; r: string; s: string }; deadline: string;
};

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function firstHealthyProvider(): Promise<ethers.JsonRpcProvider> {
  let lastErr: unknown;
  for (const url of RPCS) {
    const p = new ethers.JsonRpcProvider(url, { chainId: 84532, name: "base-sepolia" }, { staticNetwork: true });
    try { await withTimeout(p.getBlockNumber(), 4000, url); return p; } catch (e) { lastErr = e; }
  }
  throw new RelayerError("rpc-unavailable", `No RPC responded: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}

// Serialise sends so concurrent requests (worker and employer at once) do not race on the relayer nonce.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

export function relayerStatus() {
  return { configured: Boolean(process.env.RELAYER_PRIVATE_KEY) };
}

export async function relayerBalance(): Promise<bigint | null> {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) return null;
  try { const p = await firstHealthyProvider(); return await p.getBalance(new ethers.Wallet(pk).address); } catch { return null; }
}

/** Submits the delegated attestation and returns the transaction hash as soon as it is accepted by the RPC. */
export async function submitDelegatedAttestation(req: DelegatedAttestRequest): Promise<{ txHash: string }> {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) throw new RelayerError("relayer-config", "RELAYER_PRIVATE_KEY is not set");
  if (!/^0x[0-9a-fA-F]{64}$/.test(req.schema) || !ethers.isAddress(req.attester) || !req.data?.startsWith("0x"))
    throw new RelayerError("bad-request", "Malformed attestation request");

  return serial(async () => {
    const provider = await firstHealthyProvider();
    const relayer = new ethers.Wallet(pk, provider);
    const eas = new EAS(EAS_ADDRESS);
    eas.connect(relayer);
    try {
      const tx = await withTimeout(eas.attestByDelegation({
        schema: req.schema,
        data: {
          recipient: req.recipient || ethers.ZeroAddress,
          expirationTime: NO_EXPIRATION,
          revocable: true,
          refUID: req.refUID || ethers.ZeroHash,
          data: req.data,
          value: 0n,
        },
        signature: req.signature,
        attester: req.attester,
        deadline: BigInt(req.deadline),
      }), 25_000, "send");
      // The SDK wraps the ContractTransactionResponse; hash is available before mining.
      const hash = (tx as unknown as { data?: { hash?: string } }).data?.hash;
      if (!hash) throw new Error("no tx hash from sdk");
      return { txHash: hash };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/insufficient funds/i.test(msg)) throw new RelayerError("relayer-gas", msg);
      if (/timeout|ETIMEDOUT|ECONNRESET|network/i.test(msg)) throw new RelayerError("rpc-unavailable", msg);
      if (/revert|reverted|InvalidSignature|DeadlineExpired/i.test(msg)) throw new RelayerError("chain-rejected", msg);
      throw e;
    }
  });
}
