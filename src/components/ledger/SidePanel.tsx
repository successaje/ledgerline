"use client";
import type { Ledger } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type Props = {
  ledger: Ledger; address: string;
  stats: { months: number; recorded: number; confirmed: number; unpaid: number; pending: number };
  syncing: boolean; busy: boolean;
  onRecordAll: () => void; onSync: () => void; onAskEmployer: () => void; onBundle: () => void; onAddMonth: () => void; onSettings: () => void;
  children?: React.ReactNode;
};

export function SidePanel({ ledger, address, stats, syncing, busy, onRecordAll, onSync, onAskEmployer, onBundle, onAddMonth, onSettings, children }: Props) {
  void ledger; void address;
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Button block disabled={busy} onClick={onAddMonth} icon={<Icon name="arrow" />}>Add a month</Button>
          <Button block variant="ghost" onClick={onSettings} icon={<Icon name="info" />}>Settings</Button>
        </div>
      </div>
      {children}
    </aside>
  );
}
