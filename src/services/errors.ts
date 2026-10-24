/** Maps chain, RPC and relayer failures to messages a non-technical user can act on. */
export class UserError extends Error {
  constructor(public title: string, public hint: string, public retryable = true) {
    super(title);
  }
}

export function toUserError(e: unknown): UserError {
  if (e instanceof UserError) return e;
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes("insufficient funds") || msg.includes("out-of-gas") || msg.startsWith("relayer-gas"))
    return new UserError("The recording service is out of testnet gas", "Your record is saved on this device. Try again in a few minutes; nothing is lost.");
  if (msg.includes("timeout") || msg.includes("etimedout") || msg.includes("network") || msg.includes("fetch failed") || msg.includes("502") || msg.includes("503"))
    return new UserError("The network is slow right now", "Your record is saved on this device and was not sent twice. Try again.");
  if (msg.includes("relayer not configured") || msg.startsWith("relayer-config"))
    return new UserError("Recording is not set up on this server", "The service wallet is missing. If you run this locally, check RELAYER_PRIVATE_KEY.");
  if (msg.includes("tx-failed"))
    return new UserError("The chain rejected this record", "This usually means the signature expired. Try again; a fresh signature will be made.");
  if (msg.includes("indexer"))
    return new UserError("The record index is catching up", "Your record is on chain. The index usually catches up within a minute; refresh to check.");
  if (msg.includes("user rejected") || msg.includes("denied"))
    return new UserError("Signature cancelled", "Nothing was recorded. You can try again whenever you like.", true);
  return new UserError("Something went wrong", "Your records on this device are safe. Try again, and if it keeps failing, use the details below.", true);
}

export function rawMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
