"use client";
import { useEffect, useState } from "react";
import type { Profile } from "@/domain/types";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, MoneyInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { shortAddr } from "@/domain/format";
import { explorer } from "@/services/chain";

type Props = {
  open: boolean; onClose: () => void; profile: Profile; address: string;
  fastForward: boolean; onFastForward: (v: boolean) => void;
  onSave: (p: Partial<Profile>) => void; onBackup: () => void; onExport: () => void; onReset: () => void;
};

/** Everything the person can control. Every field changes real behaviour. */
export function SettingsSheet({ open, onClose, profile, address, fastForward, onFastForward, onSave, onBackup, onExport, onReset }: Props) {
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
    const f = Math.min(28, Math.max(1, parseInt(from, 10) || 1)), t = Math.min(31, Math.max(f, parseInt(to, 10) || f));
    onSave({ name: name.trim() || profile.name, employerLabel: employer.trim() || profile.employerLabel, salaryCents: cents > 0 ? cents : profile.salaryCents, payWindow: { fromDay: f, toDay: t }, confirmWindowDays: Math.min(30, Math.max(1, parseInt(win, 10) || 3)) });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
        <Field id="s-name" label="Your name"><TextInput id="s-name" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field id="s-emp" label="Employer" hint="Changing this starts a new employer id for future months; past months keep theirs."><TextInput id="s-emp" value={employer} onChange={e => setEmployer(e.target.value)} /></Field>
        <Field id="s-sal" label="Monthly salary" hint="Used for new months. Existing months keep their amount."><MoneyInput id="s-sal" value={salary} onChange={e => setSalary(e.target.value)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field id="s-from" label="Pay window from" hint="day of month"><TextInput id="s-from" type="number" min={1} max={28} value={from} onChange={e => setFrom(e.target.value)} /></Field>
          <Field id="s-to" label="to" hint="day of month"><TextInput id="s-to" type="number" min={1} max={31} value={to} onChange={e => setTo(e.target.value)} /></Field>
          <Field id="s-win" label="Employer window" hint="days to answer"><TextInput id="s-win" type="number" min={1} max={30} value={win} onChange={e => setWin(e.target.value)} /></Field>
        </div>
        <p className="xs faint">The pay window is the dates a bank proof checks; the employer window is how long silence waits before it counts as evidence.</p>
        <Button type="submit" variant="primary" icon={<Icon name="check" />}>Save settings</Button>
        <hr className="divider" />
        <div style={{ display: "grid", gap: 8 }}>
          <strong>Your key</strong>
          <p className="small muted">Signing key on this device: <a className="mono" href={explorer.address(address)} target="_blank" rel="noreferrer">{shortAddr(address, 8)}</a>. Every month you record is signed by it. Names and notes never leave this phone.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Button type="button" onClick={onBackup} icon={<Icon name="lock" />}>Back up my key</Button>
            <Button type="button" onClick={onExport} icon={<Icon name="share" />}>Export my data</Button>
          </div>
        </div>
        <hr className="divider" />
        <label className="small" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={fastForward} onChange={e => onFastForward(e.target.checked)} />
          <span>Demo: treat the employer window as elapsed</span>
        </label>
        <Button type="button" variant="danger" size="sm" onClick={onReset} icon={<Icon name="x" size={14} />}>Clear this record from this device</Button>
      </form>
    </Sheet>
  );
}
