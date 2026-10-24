"use client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n";

type Props = {
  stats: { months: number; recorded: number; confirmed: number; unpaid: number; pending: number };
  syncing: boolean; busy: boolean;
  onRecordAll: () => void; onSync: () => void; onAskEmployer: () => void; onBundle: () => void; onAddMonth: () => void; onSettings: () => void;
  children?: React.ReactNode;
};

export function SidePanel({ stats, syncing, busy, onRecordAll, onSync, onAskEmployer, onBundle, onAddMonth, onSettings, children }: Props) {
  const { t, tn } = useT();
  return (
    <aside className="app-side" style={{ display: "grid", gap: 16 }}>
      <div className="stats">
        <div className="stat"><div className="v num">{stats.recorded}<span className="faint" style={{ fontSize: 14 }}>/{stats.months}</span></div><div className="k">{t("sp_recorded")}</div></div>
        <div className="stat"><div className="v num">{stats.confirmed}</div><div className="k">{t("sp_confirmed")}</div></div>
        <div className="stat"><div className="v num" style={{ color: stats.unpaid ? "var(--red)" : undefined }}>{stats.unpaid}</div><div className="k">{t("sp_unpaid")}</div></div>
        <div className="stat"><div className="v num">{stats.pending}</div><div className="k">{t("sp_drafts")}</div></div>
      </div>
      <div className="panel panel-pad" style={{ display: "grid", gap: 8 }}>
        {stats.pending > 0 && <Button variant="primary" block disabled={busy} onClick={onRecordAll} icon={<Icon name="lock" />}>{tn("sp_record_drafts", stats.pending)}</Button>}
        <Button block disabled={busy || stats.recorded === 0} onClick={onAskEmployer} icon={<Icon name="whatsapp" />}>{t("sp_ask")}</Button>
        <Button block disabled={busy || stats.recorded === 0} loading={syncing} onClick={onSync} icon={<Icon name="refresh" />}>{t("sp_check")}</Button>
        <Button variant="accent" block disabled={busy || stats.recorded === 0} onClick={onBundle} icon={<Icon name="shield" />}>{t("sp_bundle")}</Button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Button block disabled={busy} onClick={onAddMonth} icon={<Icon name="arrow" />}>{t("sp_add_month")}</Button>
          <Button block variant="ghost" onClick={onSettings} icon={<Icon name="info" />}>{t("sp_settings")}</Button>
        </div>
      </div>
      {children}
    </aside>
  );
}
