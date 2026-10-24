"use client";
import { useCallback, useEffect, useState } from "react";
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
import { useConfig } from "@/hooks/useConfig";
import { useLedger } from "@/hooks/useLedger";
import { useToast } from "@/hooks/useToast";
import { encodeBundle, encodeEmployerRequest, type Bundle } from "@/domain/bundle";
import { CHAIN_NAME } from "@/services/chain";

function AppInner() {
  const { config, ready, error: cfgError } = useConfig();
  const L = useLedger(config);
  const sp = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (sp.get("sample") === "1" && L.ledger === null) { L.loadSample(); router.replace("/app"); }
  }, [sp, L, router]);
  const { push } = useToast();
  const [employerUrl, setEmployerUrl] = useState<string | null>(null);
  const [bundleUrl, setBundleUrl] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"employer" | "pick" | "bundle" | null>(null);
  const [ff, setFf] = useState(false);
  useEffect(() => { try { setFf(localStorage.getItem("ll.demo.ff") === "1"); } catch {} }, []);
  const setFastForward = (v: boolean) => { setFf(v); try { localStorage.setItem("ll.demo.ff", v ? "1" : "0"); } catch {} };

  const busy = Boolean(L.activity);

  const record = useCallback(async (period: number, status: 1 | 2) => {
    try { await L.record(period, status); push({ kind: "success", title: "Month recorded", body: "Signed by your key and written to the chain." }); }
    catch (e) { const ue = e as { title: string; hint: string }; push({ kind: "error", title: ue.title, body: ue.hint }); }
  }, [L, push]);

  const prove = useCallback(async (period: number) => {
    try { await L.prove(period); push({ kind: "success", title: "Bank proof recorded", body: "Only the pay window was disclosed." }); }
    catch (e) { const ue = e as { title: string; hint: string }; push({ kind: "error", title: ue.title, body: ue.hint }); }
  }, [L, push]);

  const sync = useCallback(async () => {
    try {
      const n = await L.syncCountersigns();
      push(n ? { kind: "success", title: `${n} confirmation${n === 1 ? "" : "s"} found` } : { kind: "info", title: "No new confirmations yet", body: "The index can take a minute after the employer signs." });
    } catch { push({ kind: "error", title: "Could not reach the record index", body: "Your records are safe. Try again in a moment." }); }
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
      proof: r.proof ? { uid: r.proof.uid, proofJson: r.proof.proofJson } : undefined,
    }));
    const b: Bundle = { v: 1, worker: { address: L.address, name: L.ledger.profile.name }, employer: { label: L.ledger.profile.employerLabel, id: L.ledger.profile.employerId }, bankAttestor: config.bankAttestor, issuedAt: Date.now(), items };
    setBundleUrl(`${window.location.origin}/verify?b=${encodeBundle(b)}`);
    setSheet("bundle");
  }, [L, config]);

  const nav = <Pill tone="outline" title={`Records are written to ${CHAIN_NAME}`}>{CHAIN_NAME}</Pill>;

  if (L.ledger === undefined || (!config && !cfgError)) {
    return <Shell wide nav={nav}><div className="app-grid"><LedgerSkeleton /><div className="skeleton" style={{ height: 180, borderRadius: 14 }} /></div></Shell>;
  }

  if (!L.ledger) {
    return <Shell wide nav={nav}>{cfgError && <div style={{ marginBottom: 16 }}><Notice kind="error" title="Cannot reach the server">{cfgError}</Notice></div>}<Onboarding onStart={L.start} onSample={L.loadSample} /></Shell>;
  }

  return (
    <Shell wide nav={nav}>
      <div style={{ display: "grid", gap: 16 }}>
        {!ready && !cfgError && <Notice kind="warn" title="Recording is not available on this server">Schemas or the service wallet are not configured. You can still browse the record.</Notice>}
        {cfgError && <Notice kind="error" title="Cannot reach the server">{cfgError}</Notice>}
        {L.lastError && !busy && (
          <Notice kind="error" title={L.lastError.title} action={<Button size="sm" onClick={L.clearError} icon={<Icon name="x" size={14} />}>Dismiss</Button>}>{L.lastError.hint}</Notice>
        )}
        <div className="app-grid">
          <LedgerList ledger={L.ledger} activity={L.activity} fastForward={ff} busy={busy || !ready} onRecord={record} onProve={prove} onAskEmployer={askEmployer} />
          <SidePanel ledger={L.ledger} address={L.address} stats={L.stats} syncing={L.syncing} busy={busy || !ready}
            fastForward={ff} onFastForward={setFastForward}
            onRecordAll={() => L.recordAllPending().catch(() => {})} onSync={sync} onAskEmployer={askEmployer} onBundle={() => setSheet("pick")}
            onReset={() => { if (confirm("Clear this record from this device? On-chain records remain and can be re-synced with the same key.")) L.reset(); }} />
        </div>
      </div>

      <div className="actionbar mobile-only">
        <Button block disabled={busy || !ready || L.stats.recorded === 0} onClick={askEmployer} icon={<Icon name="whatsapp" />}>Ask employer</Button>
        <Button variant="accent" block disabled={busy || !ready || L.stats.recorded === 0} onClick={() => setSheet("pick")} icon={<Icon name="shield" />}>Dispute bundle</Button>
      </div>

      <ShareSheet open={sheet === "employer"} onClose={() => setSheet(null)} title="Ask your employer to confirm" url={employerUrl}
        intro="Send this link. Your employer confirms or disputes each month with one tap, from any phone, with no app or account. Their answer is signed and recorded next to your month."
        whatsappText="Please confirm my salary record:" openLabel="Open as the employer" />
      <BundleSheet open={sheet === "pick"} onClose={() => setSheet(null)} ledger={L.ledger} onCreate={createBundle} />
      <ShareSheet open={sheet === "bundle"} onClose={() => setSheet(null)} title="Your dispute bundle" url={bundleUrl}
        intro="Anyone with this link can verify the selected months against the chain: your signature, the employer's answer or silence, and the bank proof. Nothing else about you is revealed."
        whatsappText="Salary dispute bundle (verifiable):" openLabel="Open the verifier" />
    </Shell>
  );
}

import { Suspense } from "react";
export default function AppPage() {
  return <Suspense fallback={<Shell wide><LedgerSkeleton /></Shell>}><AppInner /></Suspense>;
}
