"use client";
import { Wallet, keccak256, toUtf8Bytes } from "ethers";

// Browser-held keys. No seed phrase shown; the app is the key. Testnet prototype only.
export function getOrCreateKey(ns: "worker" | "employer"): Wallet {
  const k = `ll.${ns}.key`;
  let pk = typeof window !== "undefined" ? window.localStorage.getItem(k) : null;
  if (!pk) {
    pk = Wallet.createRandom().privateKey;
    window.localStorage.setItem(k, pk);
  }
  return new Wallet(pk);
}

export function idFromAddress(addr: string) {
  return keccak256(toUtf8Bytes(addr.toLowerCase()));
}

export function idFromLabel(label: string) {
  return keccak256(toUtf8Bytes("ledgerline:employer:" + label.trim().toLowerCase()));
}
