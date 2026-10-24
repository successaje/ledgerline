"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Shell } from "@/components/ui/Shell";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { LedgerSkeleton } from "@/components/ui/Skeleton";
import { Onboarding } from "@/components/ledger/Onboarding";
import { LedgerList } from "@/components/ledger/LedgerList";
import { ShareSheet } from "@/components/ledger/ShareSheet";
import { BundleSheet } from "@/components/ledger/BundleSheet";
import { SidePanel } from "@/components/ledger/SidePanel";
import { RecoverySheet } from "@/components/ledger/RecoverySheet";
import { Today } from "@/components/ledger/Today";
import { MonthSheet } from "@/components/ledger/MonthSheet";
import { ActivityPanel } from "@/components/ledger/Activity";
import { SettingsSheet } from "@/components/ledger/SettingsSheet";
import { useConfig } from "@/hooks/useConfig";
import { useLedger } from "@/hooks/useLedger";
import { useToast } from "@/hooks/useToast";
import { encodeBundle, encodeEmployerRequest, type Bundle } from "@/domain/bundle";
import type { PayRecord, PayStatus } from "@/domain/types";
import { PAY_STATUS } from "@/domain/types";
import { CHAIN_NAME } from "@/services/chain";

type SheetName = "employer" | "pick" | "bundle" | "backup" | "restore" | "month" | "settings" | null;

