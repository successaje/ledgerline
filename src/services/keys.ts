"use client";
import { Wallet } from "ethers";

/**
 * Device-held signing keys. The app is the key: no seed phrase is ever shown.
 * One key per role so a person can be a worker on their own phone and an employer on another.
 */
const KEY = { worker: "ll.key.worker", employer: "ll.key.employer" } as const;

export function getOrCreateKey(role: keyof typeof KEY): Wallet {
  const k = KEY[role];
  let pk: string | null = null;
  try { pk = window.localStorage.getItem(k) || migrateLegacyKey(role); } catch {}
  if (!pk) {
    pk = Wallet.createRandom().privateKey;
    try { window.localStorage.setItem(k, pk); } catch {}
  }
  return new Wallet(pk);
}

export function hasKey(role: keyof typeof KEY) {
  try { return Boolean(window.localStorage.getItem(KEY[role])); } catch { return false; }
}

/** Pre-release builds stored keys under ll.<role>.key. Carry them over so earlier chain records stay attached. */
function migrateLegacyKey(role: keyof typeof KEY): string | null {
  const legacy = window.localStorage.getItem(`ll.${role}.key`);
  if (legacy) { window.localStorage.setItem(KEY[role], legacy); window.localStorage.removeItem(`ll.${role}.key`); }
  return legacy;
}
