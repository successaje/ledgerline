"use client";
import type { Due } from "@/domain/due";
import type { ActivityEvent } from "@/domain/activity";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n";
import { activityText } from "./Activity";

type Props = {
  name: string; due: Due[]; news: ActivityEvent[]; busy: boolean;
  onRecordDue: (period: number, status: 1 | 2) => void; onRecordDrafts: () => void; onAskEmployer: () => void; onOpenMonth: (p: number) => void; onDismissNews: () => void;
};

/** What matters right now: what changed since the last visit and what needs doing. Hidden when there is nothing. */
export function Today({ name, due, news, busy, onRecordDue, onRecordDrafts, onAskEmployer, onOpenMonth, onDismissNews }: Props) {
  const i18n = useT();
  const { t, tn, monthLabel } = i18n;
  if (!due.length && !news.length) return null;
  return (
    <section className="today" aria-label="Today">
      {news.length > 0 && (
        <div className="today-news">
          <div className="row" style={{ alignItems: "start" }}>
            <div>
              <div className="today-title">{t("td_since")}</div>
              <ul className="today-list">
                {news.slice(0, 4).map((e, i) => <li key={i}><button className="linklike" onClick={() => onOpenMonth(e.period)}>{activityText(e, i18n)}</button></li>)}
                {news.length > 4 && <li className="faint">{t("td_and_more", { n: news.length - 4 })}</li>}
              </ul>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onDismissNews} aria-label={t("ap_dismiss")}><Icon name="x" size={14} /></button>
          </div>
        </div>
      )}
      {due.map((d, i) => {
        if (d.kind === "first-month") return (
          <div key={i} className="today-item"><div><div className="today-title">{t("td_first_title", { name })}</div><div className="small muted">{t("td_first_text")}</div></div></div>
        );
        if (d.kind === "record-month") return (
          <div key={i} className="today-item">
            <div><div className="today-title">{t("td_due_title", { month: monthLabel(d.period, true) })}</div><div className="small muted">{t("td_due_text")}</div></div>
            <div className="today-actions">
              <Button variant="primary" size="sm" disabled={busy} onClick={() => onRecordDue(d.period, 1)} icon={<Icon name="check" size={14} />}>{t("td_paid")}</Button>
              <Button variant="danger" size="sm" disabled={busy} onClick={() => onRecordDue(d.period, 2)} icon={<Icon name="x" size={14} />}>{t("td_not_paid")}</Button>
            </div>
          </div>
        );
        if (d.kind === "draft") return (
          <div key={i} className="today-item">
            <div><div className="today-title">{tn("td_draft_title", d.count)}</div><div className="small muted">{t("td_draft_text")}</div></div>
            <div className="today-actions"><Button variant="primary" size="sm" disabled={busy} onClick={onRecordDrafts} icon={<Icon name="lock" size={14} />}>{tn("td_sign", d.count)}</Button></div>
          </div>
        );
        if (d.kind === "silent") return (
          <div key={i} className="today-item">
            <div><div className="today-title" style={{ color: "var(--red)" }}>{tn("td_silent_title", d.count)}</div><div className="small muted">{t("td_silent_text")}</div></div>
            <div className="today-actions"><Button size="sm" disabled={busy} onClick={onAskEmployer} icon={<Icon name="whatsapp" size={14} />}>{t("td_remind")}</Button></div>
          </div>
        );
        return (
          <div key={i} className="today-item">
            <div><div className="today-title">{tn("td_waiting_title", d.count)}</div><div className="small muted">{d.oldestDays === 0 ? t("td_waiting_text_today") : tn("td_waiting_text_days", d.oldestDays)}</div></div>
            <div className="today-actions"><Button size="sm" variant="ghost" disabled={busy} onClick={onAskEmployer} icon={<Icon name="whatsapp" size={14} />}>{t("td_resend")}</Button></div>
          </div>
        );
      })}
    </section>
  );
}
