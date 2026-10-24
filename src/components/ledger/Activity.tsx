"use client";
import { useState } from "react";
import type { ActivityEvent } from "@/domain/activity";
import { sgd } from "@/domain/format";
import { explorer } from "@/services/chain";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useT } from "@/i18n";

type I18n = ReturnType<typeof useT>;

/** Localised sentence for an activity event. */
export function activityText(e: ActivityEvent, { t, monthLabel }: I18n) {
  const month = monthLabel(e.period), amount = sgd(e.amountCents);
  switch (e.kind) {
    case "recorded": return t(e.status === 3 ? "ac_recorded_partial" : "ac_recorded_paid", { month, amount });
    case "unpaid": return t("ac_recorded_unpaid", { month, amount });
    case "confirmed": return t("ac_confirmed", { month });
    case "disputed": return t("ac_disputed", { month });
    case "proof": return t(e.satisfied ? "ac_proof_ok" : "ac_proof_found", { month });
  }
}

const ICON: Record<ActivityEvent["kind"], { name: "lock" | "check" | "x" | "bank" | "alert"; cls: string }> = {
  recorded: { name: "lock", cls: "ok" }, unpaid: { name: "alert", cls: "bad" }, confirmed: { name: "check", cls: "ok" }, disputed: { name: "x", cls: "bad" }, proof: { name: "bank", cls: "ok" },
};

function List({ events, onOpen }: { events: ActivityEvent[]; onOpen: (p: number) => void }) {
  const i18n = useT();
  const { t, lang } = i18n;
  const when = (ms: number) => {
    const d = (Date.now() - ms) / 86400000;
    if (d < 1) return t("ac_today");
    if (d < 2) return t("ac_yesterday");
    if (d < 30) return t("ac_days_ago", { n: Math.floor(d) });
    return new Date(ms).toLocaleDateString(lang === "en" ? "en-SG" : lang, { day: "numeric", month: "short", year: "numeric" });
  };
  if (!events.length) return <div className="empty" style={{ padding: "20px 8px" }}><h3>{t("ac_empty_title")}</h3><p>{t("ac_empty_text")}</p></div>;
  return (
    <ul className="activity">
      {events.map((e, i) => (
        <li key={i} className="activity-item">
          <span className={`activity-icon ${ICON[e.kind].cls}`}><Icon name={ICON[e.kind].name} size={12} /></span>
          <div>
            <button className="linklike" onClick={() => onOpen(e.period)}>{activityText(e, i18n)}</button>
            <div className="xs faint">{when(e.at)}{e.uid && <> · <a href={explorer.attestation(e.uid)} target="_blank" rel="noreferrer">{t("ac_on_chain")}</a></>}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ActivityPanel({ events, onOpen }: { events: ActivityEvent[]; onOpen: (p: number) => void }) {
  const { t } = useT();
  const [all, setAll] = useState(false);
  return (
    <div className="panel panel-pad">
      <div className="row" style={{ marginBottom: 6 }}>
        <strong>{t("ac_title")}</strong>
        {events.length > 5 && <button className="btn btn-ghost btn-sm" onClick={() => setAll(true)}>{t("ac_view_all", { n: events.length })}</button>}
      </div>
      <List events={events.slice(0, 5)} onOpen={onOpen} />
      <Sheet open={all} onClose={() => setAll(false)} title={t("ac_all")}><List events={events} onOpen={p => { setAll(false); onOpen(p); }} /></Sheet>
    </div>
  );
}
