"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Wallet } from "ethers";
import type { AppConfig, Ledger, PayRecord, PayStatus, TxStage } from "@/domain/types";
import { PAY_STATUS } from "@/domain/types";
import { hashJson, hashText, idFromAddress } from "@/domain/ids";
import { periodWindow, sgd } from "@/domain/format";
import { SCHEMA_DEFS, getReferencing } from "@/services/chain";
import { requestBankProof } from "@/services/api";
import { getOrCreateKey, exportSecret, importSecret } from "@/services/keys";
import { rebuildFromChain } from "@/services/recovery";
import { loadLedger, saveLedger, sampleLedger, clearLedger, upsertRecord, newLedger } from "@/services/ledger-store";
import { toUserError, type UserError } from "@/services/errors";

const attestModule = () => import("@/services/attest");

export type Activity = { period: number; kind: "record" | "proof"; stage: TxStage; txHash?: string };

/** All ledger behaviour for the worker app: local state, chain writes with stages, and indexer sync. */
export function useLedger(config: AppConfig | null) {
  const [ledger, setLedgerState] = useState<Ledger | null | undefined>(undefined); // undefined = not loaded yet
  const [activity, setActivity] = useState<Activity | null>(null);
  const [lastError, setLastError] = useState<UserError | null>(null);
  const [syncing, setSyncing] = useState(false);
  const walletRef = useRef<Wallet | null>(null);

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

  const start = useCallback((input: { name: string; employerLabel: string; salaryCents: number; startPeriod: number; endPeriod: number }) => {
    setLedger(newLedger(input));
  }, [setLedger]);

  const loadSample = useCallback(() => setLedger(sampleLedger()), [setLedger]);

  /** Restores a key from a phrase or raw key and rebuilds the ledger from chain records. */
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

  const record = useCallback(async (period: number, status: PayStatus, amountCents?: number, note?: string) => {
    if (!config || !ledger || !walletRef.current) return;
    const w = walletRef.current;
    const amount = amountCents ?? ledger.records.find(r => r.period === period)?.amountCents ?? ledger.profile.salaryCents;
    setLastError(null);
    patch(period, { status, amountCents: amount, note });
    try {
      const detailHash = hashJson({ worker: ledger.profile.name, employer: ledger.profile.employerLabel, note: note || "" });
      const { delegatedAttest } = await attestModule();
      const res = await delegatedAttest({
        schemaUID: config.schemas.payEvent, schemaString: SCHEMA_DEFS.payEvent, signer: w,
        fields: [
          { name: "workerId", value: idFromAddress(w.address), type: "bytes32" },
          { name: "employerId", value: ledger.profile.employerId, type: "bytes32" },
          { name: "period", value: period, type: "uint32" },
          { name: "amountCents", value: BigInt(amount), type: "uint256" },
          { name: "status", value: status, type: "uint8" },
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

  return { ledger, address, activity, lastError, syncing, stats, start, loadSample, recover, backup, reset, record, recordAllPending, prove, syncCountersigns, patch, clearError: () => setLastError(null) };
}
