"use client";
import type { AppConfig } from "@/domain/types";
import type { ProofPayload } from "@/domain/proof";

export async function getConfig(): Promise<AppConfig> {
  const r = await fetch("/api/config", { cache: "no-store" });
  return r.json();
}

export async function requestBankProof(input: { account: string; from: string; to: string; minAmountCents: number; counterparty?: string }): Promise<ProofPayload & { proofJson: string }> {
  const r = await fetch("/api/bank/prove", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "proof failed");
  return j;
}
