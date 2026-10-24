"use client";
import type { Due } from "@/domain/due";
import type { ActivityEvent } from "@/domain/activity";
import { periodLabel } from "@/domain/format";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type Props = {
  name: string; due: Due[]; news: ActivityEvent[]; busy: boolean;
  onRecordDue: (period: number, status: 1 | 2) => void; onRecordDrafts: () => void; onAskEmployer: () => void; onOpenMonth: (p: number) => void; onDismissNews: () => void;
};

/** What matters right now: what changed since the last visit and what needs doing. Hidden when there is nothing. */
export function Today({ name, due, news, busy, onRecordDue, onRecordDrafts, onAskEmployer, onOpenMonth, onDismissNews }: Props) {
  if (!due.length && !news.length) return null;
  return (
    <section className="today" aria-label="Today">
      {news.length > 0 && (
        <div className="today-news">
          <div className="row" style={{ alignItems: "start" }}>
            <div>
              <div className="today-title">Since you were last here</div>
              <ul className="today-list">
                {news.slice(0, 4).map((e, i) => (
                  <li key={i}><button className="linklike" onClick={() => onOpenMonth(e.period)}>{e.text}</button></li>
                ))}
                {news.length > 4 && <li className="faint">and {news.length - 4} more</li>}
              </ul>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onDismissNews} aria-label="Dismiss"><Icon name="x" size={14} /></button>
          </div>
        </div>
      )}
      {due.map((d, i) => {
        if (d.kind === "first-month") return (
          <div key={i} className="today-item">
            <div><div className="today-title">Hi {name}. Record your first month.</div><div className="small muted">Sign a month and it is yours: no employer or agency can change it afterwards.</div></div>
          </div>
        );
        if (d.kind === "record-month") return (
          <div key={i} className="today-item">
            <div><div className="today-title">{periodLabel(d.period, true)}: were you paid?</div><div className="small muted">The pay window has passed. Record it while it is fresh.</div></div>
            <div className="today-actions">
              <Button variant="primary" size="sm" disabled={busy} onClick={() => onRecordDue(d.period, 1)} icon={<Icon name="check" size={14} />}>Paid</Button>
              <Button variant="danger" size="sm" disabled={busy} onClick={() => onRecordDue(d.period, 2)} icon={<Icon name="x" size={14} />}>Not paid</Button>
            </div>
          </div>
        );
        if (d.kind === "draft") return (
          <div key={i} className="today-item">
            <div><div className="today-title">{d.count} month{d.count === 1 ? "" : "s"} saved but not signed</div><div className="small muted">A draft is only on this phone. Signing writes it to the chain.</div></div>
            <div className="today-actions"><Button variant="primary" size="sm" disabled={busy} onClick={onRecordDrafts} icon={<Icon name="lock" size={14} />}>Sign {d.count === 1 ? "it" : "all"}</Button></div>
          </div>
        );
        if (d.kind === "silent") return (
          <div key={i} className="today-item">
            <div><div className="today-title" style={{ color: "var(--red)" }}>{d.count} month{d.count === 1 ? "" : "s"} the employer did not confirm</div><div className="small muted">Silence after the window is recorded as evidence. You can still send a reminder.</div></div>
            <div className="today-actions"><Button size="sm" disabled={busy} onClick={onAskEmployer} icon={<Icon name="whatsapp" size={14} />}>Remind</Button></div>
          </div>
        );
        return (
          <div key={i} className="today-item">
            <div><div className="today-title">{d.count} month{d.count === 1 ? "" : "s"} waiting for the employer</div><div className="small muted">Asked {d.oldestDays === 0 ? "today" : `${d.oldestDays} day${d.oldestDays === 1 ? "" : "s"} ago`}. Answers appear here automatically.</div></div>
            <div className="today-actions"><Button size="sm" variant="ghost" disabled={busy} onClick={onAskEmployer} icon={<Icon name="whatsapp" size={14} />}>Resend link</Button></div>
          </div>
        );
      })}
    </section>
  );
}
