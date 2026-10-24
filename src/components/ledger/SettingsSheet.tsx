"use client";
import { useEffect, useState } from "react";
import type { Profile } from "@/domain/types";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, MoneyInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { shortAddr } from "@/domain/format";
import { explorer } from "@/services/chain";
import { useT, LANGS, type Lang } from "@/i18n";

type Props = {
  open: boolean; onClose: () => void; profile: Profile; address: string;
  fastForward: boolean; onFastForward: (v: boolean) => void;
  onSave: (p: Partial<Profile>) => void; onBackup: () => void; onExport: () => void; onReset: () => void;
};

/** Everything the person can control. Every field changes real behaviour. */
export function SettingsSheet({ open, onClose, profile, address, fastForward, onFastForward, onSave, onBackup, onExport, onReset }: Props) {
  const { t, lang, setLang } = useT();
  const [name, setName] = useState(profile.name);
  const [employer, setEmployer] = useState(profile.employerLabel);
  const [salary, setSalary] = useState(String(profile.salaryCents / 100));
  const [from, setFrom] = useState(String(profile.payWindow.fromDay));
  const [to, setTo] = useState(String(profile.payWindow.toDay));
  const [win, setWin] = useState(String(profile.confirmWindowDays));
  useEffect(() => { if (open) { setName(profile.name); setEmployer(profile.employerLabel); setSalary(String(profile.salaryCents / 100)); setFrom(String(profile.payWindow.fromDay)); setTo(String(profile.payWindow.toDay)); setWin(String(profile.confirmWindowDays)); } }, [open, profile]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(salary) * 100);
    const f = Math.min(28, Math.max(1, parseInt(from, 10) || 1)), tt = Math.min(31, Math.max(f, parseInt(to, 10) || f));
    onSave({ name: name.trim() || profile.name, employerLabel: employer.trim() || profile.employerLabel, salaryCents: cents > 0 ? cents : profile.salaryCents, payWindow: { fromDay: f, toDay: tt }, confirmWindowDays: Math.min(30, Math.max(1, parseInt(win, 10) || 3)) });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("se_title")}>
      <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
        <Field id="s-lang" label={t("language")}>
          <select id="s-lang" className="input" value={lang} onChange={e => setLang(e.target.value as Lang)}>{LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
        </Field>
        <Field id="s-name" label={t("se_name")}><TextInput id="s-name" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field id="s-emp" label={t("se_employer")} hint={t("se_employer_hint")}><TextInput id="s-emp" value={employer} onChange={e => setEmployer(e.target.value)} /></Field>
        <Field id="s-sal" label={t("se_salary")} hint={t("se_salary_hint")}><MoneyInput id="s-sal" value={salary} onChange={e => setSalary(e.target.value)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field id="s-from" label={t("se_pay_from")} hint={t("se_day_of_month")}><TextInput id="s-from" type="number" min={1} max={28} value={from} onChange={e => setFrom(e.target.value)} /></Field>
          <Field id="s-to" label={t("se_pay_to")} hint={t("se_day_of_month")}><TextInput id="s-to" type="number" min={1} max={31} value={to} onChange={e => setTo(e.target.value)} /></Field>
          <Field id="s-win" label={t("se_emp_window")} hint={t("se_days_to_answer")}><TextInput id="s-win" type="number" min={1} max={30} value={win} onChange={e => setWin(e.target.value)} /></Field>
        </div>
        <p className="xs faint">{t("se_windows_help")}</p>
        <Button type="submit" variant="primary" icon={<Icon name="check" />}>{t("se_save")}</Button>
        <hr className="divider" />
        <div style={{ display: "grid", gap: 8 }}>
          <strong>{t("se_key_title")}</strong>
          <p className="small muted">{t("se_key_text", { key: shortAddr(address, 8) })} <a className="mono" href={explorer.address(address)} target="_blank" rel="noreferrer">{t("ll_on_chain")}</a></p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Button type="button" onClick={onBackup} icon={<Icon name="lock" />}>{t("se_backup")}</Button>
            <Button type="button" onClick={onExport} icon={<Icon name="share" />}>{t("se_export")}</Button>
          </div>
        </div>
        <hr className="divider" />
        <label className="small" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={fastForward} onChange={e => onFastForward(e.target.checked)} />
          <span>{t("se_demo")}</span>
        </label>
        <Button type="button" variant="danger" size="sm" onClick={onReset} icon={<Icon name="x" size={14} />}>{t("se_clear")}</Button>
      </form>
    </Sheet>
  );
}
