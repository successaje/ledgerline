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
import { logEvent } from "@/services/analytics";
import type { UserError } from "@/services/errors";
import { Pwa } from "@/components/ui/Pwa";
import { useT, LanguageSwitch } from "@/i18n";

type SheetName = "employer" | "pick" | "bundle" | "backup" | "restore" | "month" | "settings" | null;

function AppInner() {
  const { t, tn } = useT();
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
    if (L.ledger && openPeriod === null) {
      const unpaid = L.ledger.records.find(r => r.status === PAY_STATUS.UNPAID);
      if (unpaid) setOpenPeriod(unpaid.period);
    }
  }, [L.ledger, openPeriod]);
  const setFastForward = (v: boolean) => { setFf(v); try { localStorage.setItem("ll.demo.ff", v ? "1" : "0"); } catch {} };

  const busy = Boolean(L.activity);
  const errTitle = (ue: UserError) => t(`er_${ue.code}_title` as "er_unknown_title");
  const errText = (ue: UserError) => t(`er_${ue.code}_text` as "er_unknown_text");
  const fail = (e: unknown) => { const ue = e as UserError; push({ kind: "error", title: errTitle(ue), body: errText(ue) }); };

  const record = useCallback(async (period: number, status?: PayStatus, amount?: number, note?: string) => {
    setOpenPeriod(period);
    logEvent("record_started");
    try { await L.record(period, status, amount, note); logEvent("record_done"); push({ kind: "success", title: t("ap_recorded_title"), body: t("ap_recorded_text") }); }
    catch (e) { logEvent("record_failed"); fail(e); }
  }, [L, push, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const prove = useCallback(async (period: number) => {
    try { await L.prove(period); logEvent("proof_done"); push({ kind: "success", title: t("ap_proof_title"), body: t("ap_proof_text") }); }
    catch (e) { logEvent("proof_failed"); fail(e); }
  }, [L, push, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const sync = useCallback(async () => {
    const res = await L.sync(true);
    if (!res) { push({ kind: "error", title: t("ap_index_fail_title"), body: t("ap_index_fail_text") }); return; }
    const n = res.answers + res.added + res.updated + res.proofs;
    push(n ? { kind: "success", title: tn("ap_new_answers", res.answers) + (res.added ? tn("ap_recovered", res.added) : "") } : { kind: "info", title: t("ap_up_to_date"), body: t("ap_up_to_date_text") });
  }, [L, push, t, tn]);

  const askEmployer = useCallback(() => {
    if (!L.ledger) return;
    const items = L.ledger.records.filter(r => r.payEventUID && !r.countersign).map(r => ({ uid: r.payEventUID!, period: r.period, amountCents: r.amountCents, status: r.status }));
    if (!items.length) { push({ kind: "info", title: t("ap_nothing_title"), body: t("ap_nothing_text") }); return; }
    const req = encodeEmployerRequest({ worker: L.address, workerName: L.ledger.profile.name, employerLabel: L.ledger.profile.employerLabel, items });
    setEmployerUrl(`${window.location.origin}/employer?c=${req}`);
    logEvent("employer_link_created", { months: items.length });
    setSheet("employer");
  }, [L, push, t]);

  const createBundle = useCallback((periods: number[]) => {
    if (!L.ledger || !config) return;
    const items = L.ledger.records.filter(r => periods.includes(r.period) && r.payEventUID).map(r => ({
      period: r.period, amountCents: r.amountCents, status: r.status, payEventUID: r.payEventUID!, countersignUID: r.countersign?.uid,
      proof: r.proof?.proofJson ? { uid: r.proof.uid, proofJson: r.proof.proofJson } : undefined,
    }));
    const b: Bundle = { v: 1, worker: { address: L.address, name: L.ledger.profile.name }, employer: { label: L.ledger.profile.employerLabel, id: L.ledger.profile.employerId }, bankAttestor: config.bankAttestor, issuedAt: Date.now(), items };
    setBundleUrl(`${window.location.origin}/verify?b=${encodeBundle(b)}`);
    logEvent("bundle_created", { months: items.length });
    setSheet("bundle");
  }, [L, config]);

  const openMonth = (p: number) => { setOpenPeriod(p); document.getElementById(`month-${p}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); };

  const nav = <><LanguageSwitch /><Pill tone="outline" title={t("chain_pill_title", { chain: CHAIN_NAME })}>{CHAIN_NAME}</Pill></>;

  if (L.ledger === undefined || (!config && !cfgError)) {
    return <Shell wide nav={nav}><div className="app-grid"><LedgerSkeleton /><div className="skeleton" style={{ height: 180, borderRadius: 14 }} /></div></Shell>;
  }

  if (!L.ledger) {
    return <Shell wide nav={nav}>{cfgError && <div style={{ marginBottom: 16 }}><Notice kind="error" title={t("ap_no_server_title")}>{cfgError}</Notice></div>}<Onboarding onStart={i => { logEvent("onboarding_started"); L.start(i); }} onSample={() => { logEvent("sample_loaded"); L.loadSample(); }} onRestore={() => setSheet("restore")} /><RecoverySheet open={sheet === "restore"} onClose={() => setSheet(null)} mode="restore" onRestore={L.recover} /></Shell>;
  }

  const ledger = L.ledger;
  return (
    <Shell wide nav={nav}>
      <div style={{ display: "grid", gap: 16 }}>
        {!ready && !cfgError && <Notice kind="warn" title={t("ap_not_ready_title")}>{t("ap_not_ready_text")}</Notice>}
        {cfgError && <Notice kind="error" title={t("ap_no_server_title")}>{cfgError}</Notice>}
        {L.lastError && !busy && (
          <Notice kind="error" title={errTitle(L.lastError)} action={<Button size="sm" onClick={L.clearError} icon={<Icon name="x" size={14} />}>{t("ap_dismiss")}</Button>}>{errText(L.lastError)}</Notice>
        )}
        <Pwa worthInstalling={L.stats.recorded > 0} />
        <Today name={ledger.profile.name} due={L.due} news={L.news} busy={busy || !ready}
          onRecordDue={(p, s) => { L.addMonth(p, s); void record(p, s); }}
          onRecordDrafts={() => L.recordAllPending().catch(() => {})}
          onAskEmployer={askEmployer} onOpenMonth={openMonth} onDismissNews={L.clearNews} />
        <div className="app-grid">
          <LedgerList ledger={ledger} activity={L.activity} fastForward={ff} busy={busy || !ready} openPeriod={openPeriod} onOpenPeriod={setOpenPeriod}
            onRecord={(p, s) => void record(p, s)} onEdit={r => { setEditing(r); setSuggested(undefined); setSheet("month"); }} onProve={p => void prove(p)} onAskEmployer={askEmployer} />
          <SidePanel stats={L.stats} syncing={L.syncing} busy={busy || !ready}
            onRecordAll={() => L.recordAllPending().catch(() => {})} onSync={sync} onAskEmployer={askEmployer} onBundle={() => setSheet("pick")}
            onAddMonth={() => { setEditing(undefined); setSuggested(undefined); setSheet("month"); }} onSettings={() => setSheet("settings")}>
            <ActivityPanel events={L.history} onOpen={openMonth} />
          </SidePanel>
        </div>
      </div>

      <div className="actionbar mobile-only">
        <Button block disabled={busy || !ready || L.stats.recorded === 0} onClick={askEmployer} icon={<Icon name="whatsapp" />}>{t("sp_ask_short")}</Button>
        <Button variant="accent" block disabled={busy || !ready || L.stats.recorded === 0} onClick={() => setSheet("pick")} icon={<Icon name="shield" />}>{t("sp_bundle_short")}</Button>
      </div>

      <ShareSheet open={sheet === "employer"} onClose={() => setSheet(null)} title={t("sh_emp_title")} url={employerUrl} intro={t("sh_emp_intro")} whatsappText={t("sh_emp_wa")} openLabel={t("sh_emp_open")} />
      <RecoverySheet open={sheet === "backup"} onClose={() => setSheet("settings")} mode="backup" backup={L.backup} />
      <BundleSheet open={sheet === "pick"} onClose={() => setSheet(null)} ledger={ledger} onCreate={createBundle} />
      <ShareSheet open={sheet === "bundle"} onClose={() => setSheet(null)} title={t("sh_bundle_title")} url={bundleUrl} intro={t("sh_bundle_intro")} whatsappText={t("sh_bundle_wa")} openLabel={t("sh_bundle_open")} />
      <MonthSheet open={sheet === "month"} onClose={() => setSheet(null)} record={editing} suggestedPeriod={suggested}
        takenPeriods={ledger.records.map(r => r.period)} salaryCents={ledger.profile.salaryCents} busy={busy || !ready}
        onSaveDraft={(p, s, a, n) => { if (editing) L.updateMonth(p, { status: s, amountCents: a, note: n }); else L.addMonth(p, s, a, n); setOpenPeriod(p); logEvent("month_edited"); push({ kind: "success", title: t("ap_draft_saved"), body: t("ap_draft_saved_text") }); }}
        onRecord={(p, s, a, n) => { if (!editing) L.addMonth(p, s, a, n); return record(p, s, a, n); }} />
      <SettingsSheet open={sheet === "settings"} onClose={() => setSheet(null)} profile={ledger.profile} address={L.address}
        fastForward={ff} onFastForward={setFastForward}
        onSave={p => { L.updateProfile(p); logEvent("settings_saved"); push({ kind: "success", title: t("ap_settings_saved") }); }}
        onBackup={() => setSheet("backup")} onExport={L.exportJson}
        onReset={() => { if (confirm(t("se_clear_confirm"))) { L.reset(); setSheet(null); } }} />
    </Shell>
  );
}

export default function AppPage() {
  return <Suspense fallback={<Shell wide><LedgerSkeleton /></Shell>}><AppInner /></Suspense>;
}
