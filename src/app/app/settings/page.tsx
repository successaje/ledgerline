"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Frame } from "@/components/worker/Frame";
import { Button } from "@/components/ui/Button";
import { Field, MoneyInput, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { BackupSheet, RestoreSheet } from "@/components/worker/Backup";
import { shortAddr } from "@/domain/format";
import { CHAIN_NAME } from "@/services/chain";
import { useToast } from "@/hooks/useToast";
import { logEvent } from "@/services/analytics";
import { LANGS, useT, type Lang } from "@/i18n";

export default function SettingsPage() {
  const { t, lang, setLang } = useT();
  const { push } = useToast();
  const router = useRouter();
  const [sheet, setSheet] = useState<"backup" | "verify" | "restore" | null>(null);
  useEffect(() => { if (window.location.hash === "#backup") setTimeout(() => document.getElementById("backup")?.scrollIntoView({ block: "start" }), 50); }, []);

  return (
    <Frame>{({ L, ledger, fastForward, setFastForward }) => (
      <SettingsBody L={L} ledger={ledger} fastForward={fastForward} setFastForward={setFastForward} sheet={sheet} setSheet={setSheet} lang={lang} setLang={setLang} t={t} push={push} router={router} />
    )}</Frame>
  );
}

type P = {
  L: ReturnType<typeof import("@/hooks/useLedger").useLedger>; ledger: import("@/domain/types").Ledger; fastForward: boolean; setFastForward: (v: boolean) => void;
  sheet: "backup" | "verify" | "restore" | null; setSheet: (s: "backup" | "verify" | "restore" | null) => void; lang: Lang; setLang: (l: Lang) => void;
  t: ReturnType<typeof useT>["t"]; push: ReturnType<typeof useToast>["push"]; router: ReturnType<typeof useRouter>;
};
function SettingsBody({ L, ledger, fastForward, setFastForward, sheet, setSheet, lang, setLang, t, push, router }: P) {
  const p = ledger.profile;
  const [name, setName] = useState(p.name);
  const [employer, setEmployer] = useState(p.employerLabel);
  const [salary, setSalary] = useState(String(p.salaryCents / 100));
  const [payDay, setPayDay] = useState(String(p.payDay ?? p.payWindow.toDay));
  const [window, setWindow] = useState(String(p.confirmWindowDays));
  const date = (ms: number) => new Date(ms).toLocaleDateString(lang === "en" ? "en-SG" : lang, { day: "numeric", month: "short", year: "numeric" });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(salary) * 100);
    const pd = Math.min(28, Math.max(1, parseInt(payDay, 10) || 10));
    const wd = Math.min(30, Math.max(1, parseInt(window, 10) || 3));
    if (!name.trim() || !employer.trim() || !(cents > 0)) { push({ kind: "error", title: t("rc_err_fill") }); return; }
    L.updateProfile({ name: name.trim(), employerLabel: employer.trim(), salaryCents: cents, payDay: pd, payWindow: { fromDay: 1, toDay: pd }, confirmWindowDays: wd });
    logEvent("settings_saved");
    push({ kind: "success", title: t("se2_saved") });
  };

  return (
    <>
      <div className="page-head"><h1>{t("se2_title")}</h1></div>

      <form className="card stack" onSubmit={save} noValidate>
        <h2>{t("se2_profile")}</h2>
        <Field id="s-name" label={t("ob2_name")}><TextInput id="s-name" value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" /></Field>
        <Field id="s-emp" label={t("ob2_employer")} hint={t("se_employer_hint")}><TextInput id="s-emp" value={employer} onChange={e => setEmployer(e.target.value)} /></Field>
        <h2 style={{ marginTop: 8 }}>{t("se2_pay")}</h2>
        <Field id="s-sal" label={t("ob2_salary")} hint={t("se_salary_hint")}><MoneyInput id="s-sal" value={salary} onChange={e => setSalary(e.target.value)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field id="s-pd" label={t("se2_payday")} hint={t("se_day_of_month")}><TextInput id="s-pd" inputMode="numeric" value={payDay} onChange={e => setPayDay(e.target.value)} /></Field>
          <Field id="s-win" label={t("se2_window")} hint={t("se_days_to_answer")}><TextInput id="s-win" inputMode="numeric" value={window} onChange={e => setWindow(e.target.value)} /></Field>
        </div>
        <p className="small muted">{t("se2_window_hint")}</p>
        <div><Button type="submit" variant="primary" icon={<Icon name="check" />}>{t("se_save")}</Button></div>
      </form>

      <section className="card stack-sm">
        <h2>{t("se2_language")}</h2>
        <div className="lang-cards">{LANGS.map(l => <button key={l.code} type="button" aria-pressed={lang === l.code} onClick={() => setLang(l.code)}>{l.label}{lang === l.code && <Icon name="check" />}</button>)}</div>
      </section>

      <section className="card stack-sm" id="backup">
        <h2>{t("se2_backup")}</h2>
        {ledger.meta.backupVerifiedAt ? <p className="small muted">{t("se2_backup_ok", { date: date(ledger.meta.backupVerifiedAt) })}</p> : <Notice kind="warn">{t("se2_backup_missing")}</Notice>}
        <div className="btn-row">
          <Button onClick={() => setSheet("backup")} icon={<Icon name="lock" />}>{t("se2_show_words")}</Button>
          <Button onClick={() => setSheet("verify")} icon={<Icon name="check" />}>{t("se2_verify_words")}</Button>
          <Button onClick={() => setSheet("restore")} icon={<Icon name="refresh" />}>{t("se2_restore_other")}</Button>
        </div>
      </section>

      <section className="card stack-sm">
        <h2>{t("se2_data")}</h2>
        <p className="small muted">{t("se2_export_hint")}</p>
        <div className="btn-row">
          <Button onClick={L.exportJson} icon={<Icon name="share" />}>{t("se2_export")}</Button>
          <Button variant="danger" onClick={() => { if (confirm(t("se_clear_confirm"))) { L.reset(); router.replace("/"); } }} icon={<Icon name="x" />}>{t("se2_clear")}</Button>
        </div>
        <p className="small muted">{t("se2_clear_text")}</p>
      </section>

      {ledger.meta.demo && (
        <section className="card stack-sm">
          <h2>{t("se2_demo")}</h2>
          <label className="toggle"><span>{t("se2_ff")}<br /><span className="small muted">{t("se2_ff_hint")}</span></span><input type="checkbox" checked={fastForward} onChange={e => setFastForward(e.target.checked)} /></label>
        </section>
      )}

      <section className="card stack-sm">
        <h2>{t("se2_about")}</h2>
        <dl className="kv2">
          <dt>{t("se2_key")}</dt><dd className="mono">{shortAddr(L.address, 10)}</dd>
          <dt>{t("rd_network")}</dt><dd>{CHAIN_NAME} · {t("nv_env")}</dd>
        </dl>
        <p className="small muted"><Link href="/help">Help</Link> · <Link href="/privacy">Privacy</Link> · <a href="https://github.com/successaje/ledgerline" target="_blank" rel="noreferrer">Source</a></p>
      </section>

      <BackupSheet open={sheet === "backup" || sheet === "verify"} startAtVerify={sheet === "verify"} onClose={() => setSheet(null)} backup={L.backup} onVerified={() => L.markBackup("verified")} />
      <RestoreSheet open={sheet === "restore"} onClose={() => setSheet(null)} hasLocal={ledger.records.length > 0} onRestore={L.recover} />
    </>
  );
}
