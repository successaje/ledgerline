"use client";
import { HDNodeWallet, Mnemonic, Wallet, isHexString } from "ethers";

/**
 * Device-held signing keys. The app is the key: nothing is shown unless the user asks for a backup.
 * One key per role so a person can be a worker on their own phone and an employer on another.
 * New keys are created from a recovery phrase so they can be written down; older raw keys still work.
 */
const KEY = { worker: "ll.key.worker", employer: "ll.key.employer" } as const;
const PHRASE = { worker: "ll.phrase.worker", employer: "ll.phrase.employer" } as const;
type Role = keyof typeof KEY;

export function getOrCreateKey(role: Role): Wallet {
  let pk: string | null = null;
  try { pk = window.localStorage.getItem(KEY[role]) || migrateLegacyKey(role); } catch {}
  if (!pk) {
    const hd = HDNodeWallet.createRandom();
    pk = hd.privateKey;
    try { window.localStorage.setItem(KEY[role], pk); if (hd.mnemonic) window.localStorage.setItem(PHRASE[role], hd.mnemonic.phrase); } catch {}
  }
  return new Wallet(pk);
}

export function hasKey(role: Role) {
  try { return Boolean(window.localStorage.getItem(KEY[role])); } catch { return false; }
}

/** What the user writes down. A 12-word phrase when the key was created here; otherwise the raw key. */
export function exportSecret(role: Role): { kind: "phrase" | "key"; secret: string; address: string } {
  const w = getOrCreateKey(role);
  let phrase: string | null = null;
  try { phrase = window.localStorage.getItem(PHRASE[role]); } catch {}
  return phrase ? { kind: "phrase", secret: phrase, address: w.address } : { kind: "key", secret: w.privateKey, address: w.address };
}

/** Accepts a 12/24-word phrase or a 0x private key. Replaces the device key for the role. */
export function importSecret(role: Role, input: string): Wallet {
  const s = input.trim().replace(/\s+/g, " ");
  let wallet: Wallet;
  let phrase: string | null = null;
  if (isHexString(s, 32)) {
    wallet = new Wallet(s);
  } else if (Mnemonic.isValidMnemonic(s)) {
    const hd = HDNodeWallet.fromPhrase(s);
    wallet = new Wallet(hd.privateKey);
    phrase = s;
  } else {
    throw new Error("That is not a recovery phrase or key. Check for typos and try again.");
  }
  try {
    window.localStorage.setItem(KEY[role], wallet.privateKey);
    if (phrase) window.localStorage.setItem(PHRASE[role], phrase); else window.localStorage.removeItem(PHRASE[role]);
  } catch {}
  return wallet;
}

/** Pre-release builds stored keys under ll.<role>.key. Carry them over so earlier chain records stay attached. */
function migrateLegacyKey(role: Role): string | null {
  const legacy = window.localStorage.getItem(`ll.${role}.key`);
  if (legacy) { window.localStorage.setItem(KEY[role], legacy); window.localStorage.removeItem(`ll.${role}.key`); }
  return legacy;
}
