"use client";
import type { Ledger } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { shortAddr } from "@/domain/format";
import { explorer } from "@/services/chain";

type Props = {
  ledger: Ledger; address: string;
  stats: { months: number; recorded: number; confirmed: number; unpaid: number; pending: number };
  syncing: boolean; busy: boolean;
  fastForward: boolean; onFastForward: (v: boolean) => void;
  onRecordAll: () => void; onSync: () => void; onAskEmployer: () => void; onBundle: () => void; onReset: () => void;
};

export function SidePanel({ ledger, address, stats, syncing, busy, fastForward, onFastForward, onRecordAll, onSync, onAskEmployer, onBundle, onReset }: Props) {
  return (
    <aside className="app-side" style={{ display: "grid", gap: 16 }}>
      <div className="stats">
        <div className="stat"><div className="v num">{stats.recorded}<span className="faint" style={{ fontSize: 14 }}>/{stats.months}</span></div><div className="k">Recorded</div></div>
        <div className="stat"><div className="v num">{stats.confirmed}</div><div className="k">Confirmed</div></div>
        <div className="stat"><div className="v num" style={{ color: stats.unpaid ? "var(--red)" : undefined }}>{stats.unpaid}</div><div className="k">Unpaid</div></div>
        <div className="stat"><div className="v num">{stats.pending}</div><div className="k">Drafts</div></div>
      </div>
      <div className="panel panel-pad" style={{ display: "grid", gap: 8 }}>
        {stats.pending > 0 && <Button variant="primary" block disabled={busy} onClick={onRecordAll} icon={<Icon name="lock" />}>Record {stats.pending} draft month{stats.pending === 1 ? "" : "s"}</Button>}
        <Button block disabled={busy || stats.recorded === 0} onClick={onAskEmployer} icon={<Icon name="whatsapp" />}>Ask employer to confirm</Button>
        <Button block disabled={busy || stats.recorded === 0} loading={syncing} onClick={onSync} icon={<Icon name="refresh" />}>Check for confirmations</Button>
        <Button variant="accent" block disabled={busy || stats.recorded === 0} onClick={onBundle} icon={<Icon name="shield" />}>Build dispute bundle</Button>
      </div>
      <details className="panel panel-pad small">
        <summary style={{ cursor: "pointer", fontWeight: 560 }}>About this record</summary>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }} className="muted">
          <div>Your signing key <a className="mono" href={explorer.address(address)} target="_blank" rel="noreferrer">{shortAddr(address)}</a> lives on this device. Every month you record is signed by it.</div>
          <div>Names and notes never leave this phone. On chain: a hash of your key, a hash of the employer label, the month, the amount, paid or not.</div>
          {ledger.profile.sample && <div>This is the sample record. Records you make with it are real test-network attestations.</div>}
          <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={fastForward} onChange={e => onFastForward(e.target.checked)} />
            <span>Demo: treat the employer window as elapsed</span>
          </label>
          <Button variant="danger" size="sm" onClick={onReset} icon={<Icon name="x" size={14} />}>Clear this record from this device</Button>
        </div>
      </details>
    </aside>
  );
}
