"use client";
// Local-first store of the worker's own records. On-chain attestations are the source of truth;
// this cache holds the human-readable detail that is never put on chain.
export type PayRecord = {
  period: number;            // YYYYMM
  amountCents: number;
  status: 1 | 2 | 3;         // paid / unpaid / partial
  note?: string;
  payEventUID?: string;
  payEventTx?: string;
  signedAt?: number;         // ms
  countersign?: { uid: string; decision: 1 | 2; employer: string; at: number };
  proof?: { uid: string; satisfied: boolean; method: 1 | 2; summary: string; proofJson: string; at: number };
};

export type WorkerState = {
  name: string;
  employerLabel: string;
  employerId: string;
  records: PayRecord[];
};

const KEY = "ll.worker.state";

export function loadState(): WorkerState | null {
  if (typeof window === "undefined") return null;
  const s = window.localStorage.getItem(KEY);
  return s ? (JSON.parse(s) as WorkerState) : null;
}

export function saveState(s: WorkerState) {
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function seedMaria(employerId: string): WorkerState {
  const records: PayRecord[] = [];
  // Jan 2026 .. Sep 2026, S$600 each, July missing
  for (let m = 1; m <= 9; m++) {
    const period = 202600 + m;
    records.push({ period, amountCents: 60000, status: m === 7 ? 2 : 1 });
  }
  return { name: "Maria", employerLabel: "Mdm Tan (+65 9xxx 1234)", employerId, records };
}
