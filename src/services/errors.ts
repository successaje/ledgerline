/** Maps chain, RPC and relayer failures to a stable code; the UI translates the code into the person's language. */
export type ErrorCode = "gas" | "slow" | "limit" | "config" | "rejected" | "index" | "cancel" | "unknown";

export class UserError extends Error {
  constructor(public code: ErrorCode, public title: string, public hint: string, public retryable = true) {
    super(title);
  }
}

const EN: Record<ErrorCode, [string, string]> = {
  gas: ["The recording service is out of testnet gas", "Your record is saved on this device. Try again in a few minutes; nothing is lost."],
  slow: ["The network is slow right now", "Your record is saved on this device and was not sent twice. Try again."],
  limit: ["Please slow down", "This network or key has made many records in a short time. Your record is saved on this device; try again later."],
  config: ["Recording is not set up on this server", "The service wallet is missing. If you run this locally, check RELAYER_PRIVATE_KEY."],
  rejected: ["The chain rejected this record", "This usually means the signature expired. Try again; a fresh signature will be made."],
  index: ["The record index is catching up", "Your record is on chain. The index usually catches up within a minute; refresh to check."],
  cancel: ["Signature cancelled", "Nothing was recorded. You can try again whenever you like."],
  unknown: ["Something went wrong", "Your records on this device are safe. Try again, and if it keeps failing, use the details below."],
};

function make(code: ErrorCode) { return new UserError(code, EN[code][0], EN[code][1]); }

export function toUserError(e: unknown): UserError {
  if (e instanceof UserError) return e;
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes("insufficient funds") || msg.includes("out-of-gas") || msg.startsWith("relayer-gas")) return make("gas");
  if (msg.startsWith("rate-limited") || msg.includes("too many")) return make("limit");
  if (msg.includes("timeout") || msg.includes("etimedout") || msg.includes("network") || msg.includes("fetch failed") || msg.includes("502") || msg.includes("503")) return make("slow");
  if (msg.includes("relayer not configured") || msg.startsWith("relayer-config")) return make("config");
  if (msg.includes("tx-failed") || msg.startsWith("chain-rejected")) return make("rejected");
  if (msg.includes("indexer")) return make("index");
  if (msg.includes("user rejected") || msg.includes("denied")) return make("cancel");
  return make("unknown");
}

export function rawMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
