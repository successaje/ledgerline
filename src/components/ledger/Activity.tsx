"use client";
import { useState } from "react";
import type { ActivityEvent } from "@/domain/activity";
import { explorer } from "@/services/chain";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";

const ICON: Record<ActivityEvent["kind"], { name: "lock" | "check" | "x" | "bank" | "alert"; cls: string }> = {
  recorded: { name: "lock", cls: "ok" }, unpaid: { name: "alert", cls: "bad" }, confirmed: { name: "check", cls: "ok" }, disputed: { name: "x", cls: "bad" }, proof: { name: "bank", cls: "ok" },
};

function when(ms: number) {
  const d = (Date.now() - ms) / 86400000;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 30) return `${Math.floor(d)} days ago`;
  return new Date(ms).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

function List({ events, onOpen }: { events: ActivityEvent[]; onOpen: (p: number) => void }) {
  if (!events.length) return <div className="empty" style={{ padding: "20px 8px" }}><h3>No activity yet</h3><p>Everything you record, every employer answer and every proof will be listed here.</p></div>;
  return (
    <ul className="activity">
      {events.map((e, i) => (
        <li key={i} className="activity-item">
          <span className={`activity-icon ${ICON[e.kind].cls}`}><Icon name={ICON[e.kind].name} size={12} /></span>
          <div>
            <button className="linklike" onClick={() => onOpen(e.period)}>{e.text}</button>
            <div className="xs faint">{when(e.at)}{e.uid && <> · <a href={explorer.attestation(e.uid)} target="_blank" rel="noreferrer">on chain</a></>}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Human-readable history. A short list in the side panel; the full list in a sheet. */
export function ActivityPanel({ events, onOpen }: { events: ActivityEvent[]; onOpen: (p: number) => void }) {
  const [all, setAll] = useState(false);
  return (
    <div className="panel panel-pad">
      <div className="row" style={{ marginBottom: 6 }}>
        <strong>Activity</strong>
        {events.length > 5 && <button className="btn btn-ghost btn-sm" onClick={() => setAll(true)}>View all ({events.length})</button>}
      </div>
      <List events={events.slice(0, 5)} onOpen={onOpen} />
      <Sheet open={all} onClose={() => setAll(false)} title="All activity"><List events={events} onOpen={p => { setAll(false); onOpen(p); }} /></Sheet>
    </div>
  );
}
