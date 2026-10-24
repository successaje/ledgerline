import { keccak256, toUtf8Bytes } from "ethers";

/** Pseudonymous ids used on chain. Never a name or phone number. */
export function idFromAddress(addr: string) {
  return keccak256(toUtf8Bytes(addr.toLowerCase()));
}

export function idFromLabel(label: string) {
  return keccak256(toUtf8Bytes("ledgerline:employer:" + label.trim().toLowerCase()));
}

export function hashJson(value: unknown) {
  return keccak256(toUtf8Bytes(JSON.stringify(value)));
}

export function hashText(text: string) {
  return keccak256(toUtf8Bytes(text));
}
