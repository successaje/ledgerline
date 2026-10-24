"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkerShell } from "@/components/worker/WorkerShell";
import { useLedgerCtx } from "@/components/worker/LedgerContext";
import { BackupPanel, RestorePanel } from "@/components/worker/Backup";
import { Button } from "@/components/ui/Button";
import { Field, MoneyInput, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { CHAIN_NAME } from "@/services/chain";
import { logEvent } from "@/services/analytics";
import { LANGS, useT } from "@/i18n";

type Step = "lang" | "own" | "create" | "backup" | "restore";

function Start() {
  const { t, lang, setLang } = useT();
  const { L, cfgError } = useLedgerCtx();
  const router = useRouter();
  const sp = useSearchParams();
  const [step, setStep] = useState<Step>(sp.get("mode") === "restore" ? "restore" : "lang");
  const [name, setName] = useState("");
  const [employer, setEmployer] = useState("");
  const [salary, setSalary] = useState("");
  const [payDay, setPayDay] = useState("10");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Someone with records who lands here goes Home, unless they are finishing backup or restoring.
  useEffect(() => { if (L.ledger && step !== "backup" && step !== "restore") router.replace("/app"); }, [L.ledger, step, router]);

  if (L.ledger === undefined) return <WorkerShell hideNav><div className="stack"><Skeleton h={28} w={200} /><Skeleton h={200} /></div></WorkerShell>;

  const order: Step[] = ["lang", "own", "create", "backup"];
  const n = order.indexOf(step) + 1;
  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("ob_name_err");
    if (!employer.trim()) errs.employer = t("ob_employer_err");
    const cents = Math.round(parseFloat(salary) * 100);
    if (!Number.isFinite(cents) || cents <= 0) errs.salary = t("ob_salary_err");
    const pd = parseInt(payDay, 10);
    if (!(pd >= 1 && pd <= 28)) errs.payDay = t("ob_months_err");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    logEvent("onboarding_started");
    L.start({ name, employerLabel: employer, salaryCents: cents, payDay: pd });
    setStep("backup");
    window.scrollTo({ top: 0 });
  };

  return (
    <WorkerShell hideNav>
      <div className="stack" style={{ maxWidth: "var(--w-form)" }}>
        {cfgError && <Notice kind="error" title={t("ap_no_server_title")}>{cfgError}</Notice>}
        {step !== "restore" && <div className="steps"><span className="step-n">{t("ob2_step", { n, total: 4 })}</span></div>}

        {step === "lang" && (
          <section className="card stack">
            <div><h1>{t("ob2_lang_title")}</h1><p className="muted" style={{ marginTop: 4 }}>{t("ob2_lang_text")}</p></div>
            <div className="lang-cards">{LANGS.map(l => <button key={l.code} type="button" aria-pressed={lang === l.code} onClick={() => setLang(l.code)} lang={l.code === "tl" ? "fil" : l.code}>{l.label}{lang === l.code && <Icon name="check" />}</button>)}</div>
            <div><Button variant="primary" size="lg" onClick={() => setStep("own")} icon={<Icon name="arrow" />}>{t("ob2_own_cta")}</Button></div>
          </section>
        )}

        {step === "own" && (
          <section className="card stack">
            <h1>{t("ob2_own_title")}</h1>
            <ul className="bullets">
              <li><Icon name="lock" /><span>{t("ob2_own_1")}</span></li>
              <li><Icon name="shield" /><span>{t("ob2_own_2", { chain: CHAIN_NAME })}</span></li>
              <li><Icon name="pencil" /><span>{t("ob2_own_3")}</span></li>
            </ul>
            <Notice kind="info">{t("ld_foot_test")}</Notice>
            <div className="btn-row">
              <Button variant="primary" size="lg" onClick={() => setStep("create")} icon={<Icon name="arrow" />}>{t("ob2_own_cta")}</Button>
              <Button size="lg" variant="ghost" onClick={() => setStep("restore")} icon={<Icon name="refresh" />}>{t("ob2_have")}</Button>
            </div>
          </section>
        )}

        {step === "create" && (
          <form className="card stack" onSubmit={create} noValidate>
            <h1>{t("ob2_create_title")}</h1>
            {Object.keys(errors).length > 0 && <div className="error-summary" role="alert"><ul style={{ margin: 0 }}>{Object.entries(errors).map(([k, v]) => <li key={k}><a href={`#ob-${k}`}>{v}</a></li>)}</ul></div>}
            <Field id="ob-name" label={t("ob2_name")} hint={t("ob2_name_hint")} error={errors.name}><TextInput id="ob-name" value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" aria-invalid={!!errors.name} /></Field>
            <Field id="ob-employer" label={t("ob2_employer")} hint={t("ob2_employer_hint")} error={errors.employer}><TextInput id="ob-employer" value={employer} onChange={e => setEmployer(e.target.value)} placeholder="Mdm Tan (+65 9xxx 1234)" aria-invalid={!!errors.employer} /></Field>
            <Field id="ob-salary" label={t("ob2_salary")} hint={t("ob2_salary_hint")} error={errors.salary}><MoneyInput id="ob-salary" value={salary} onChange={e => setSalary(e.target.value)} placeholder="700" aria-invalid={!!errors.salary} /></Field>
            <Field id="ob-payDay" label={t("ob2_payday")} hint={t("ob2_payday_hint")} error={errors.payDay}><TextInput id="ob-payDay" inputMode="numeric" value={payDay} onChange={e => setPayDay(e.target.value)} aria-invalid={!!errors.payDay} style={{ maxWidth: 120 }} /></Field>
            <div className="btn-row"><Button type="button" onClick={() => setStep("own")} icon={<Icon name="back" />}>{t("rf_back")}</Button><Button type="submit" variant="primary" size="lg" icon={<Icon name="arrow" />}>{t("ob2_create_cta")}</Button></div>
          </form>
        )}

        {step === "backup" && (
          <section className="card stack">
            <h1>{t("ob2_backup_title")}</h1>
            <BackupPanel backup={L.backup} onVerified={() => { L.markBackup("verified"); setTimeout(() => router.replace("/app"), 600); }} onSkip={() => { L.markBackup("skipped"); router.replace("/app"); }} />
          </section>
        )}

        {step === "restore" && (
          <section className="card stack">
            <h1>{t("ob2_restore_title")}</h1>
            <RestorePanel hasLocal={Boolean(L.ledger && L.ledger.records.length > 0)} onRestore={L.recover} onDone={() => router.replace("/app")} />
            <div><Button variant="ghost" onClick={() => setStep("own")} icon={<Icon name="back" />}>{t("rf_back")}</Button></div>
          </section>
        )}
      </div>
    </WorkerShell>
  );
}

export default function StartPage() {
  return <Suspense fallback={null}><Start /></Suspense>;
}