function AppInner() {
  const { config, ready, error: cfgError } = useConfig();
  const [ff, setFf] = useState(false);
  const L = useLedger(config, { fastForward: ff });
  const { push } = useToast();
  const sp = useSearchParams();
  const router = useRouter();
  const [employerUrl, setEmployerUrl] = useState<string | null>(null);
  const [bundleUrl, setBundleUrl] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [editing, setEditing] = useState<PayRecord | undefined>(undefined);
  const [suggested, setSuggested] = useState<number | undefined>(undefined);
  const [openPeriod, setOpenPeriod] = useState<number | null>(null);

  useEffect(() => { try { setFf(localStorage.getItem("ll.demo.ff") === "1"); } catch {} }, []);
  useEffect(() => {
    if (sp.get("sample") === "1" && L.ledger === null) { L.loadSample(); router.replace("/app"); }
  }, [sp, L, router]);
  useEffect(() => {
    // Open the month that most needs attention on first render.
    if (L.ledger && openPeriod === null) {
      const unpaid = L.ledger.records.find(r => r.status === PAY_STATUS.UNPAID);
      if (unpaid) setOpenPeriod(unpaid.period);
    }
  }, [L.ledger, openPeriod]);
  const setFastForward = (v: boolean) => { setFf(v); try { localStorage.setItem("ll.demo.ff", v ? "1" : "0"); } catch {} };

  const busy = Boolean(L.activity);
  const fail = (e: unknown) => { const ue = e as { title: string; hint: string }; push({ kind: "error", title: ue.title, body: ue.hint }); };

  const record = useCallback(async (period: number, status?: PayStatus, amount?: number, note?: string) => {
    setOpenPeriod(period);
    try { await L.record(period, status, amount, note); push({ kind: "success", title: "Month recorded", body: "Signed by your key and written to the chain." }); }
    catch (e) { fail(e); }
  }, [L, push]); // eslint-disable-line react-hooks/exhaustive-deps

  const prove = useCallback(async (period: number) => {
    try { await L.prove(period); push({ kind: "success", title: "Bank proof recorded", body: "Only the pay window was disclosed." }); }
    catch (e) { fail(e); }
  }, [L, push]); // eslint-disable-line react-hooks/exhaustive-deps

  const sync = useCallback(async () => {
    const res = await L.sync(true);
    if (!res) { push({ kind: "error", title: "Could not reach the record index", body: "Your records are safe. Try again in a moment." }); return; }
    const n = res.answers + res.added + res.updated + res.proofs;
    push(n ? { kind: "success", title: `${res.answers} new answer${res.answers === 1 ? "" : "s"}${res.added ? `, ${res.added} month${res.added === 1 ? "" : "s"} recovered` : ""}` } : { kind: "info", title: "Everything is up to date", body: "The index can take a minute after the employer signs." });
  }, [L, push]);

  const askEmployer = useCallback(() => {
    if (!L.ledger) return;
    const items = L.ledger.records.filter(r => r.payEventUID && !r.countersign).map(r => ({ uid: r.payEventUID!, period: r.period, amountCents: r.amountCents, status: r.status }));
    if (!items.length) { push({ kind: "info", title: "Nothing to confirm", body: "Every recorded month already has an answer from the employer." }); return; }
    const req = encodeEmployerRequest({ worker: L.address, workerName: L.ledger.profile.name, employerLabel: L.ledger.profile.employerLabel, items });
    setEmployerUrl(`${window.location.origin}/employer?c=${req}`);
    setSheet("employer");
  }, [L, push]);

  const createBundle = useCallback((periods: number[]) => {
    if (!L.ledger || !config) return;
    const items = L.ledger.records.filter(r => periods.includes(r.period) && r.payEventUID).map(r => ({
      period: r.period, amountCents: r.amountCents, status: r.status, payEventUID: r.payEventUID!, countersignUID: r.countersign?.uid,
      proof: r.proof?.proofJson ? { uid: r.proof.uid, proofJson: r.proof.proofJson } : undefined,
    }));
    const b: Bundle = { v: 1, worker: { address: L.address, name: L.ledger.profile.name }, employer: { label: L.ledger.profile.employerLabel, id: L.ledger.profile.employerId }, bankAttestor: config.bankAttestor, issuedAt: Date.now(), items };
    setBundleUrl(`${window.location.origin}/verify?b=${encodeBundle(b)}`);
    setSheet("bundle");
  }, [L, config]);

  const openMonth = (p: number) => { setOpenPeriod(p); document.getElementById(`month-${p}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); };

  const nav = <Pill tone="outline" title={`Records are written to ${CHAIN_NAME}`}>{CHAIN_NAME}</Pill>;

  if (L.ledger === undefined || (!config && !cfgError)) {
    return <Shell wide nav={nav}><div className="app-grid"><LedgerSkeleton /><div className="skeleton" style={{ height: 180, borderRadius: 14 }} /></div></Shell>;
  }

  if (!L.ledger) {
    return <Shell wide nav={nav}>{cfgError && <div style={{ marginBottom: 16 }}><Notice kind="error" title="Cannot reach the server">{cfgError}</Notice></div>}<Onboarding onStart={L.start} onSample={L.loadSample} onRestore={() => setSheet("restore")} /><RecoverySheet open={sheet === "restore"} onClose={() => setSheet(null)} mode="restore" onRestore={L.recover} /></Shell>;
  }

  const ledger = L.ledger;
  return (
    <Shell wide nav={nav}>
      <div style={{ display: "grid", gap: 16 }}>
        {!ready && !cfgError && <Notice kind="warn" title="Recording is not available on this server">Schemas or the service wallet are not configured. You can still browse the record.</Notice>}
        {cfgError && <Notice kind="error" title="Cannot reach the server">{cfgError}</Notice>}
        {L.lastError && !busy && (
          <Notice kind="error" title={L.lastError.title} action={<Button size="sm" onClick={L.clearError} icon={<Icon name="x" size={14} />}>Dismiss</Button>}>{L.lastError.hint}</Notice>
        )}
        <Today name={ledger.profile.name} due={L.due} news={L.news} busy={busy || !ready}
          onRecordDue={(p, s) => { L.addMonth(p, s); void record(p, s); }}
          onRecordDrafts={() => L.recordAllPending().catch(() => {})}
          onAskEmployer={askEmployer} onOpenMonth={openMonth} onDismissNews={L.clearNews} />
        <div className="app-grid">
          <LedgerList ledger={ledger} activity={L.activity} fastForward={ff} busy={busy || !ready} openPeriod={openPeriod} onOpenPeriod={setOpenPeriod}
            onRecord={(p, s) => void record(p, s)} onEdit={r => { setEditing(r); setSuggested(undefined); setSheet("month"); }} onProve={p => void prove(p)} onAskEmployer={askEmployer} />
          <SidePanel ledger={ledger} address={L.address} stats={L.stats} syncing={L.syncing} busy={busy || !ready}
            onRecordAll={() => L.recordAllPending().catch(() => {})} onSync={sync} onAskEmployer={askEmployer} onBundle={() => setSheet("pick")}
            onAddMonth={() => { setEditing(undefined); setSuggested(undefined); setSheet("month"); }} onSettings={() => setSheet("settings")}>
            <ActivityPanel events={L.history} onOpen={openMonth} />
          </SidePanel>
        </div>
      </div>

      <div className="actionbar mobile-only">
        <Button block disabled={busy || !ready || L.stats.recorded === 0} onClick={askEmployer} icon={<Icon name="whatsapp" />}>Ask employer</Button>
        <Button variant="accent" block disabled={busy || !ready || L.stats.recorded === 0} onClick={() => setSheet("pick")} icon={<Icon name="shield" />}>Dispute bundle</Button>
      </div>

      <ShareSheet open={sheet === "employer"} onClose={() => setSheet(null)} title="Ask your employer to confirm" url={employerUrl}
        intro="Send this link. Your employer confirms or disputes each month with one tap, from any phone, with no app or account. Their answer is signed and recorded next to your month."
        whatsappText="Please confirm my salary record:" openLabel="Open as the employer" />
      <RecoverySheet open={sheet === "backup"} onClose={() => setSheet("settings")} mode="backup" backup={L.backup} />
      <BundleSheet open={sheet === "pick"} onClose={() => setSheet(null)} ledger={ledger} onCreate={createBundle} />
      <ShareSheet open={sheet === "bundle"} onClose={() => setSheet(null)} title="Your dispute bundle" url={bundleUrl}
        intro="Anyone with this link can verify the selected months against the chain: your signature, the employer's answer or silence, and the bank proof. Nothing else about you is revealed."
        whatsappText="Salary dispute bundle (verifiable):" openLabel="Open the verifier" />
      <MonthSheet open={sheet === "month"} onClose={() => setSheet(null)} record={editing} suggestedPeriod={suggested}
        takenPeriods={ledger.records.map(r => r.period)} salaryCents={ledger.profile.salaryCents} busy={busy || !ready}
        onSaveDraft={(p, s, a, n) => { if (editing) L.updateMonth(p, { status: s, amountCents: a, note: n }); else L.addMonth(p, s, a, n); setOpenPeriod(p); push({ kind: "success", title: "Draft saved", body: "Only on this phone until you sign it." }); }}
        onRecord={(p, s, a, n) => { if (!editing) L.addMonth(p, s, a, n); return record(p, s, a, n); }} />
      <SettingsSheet open={sheet === "settings"} onClose={() => setSheet(null)} profile={ledger.profile} address={L.address}
        fastForward={ff} onFastForward={setFastForward}
        onSave={p => { L.updateProfile(p); push({ kind: "success", title: "Settings saved" }); }}
        onBackup={() => setSheet("backup")} onExport={L.exportJson}
        onReset={() => { if (confirm("Clear this record from this device? On-chain records remain and can be restored with your recovery words.")) { L.reset(); setSheet(null); } }} />
    </Shell>
  );
}

export default function AppPage() {
  return <Suspense fallback={<Shell wide><LedgerSkeleton /></Shell>}><AppInner /></Suspense>;
}
