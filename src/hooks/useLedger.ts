"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Wallet } from "ethers";
import type { AppConfig, Ledger, PayRecord, PayStatus, Profile, Submission, TxStage } from "@/domain/types";
import { PAY_STATUS } from "@/domain/types";
import { hashJson, hashText, idFromAddress, idFromLabel } from "@/domain/ids";
import { ZeroHash } from "ethers";
import { periodWindow, sgd } from "@/domain/format";
import { deriveActivity, sinceLastVisit, type ActivityEvent } from "@/domain/activity";
import { computeDue, type Due } from "@/domain/due";
import { SCHEMA_DEFS, getReferencing } from "@/services/chain";
import { requestBankProof } from "@/services/api";
import { getOrCreateKey, exportSecret, importSecret } from "@/services/keys";
import { rebuildFromChain, mergeFromChain } from "@/services/recovery";
import { loadLedger, saveLedger, sampleLedger, clearLedger, upsertRecord, newLedger, exportLedger } from "@/services/ledger-store";
import { toUserError, type UserError } from "@/services/errors";

const attestModule = () => import("@/services/attest");

export type Activity = { period: number; kind: "record" | "proof"; stage: TxStage; txHash?: string };

/** All ledger behaviour for the worker app: local state, chain writes with stages, reconciliation and derived views. */
export function useLedger(config: AppConfig | null, opts: { fastForward?: boolean } = {}) {
  const [ledger, setLedgerState] = useState<Ledger | null | undefined>(undefined); // undefined = not loaded yet
  const [activity, setActivity] = useState<Activity | null>(null);
  const [lastError, setLastError] = useState<UserError | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [news, setNews] = useState<ActivityEvent[]>([]);
  const walletRef = useRef<Wallet | null>(null);
  const syncedRef = useRef(false);

  useEffect(() => {
    walletRef.current = getOrCreateKey("worker");
    setLedgerState(loadLedger());
  }, []);

  const address = walletRef.current?.address || "";

  const setLedger = useCallback((l: Ledger | null) => {
    setLedgerState(l);
    if (l) saveLedger(l); else clearLedger();
  }, []);

  const patch = useCallback((period: number, p: Partial<PayRecord>) => {
    setLedgerState(cur => { if (!cur) return cur; const n = upsertRecord(cur, period, p); saveLedger(n); return n; });
  }, []);

  const patchLedger = useCallback((fn: (l: Ledger) => Ledger) => {
    setLedgerState(cur => { if (!cur) return cur; const n = fn(cur); saveLedger(n); return n; });
  }, []);

  /** Reconcile with the chain once per visit, and compute what changed since the last visit. */
  const sync = useCallback(async (silent = false) => {
    if (!config || !ledger || !walletRef.current) return null;
    setSyncing(true);
    try {
      const res = await mergeFromChain(ledger, walletRef.current.address, config.schemas);
      const lastSeen = ledger.meta.lastSeenAt;
      const merged: Ledger = { ...res.ledger, meta: { ...res.ledger.meta, lastSeenAt: Date.now() } };
      setLedger(merged);
      if (!silent) setNews(sinceLastVisit(merged, lastSeen));
      return res;
    } catch (e) {
      if (!silent) setLastError(toUserError(new Error("indexer: " + (e instanceof Error ? e.message : String(e)))));
      return null;
    } finally { setSyncing(false); }
  }, [config, ledger, setLedger]);

  useEffect(() => {
    if (syncedRef.current || !config || !ledger) return;
    syncedRef.current = true;
    if (ledger.records.some(r => r.payEventUID)) void sync(false);
    else patchLedger(l => ({ ...l, meta: { ...l.meta, lastSeenAt: Date.now() } }));
  }, [config, ledger, sync, patchLedger]);

  const start = useCallback((input: { name: string; employerLabel: string; salaryCents: number; startPeriod?: number; endPeriod?: number; payDay?: number }) => {
    setLedger(newLedger(input));
  }, [setLedger]);

  const loadSample = useCallback(() => setLedger(sampleLedger()), [setLedger]);

  const recover = useCallback(async (secret: string, profile: { name: string; employerLabel: string; salaryCents: number }) => {
    if (!config) throw new Error("not ready");
    const w = importSecret("worker", secret);
    walletRef.current = w;
    const l = await rebuildFromChain({ address: w.address, schemas: config.schemas, ...profile });
    setLedger(l);
    return l.records.length;
  }, [config, setLedger]);

  const backup = useCallback(() => exportSecret("worker"), []);
  const reset = useCallback(() => setLedger(null), [setLedger]);

  const updateProfile = useCallback((p: Partial<Profile>) => {
    patchLedger(l => {
      const profile = { ...l.profile, ...p };
      if (p.employerLabel && p.employerLabel !== l.profile.employerLabel) profile.employerId = idFromLabel(p.employerLabel);
      return { ...l, profile };
    });
  }, [patchLedger]);

  const addMonth = useCallback((period: number, status: PayStatus = PAY_STATUS.PAID, amountCents?: number, note?: string) => {
    patchLedger(l => upsertRecord(l, period, { status, amountCents: amountCents ?? l.profile.salaryCents, note }));
  }, [patchLedger]);

  const updateMonth = useCallback((period: number, p: { status?: PayStatus; amountCents?: number; expectedCents?: number; note?: string; receivedOn?: string }) => {
    patch(period, p);
  }, [patch]);

  const removeDraft = useCallback((period: number) => {
    patchLedger(l => ({ ...l, records: l.records.filter(r => !(r.period === period && !r.payEventUID)) }));
  }, [patchLedger]);

  const markBackup = useCallback((kind: "verified" | "skipped") => {
    patchLedger(l => ({ ...l, meta: { ...l.meta, ...(kind === "verified" ? { backupVerifiedAt: Date.now() } : { backupSkippedAt: Date.now() }) } }));
  }, [patchLedger]);

  const dismiss = useCallback((key: string) => patchLedger(l => ({ ...l, meta: { ...l.meta, dismissed: { ...(l.meta.dismissed || {}), [key]: Date.now() } } })), [patchLedger]);

  type RecordInput = { status?: PayStatus; amountCents?: number; expectedCents?: number; note?: string; receivedOn?: string };

  /**
   * Signs and publishes one month. The record moves draft -> awaiting -> submitted -> confirmed, or to failed
   * (nothing sent) or unknown (sent, result not learnt; checkSubmission resolves it). A month that already has an
   * attestation is corrected: the new attestation supersedes the old one, which stays listed under "previous".
   */
  const record = useCallback(async (period: number, status?: PayStatus, amountCents?: number, note?: string, extra: Omit<RecordInput, "status" | "amountCents" | "note"> = {}) => {
    if (!config || !ledger || !walletRef.current) return;
    const w = walletRef.current;
    const existing = ledger.records.find(r => r.period === period);
    const st = status ?? existing?.status ?? PAY_STATUS.PAID;
    const expected = extra.expectedCents ?? existing?.expectedCents ?? ledger.profile.salaryCents;
    const amount = st === PAY_STATUS.UNPAID ? 0 : st === PAY_STATUS.PAID ? (amountCents ?? expected) : (amountCents ?? existing?.amountCents ?? 0);
    const nt = note ?? existing?.note;
    const receivedOn = extra.receivedOn ?? existing?.receivedOn;
    const supersedes = existing?.payEventUID;
    const previous = supersedes && existing
      ? [...(existing.previous || []), { uid: supersedes, txHash: existing.payEventTx, status: existing.status, amountCents: existing.amountCents, expectedCents: existing.expectedCents, signedAt: existing.signedAt }]
      : existing?.previous;
    setLastError(null);
    const sub = (state: Submission["state"], more: Partial<Submission> = {}): Submission => ({ state, at: Date.now(), ...more });
    // A correction supersedes: the previous employer answer and proof referenced the old attestation.
    patch(period, { status: st, amountCents: amount, expectedCents: expected, note: nt, receivedOn, countersign: undefined, proof: undefined, submission: sub("awaiting"), previous });
    let txHash: string | undefined;
    try {
      const detailHash = hashJson({ worker: ledger.profile.name, employer: ledger.profile.employerLabel, note: nt || "", expectedCents: expected, receivedOn: receivedOn || "", supersedes: supersedes || "" });
      const { delegatedAttest } = await attestModule();
      const v2 = Boolean(config.schemas.payEventV2);
      const common = [
        { name: "workerId", value: idFromAddress(w.address), type: "bytes32" },
        { name: "employerId", value: ledger.profile.employerId, type: "bytes32" },
        { name: "period", value: period, type: "uint32" },
      ];
      const res = await delegatedAttest({
        schemaUID: v2 ? config.schemas.payEventV2! : config.schemas.payEvent, schemaString: v2 ? SCHEMA_DEFS.payEventV2 : SCHEMA_DEFS.payEvent, signer: w,
        fields: v2
          ? [...common,
            { name: "expectedCents", value: BigInt(expected), type: "uint256" },
            { name: "receivedCents", value: BigInt(amount), type: "uint256" },
            { name: "status", value: st, type: "uint8" },
            { name: "detailHash", value: detailHash, type: "bytes32" },
            { name: "supersedes", value: supersedes || ZeroHash, type: "bytes32" }]
          : [...common,
            { name: "amountCents", value: BigInt(amount), type: "uint256" },
            { name: "status", value: st, type: "uint8" },
            { name: "detailHash", value: detailHash, type: "bytes32" }],
        onStage: (stage, d) => {
          if (d?.txHash && !txHash) { txHash = d.txHash; patch(period, { submission: sub("submitted", { txHash }) }); }
          setActivity({ period, kind: "record", stage, txHash: d?.txHash });
        },
      });
      patch(period, { payEventUID: res.uid, payEventTx: res.txHash, payEventSchema: v2 ? 2 : 1, signedAt: Date.now(), supersedes, submission: sub("confirmed", { txHash: res.txHash }) });
      setTimeout(() => setActivity(a => (a?.period === period ? null : a)), 1500);
      return res;
    } catch (e) {
      const ue = toUserError(e);
      // Sent but not confirmed: the chain may still have it. Keep the hash and let reconciliation decide.
      patch(period, { submission: txHash ? sub("unknown", { txHash, error: ue.code }) : sub("failed", { error: ue.code }) });
      setLastError(ue);
      setActivity(null);
      throw ue;
    }
  }, [config, ledger, patch]);

  /** Resolves a record whose transaction was sent but whose result this device never learnt. */
  const checkSubmission = useCallback(async (period: number) => {
    const rec = ledger?.records.find(r => r.period === period);
    const tx = rec?.submission?.txHash;
    if (!rec || !tx) return "none" as const;
    const { resolveSubmission } = await attestModule();
    const res = await resolveSubmission(tx);
    if (res.state === "confirmed") patch(period, { payEventUID: res.uid, payEventTx: tx, signedAt: rec.signedAt || Date.now(), submission: { state: "confirmed", txHash: tx, at: Date.now() } });
    else if (res.state === "failed") patch(period, { submission: { state: "failed", txHash: tx, at: Date.now(), error: "rejected" } });
    return res.state;
  }, [ledger, patch]);

  const recordAllPending = useCallback(async () => {
    if (!ledger) return;
    for (const r of ledger.records) {
      if (!r.payEventUID && r.submission?.state !== "unknown" && r.submission?.state !== "submitted") {
        try { await record(r.period, r.status, r.amountCents, r.note); } catch { break; }
      }
    }
  }, [ledger, record]);

  const prove = useCallback(async (period: number) => {
    if (!config || !ledger || !walletRef.current) return;
    const rec = ledger.records.find(r => r.period === period);
    if (!rec?.payEventUID) return;
    const w = walletRef.current;
    setLastError(null);
    try {
      setActivity({ period, kind: "proof", stage: "preparing" });
      const win = periodWindow(period, ledger.profile.payWindow.fromDay, ledger.profile.payWindow.toDay);
      const counterparty = ledger.profile.sample ? "TAN" : undefined;
      const p = await requestBankProof({ account: ledger.profile.sample ? "maria" : "demo", from: win.from, to: win.to, minAmountCents: rec.amountCents, counterparty });
      const { delegatedAttest } = await attestModule();
      const res = await delegatedAttest({
        schemaUID: config.schemas.bankProof, schemaString: SCHEMA_DEFS.bankProof, signer: w, refUID: rec.payEventUID,
        fields: [
          { name: "payEventUID", value: rec.payEventUID, type: "bytes32" },
          { name: "predicateHash", value: hashJson(p.predicate), type: "bytes32" },
          { name: "proofHash", value: hashText(p.proofJson), type: "bytes32" },
          { name: "method", value: p.method, type: "uint8" },
          { name: "satisfied", value: p.satisfied, type: "bool" },
        ],
        onStage: (stage, d) => setActivity({ period, kind: "proof", stage, txHash: d?.txHash }),
      });
      const summary = p.satisfied
        ? `No credit of ${sgd(rec.amountCents)} or more from the employer between ${win.from} and ${win.to}.`
        : `${p.extracted.count} matching credit${p.extracted.count === 1 ? "" : "s"} found between ${win.from} and ${win.to}.`;
      patch(period, { proof: { uid: res.uid, satisfied: p.satisfied, method: p.method, summary, proofJson: p.proofJson, window: win, at: Date.now() } });
      setTimeout(() => setActivity(a => (a?.period === period ? null : a)), 1500);
    } catch (e) {
      const ue = toUserError(e);
      setLastError(ue);
      setActivity(null);
      throw ue;
    }
  }, [config, ledger, patch]);

  /** Pulls employer countersigns from the indexer for months that have none yet. */
  const syncCountersigns = useCallback(async () => {
    if (!config || !ledger) return 0;
    const pending = ledger.records.filter(r => r.payEventUID && !r.countersign);
    if (!pending.length) return 0;
    setSyncing(true);
    try {
      const list = await getReferencing(pending.map(r => r.payEventUID!), config.schemas.countersign);
      let n = 0;
      for (const a of list) {
        const r = pending.find(x => x.payEventUID === a.refUID);
        if (r) { patch(r.period, { countersign: { uid: a.id, decision: Number(a.decoded.decision) as 1 | 2, employer: a.attester, at: Number(a.time) * 1000 } }); n++; }
      }
      return n;
    } finally { setSyncing(false); }
  }, [config, ledger, patch]);

  const exportJson = useCallback(() => {
    if (!ledger) return;
    const blob = new Blob([exportLedger(ledger)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ledgerline-${ledger.profile.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }, [ledger]);

  const stats = useMemo(() => {
    const rs = ledger?.records || [];
    return {
      months: rs.length,
      recorded: rs.filter(r => r.payEventUID).length,
      confirmed: rs.filter(r => r.countersign?.decision === 1).length,
      unpaid: rs.filter(r => r.status === PAY_STATUS.UNPAID).length,
      short: rs.filter(r => r.status !== PAY_STATUS.PAID).length,
      pending: rs.filter(r => !r.payEventUID).length,
      unresolved: rs.filter(r => r.submission?.state === "unknown" || r.submission?.state === "submitted").length,
    };
  }, [ledger]);

  const history = useMemo(() => (ledger ? deriveActivity(ledger) : []), [ledger]);
  const due = useMemo<Due[]>(() => (ledger ? computeDue(ledger, new Date(), opts.fastForward) : []), [ledger, opts.fastForward]);

  return {
    ledger, address, activity, lastError, syncing, news, stats, history, due,
    start, loadSample, recover, backup, reset, record, checkSubmission, recordAllPending, prove, syncCountersigns, sync,
    addMonth, updateMonth, removeDraft, markBackup, updateProfile, dismiss, exportJson, patch,
    clearNews: () => setNews([]), clearError: () => setLastError(null),
  };
}
