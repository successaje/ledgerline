"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Wallet } from "ethers";
import type { AppConfig, Ledger, PayRecord, PayStatus, Profile, TxStage } from "@/domain/types";
import { PAY_STATUS } from "@/domain/types";
import { hashJson, hashText, idFromAddress, idFromLabel } from "@/domain/ids";
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

  const start = useCallback((input: { name: string; employerLabel: string; salaryCents: number; startPeriod: number; endPeriod: number }) => {
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

  const updateMonth = useCallback((period: number, p: { status?: PayStatus; amountCents?: number; note?: string }) => {
    patch(period, p);
  }, [patch]);

  const dismiss = useCallback((key: string) => patchLedger(l => ({ ...l, meta: { ...l.meta, dismissed: { ...(l.meta.dismissed || {}), [key]: Date.now() } } })), [patchLedger]);

  const record = useCallback(async (period: number, status?: PayStatus, amountCents?: number, note?: string) => {
    if (!config || !ledger || !walletRef.current) return;
    const w = walletRef.current;
    const existing = ledger.records.find(r => r.period === period);
    const st = status ?? existing?.status ?? PAY_STATUS.PAID;
    const amount = amountCents ?? existing?.amountCents ?? ledger.profile.salaryCents;
    const nt = note ?? existing?.note;
    setLastError(null);
    // A re-record supersedes: the previous employer answer and proof referenced the old attestation.
    patch(period, { status: st, amountCents: amount, note: nt, countersign: undefined, proof: undefined });
    try {
      const detailHash = hashJson({ worker: ledger.profile.name, employer: ledger.profile.employerLabel, note: nt || "" });
      const { delegatedAttest } = await attestModule();
      const res = await delegatedAttest({
        schemaUID: config.schemas.payEvent, schemaString: SCHEMA_DEFS.payEvent, signer: w,
        fields: [
          { name: "workerId", value: idFromAddress(w.address), type: "bytes32" },
          { name: "employerId", value: ledger.profile.employerId, type: "bytes32" },
          { name: "period", value: period, type: "uint32" },
          { name: "amountCents", value: BigInt(amount), type: "uint256" },
          { name: "status", value: st, type: "uint8" },
          { name: "detailHash", value: detailHash, type: "bytes32" },
        ],
        onStage: (stage, d) => setActivity({ period, kind: "record", stage, txHash: d?.txHash }),
      });
      patch(period, { payEventUID: res.uid, payEventTx: res.txHash, signedAt: Date.now() });
      setTimeout(() => setActivity(a => (a?.period === period ? null : a)), 1500);
      return res;
    } catch (e) {
      const ue = toUserError(e);
      setLastError(ue);
      setActivity(null);
      throw ue;
    }
  }, [config, ledger, patch]);

  const recordAllPending = useCallback(async () => {
    if (!ledger) return;
    for (const r of ledger.records) {
      if (!r.payEventUID) {
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
      pending: rs.filter(r => !r.payEventUID).length,
    };
  }, [ledger]);

  const history = useMemo(() => (ledger ? deriveActivity(ledger) : []), [ledger]);
  const due = useMemo<Due[]>(() => (ledger ? computeDue(ledger, new Date(), opts.fastForward) : []), [ledger, opts.fastForward]);

  return {
    ledger, address, activity, lastError, syncing, news, stats, history, due,
    start, loadSample, recover, backup, reset, record, recordAllPending, prove, syncCountersigns, sync,
    addMonth, updateMonth, updateProfile, dismiss, exportJson, patch,
    clearNews: () => setNews([]), clearError: () => setLastError(null),
  };
}
