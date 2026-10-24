"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, MoneyInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { currentPeriod, prevPeriod } from "@/domain/format";
import { useT } from "@/i18n";

type Props = { onStart: (i: { name: string; employerLabel: string; salaryCents: number; startPeriod: number; endPeriod: number }) => void; onSample: () => void; onRestore: () => void };

/** First visit. A key already exists on the device; this only collects what the ledger needs. */
export function Onboarding({ onStart, onSample, onRestore }: Props) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [employer, setEmployer] = useState("");
  const [salary, setSalary] = useState("");
  const [months, setMonths] = useState("6");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("ob_name_err");
    if (!employer.trim()) errs.employer = t("ob_employer_err");
    const cents = Math.round(parseFloat(salary) * 100);
    if (!Number.isFinite(cents) || cents <= 0) errs.salary = t("ob_salary_err");
    const n = parseInt(months, 10);
    if (!(n >= 1 && n <= 24)) errs.months = t("ob_months_err");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const end = prevPeriod(currentPeriod());
    let start = end;
    for (let i = 1; i < n; i++) start = prevPeriod(start);
    onStart({ name, employerLabel: employer, salaryCents: cents, startPeriod: start, endPeriod: end });
  }

  return (
    <div className="app-grid">
      <div>
        <h1>{t("ob_title")}</h1>
        <p className="muted" style={{ marginTop: 8, maxWidth: "52ch" }}>{t("ob_intro")}</p>
        <form onSubmit={submit} className="panel panel-pad" style={{ marginTop: 20, display: "grid", gap: 16 }} noValidate>
          <Field id="name" label={t("ob_name")} error={errors.name}>
            <TextInput id="name" value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" placeholder="Maria" aria-invalid={!!errors.name} />
          </Field>
          <Field id="employer" label={t("ob_employer")} hint={t("ob_employer_hint")} error={errors.employer}>
            <TextInput id="employer" value={employer} onChange={e => setEmployer(e.target.value)} placeholder="Mdm Tan (+65 9xxx 1234)" aria-invalid={!!errors.employer} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field id="salary" label={t("ob_salary")} error={errors.salary}>
              <MoneyInput id="salary" value={salary} onChange={e => setSalary(e.target.value)} placeholder="600" aria-invalid={!!errors.salary} />
            </Field>
            <Field id="months" label={t("ob_months")} hint={t("ob_months_hint")} error={errors.months}>
              <TextInput id="months" type="number" min={1} max={24} value={months} onChange={e => setMonths(e.target.value)} aria-invalid={!!errors.months} />
            </Field>
          </div>
          <Button type="submit" variant="primary" size="lg" icon={<Icon name="arrow" />}>{t("ob_create")}</Button>
        </form>
      </div>
      <aside className="app-side">
        <div className="panel panel-pad" style={{ display: "grid", gap: 12 }}>
          <h3>{t("ob_sample_title")}</h3>
          <p className="small muted">{t("ob_sample_text")}</p>
          <Button onClick={onSample} icon={<Icon name="bank" />}>{t("ob_sample_btn")}</Button>
          <hr className="divider" />
          <h3>{t("ob_restore_title")}</h3>
          <p className="small muted">{t("ob_restore_text")}</p>
          <Button onClick={onRestore} icon={<Icon name="refresh" />}>{t("ob_restore_btn")}</Button>
          <hr className="divider" />
          <ul className="small muted" style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 6 }}>
            <li>{t("ob_bullet_1")}</li><li>{t("ob_bullet_2")}</li><li>{t("ob_bullet_3")}</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
