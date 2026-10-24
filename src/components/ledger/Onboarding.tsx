"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, MoneyInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { currentPeriod, prevPeriod } from "@/domain/format";

type Props = { onStart: (i: { name: string; employerLabel: string; salaryCents: number; startPeriod: number; endPeriod: number }) => void; onSample: () => void; onRestore: () => void };

/** First visit. A key already exists on the device; this only collects what the ledger needs. */
export function Onboarding({ onStart, onSample, onRestore }: Props) {
  const [name, setName] = useState("");
  const [employer, setEmployer] = useState("");
  const [salary, setSalary] = useState("");
  const [months, setMonths] = useState("6");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Your first name is enough.";
    if (!employer.trim()) errs.employer = "A name or phone number you will recognise.";
    const cents = Math.round(parseFloat(salary) * 100);
    if (!Number.isFinite(cents) || cents <= 0) errs.salary = "Enter the monthly amount in dollars.";
    const n = parseInt(months, 10);
    if (!(n >= 1 && n <= 24)) errs.months = "Between 1 and 24 months.";
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
        <h1>Start your pay record</h1>
        <p className="muted" style={{ marginTop: 8, maxWidth: "52ch" }}>
          Each month you mark whether you were paid. The record is signed by a key that lives only on this phone, so no employer, agency or app can rewrite it.
        </p>
        <form onSubmit={submit} className="panel panel-pad" style={{ marginTop: 20, display: "grid", gap: 16 }} noValidate>
          <Field id="name" label="Your name" error={errors.name}>
            <TextInput id="name" value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" placeholder="Maria" aria-invalid={!!errors.name} />
          </Field>
          <Field id="employer" label="Employer" hint="Only a hash of this goes on chain." error={errors.employer}>
            <TextInput id="employer" value={employer} onChange={e => setEmployer(e.target.value)} placeholder="Mdm Tan (+65 9xxx 1234)" aria-invalid={!!errors.employer} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field id="salary" label="Monthly salary" error={errors.salary}>
              <MoneyInput id="salary" value={salary} onChange={e => setSalary(e.target.value)} placeholder="600" aria-invalid={!!errors.salary} />
            </Field>
            <Field id="months" label="Months to start with" hint="Past months you want to record." error={errors.months}>
              <TextInput id="months" type="number" min={1} max={24} value={months} onChange={e => setMonths(e.target.value)} aria-invalid={!!errors.months} />
            </Field>
          </div>
          <Button type="submit" variant="primary" size="lg" icon={<Icon name="arrow" />}>Create my record</Button>
        </form>
      </div>
      <aside className="app-side">
        <div className="panel panel-pad" style={{ display: "grid", gap: 12 }}>
          <h3>Just looking?</h3>
          <p className="small muted">Load a sample record: Maria, nine months at S$600, July unpaid. Everything you do with it is real: signatures, chain records, proofs.</p>
          <Button onClick={onSample} icon={<Icon name="bank" />}>Load sample record</Button>
          <hr className="divider" />
          <h3>Already have a record?</h3>
          <p className="small muted">Restore it on this phone with your recovery words. Months, employer answers and proofs are read back from the chain.</p>
          <Button onClick={onRestore} icon={<Icon name="refresh" />}>Restore from recovery words</Button>
          <hr className="divider" />
          <ul className="small muted" style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 6 }}>
            <li>No wallet, gas or seed phrase. The app holds your key.</li>
            <li>Names and notes stay on this phone. Only hashes and amounts go on chain.</li>
            <li>Test network only. No money moves.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
