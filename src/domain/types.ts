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

/**
 * Where a record stands between this device and the chain.
 * draft: only on this device. awaiting: signed here, not yet sent. submitted: the relayer returned a transaction hash,
 * no receipt yet. confirmed: the attestation exists on chain. failed: nothing reached the chain. unknown: a transaction
 * was sent but this device could not learn its result; reconciliation resolves it.
 */
export type SubmissionState = "draft" | "awaiting" | "submitted" | "confirmed" | "failed" | "unknown";

export type Submission = {
  state: SubmissionState;
  txHash?: string;
  /** Stable error code when state is failed or unknown. */
  error?: string;
  /** When the state last changed. */
  at: number;
};

export type PayRecord = {
  period: Period;
  /** What the worker was due for the month. Local; the v1 schema carries only the received amount. */
  expectedCents?: number;
  /** The amount recorded as received. For "not paid" this is 0; for "paid in full" it equals expected. */
  amountCents: number;
  status: PayStatus;
  /** Date the money arrived (YYYY-MM-DD), when the worker knows it. Local only. */
  receivedOn?: string;
  note?: string;
  submission?: Submission;
  payEventUID?: string;
  payEventTx?: string;
  signedAt?: number;
  /** Local link to the record this one corrected (the earlier attestation's UID). */
  supersedes?: string;
  /** Earlier versions of this month that were corrected, oldest first. Kept so the detail view can show them. */
  previous?: { uid: string; txHash?: string; status: PayStatus; amountCents: number; expectedCents?: number; signedAt?: number }[];
  countersign?: Countersign;
  proof?: BankProof;
};

/** Expected pay for a record, falling back to the profile when the record predates the field. */
export function expectedOf(r: Pick<PayRecord, "expectedCents" | "amountCents" | "status">, profileSalaryCents: number) {
  if (typeof r.expectedCents === "number") return r.expectedCents;
  return r.status === PAY_STATUS.PAID ? r.amountCents : profileSalaryCents;
}

/** Amount recorded as received. Older unpaid records stored the salary in amountCents; treat them as 0 received. */
export function receivedOf(r: Pick<PayRecord, "expectedCents" | "amountCents" | "status">) {
  return r.status === PAY_STATUS.UNPAID ? 0 : r.amountCents;
}

/** The submission state of a record, derived for ledgers saved before the field existed. */
export function submissionOf(r: Pick<PayRecord, "submission" | "payEventUID">): SubmissionState {
  if (r.submission) return r.submission.state;
  return r.payEventUID ? "confirmed" : "draft";
}

export type Profile = {
  name: string;
  employerLabel: string;
  employerId: string;
  /** Expected monthly pay; the default for new records. */
  salaryCents: number;
  /** The day of the month pay is usually received. Drives "record this month" prompts. */
  payDay?: number;
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
  /** Set once the person has confirmed they wrote their recovery words down. */
  backupVerifiedAt?: number;
  /** Set when the person chose to skip backup during onboarding; Home keeps reminding. */
  backupSkippedAt?: number;
  /** True for the sample ledger loaded from "Try a sample". */
  demo?: boolean;
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
