/** Domain types shared by client, server and verifier. No chain SDK types leak out of here. */

export type PayStatus = 1 | 2 | 3; // paid, unpaid, partial
export type Decision = 1 | 2;      // confirm, dispute
export type ProofMethod = 1 | 2;   // zkTLS (Reclaim zkFetch), signed attestor stand-in

export const PAY_STATUS = { PAID: 1, UNPAID: 2, PARTIAL: 3 } as const;
export const DECISION = { CONFIRM: 1, DISPUTE: 2 } as const;
export const PROOF_METHOD = { ZKTLS: 1, SIGNED_ATTESTOR: 2 } as const;

/** Period as YYYYMM, e.g. 202607. */
export type Period = number;

export type Countersign = { uid: string; decision: Decision; employer: string; at: number };

export type BankProof = {
  uid: string;
  satisfied: boolean;
  method: ProofMethod;
  summary: string;
  proofJson: string;
  window: { from: string; to: string };
  at: number;
};

export type PayRecord = {
  period: Period;
  amountCents: number;
  status: PayStatus;
  note?: string;
  payEventUID?: string;
  payEventTx?: string;
  signedAt?: number;
  countersign?: Countersign;
  proof?: BankProof;
};

export type Profile = {
  name: string;
  employerLabel: string;
  employerId: string;
  salaryCents: number;
  payWindow: { fromDay: number; toDay: number };
  /** Days the employer has to answer before silence is shown as evidence. */
  confirmWindowDays: number;
  sample?: boolean;
};

/** Per-device bookkeeping that never goes on chain. */
export type LedgerMeta = {
  createdAt: number;
  lastSeenAt?: number;
  lastSyncAt?: number;
  dismissed?: Record<string, number>;
};

export type Ledger = { profile: Profile; records: PayRecord[]; meta: LedgerMeta };

/** Stages of a signed record reaching the chain. Shown to the user as a stepper. */
export type TxStage = "preparing" | "signing" | "submitting" | "confirming" | "done" | "error";

export const TX_STAGE_LABEL: Record<TxStage, string> = {
  preparing: "Preparing record",
  signing: "Signing on this device",
  submitting: "Sending to Base",
  confirming: "Confirming on chain",
  done: "Recorded",
  error: "Could not record",
};

export type AppConfig = {
  chainId: number;
  eas: string;
  schemas: { payEvent: string; countersign: string; bankProof: string };
  bankAttestor: string;
  zkTls: boolean;
  relayerReady: boolean;
};
