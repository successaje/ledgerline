import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/ui/Icon";

/** A static rendering of the product's key screen, so the landing page shows instead of explains. */
export function DemoLedger() {
  const rows = [
    { m: "Sep 2026", s: "ok", note: "employer confirmed" },
    { m: "Aug 2026", s: "ok", note: "employer confirmed" },
    { m: "Jul 2026", s: "bad", note: "employer did not confirm · bank proof" },
    { m: "Jun 2026", s: "ok", note: "employer confirmed" },
  ];
  return (
    <div className="demo-frame" aria-hidden>
      <div className="ledger-head"><div><div style={{ fontWeight: 600 }}>Maria's pay record</div><div className="small muted">Mdm Tan · S$600 a month</div></div><Pill tone="outline">9 months</Pill></div>
      {rows.map(r => (
        <div key={r.m} className="row" style={{ cursor: "default", background: r.s === "bad" ? "var(--paper-3)" : undefined }}>
          <div>
            <div className="row-title">{r.m}{r.s === "bad" && <Pill tone="bad" dot>Not paid</Pill>}</div>
            <div className="row-sub"><span className="num">S$600</span><span style={{ color: r.s === "bad" ? "var(--red)" : "var(--green)" }}>{r.note}</span></div>
          </div>
          <div className="row-right"><Pill tone="ok"><Icon name="lock" size={12} />Recorded</Pill></div>
        </div>
      ))}
      <div style={{ padding: "4px 16px 16px", background: "var(--paper-3)" }}>
        <div className="proof">
          <div className="proof-head"><Icon name="bank" size={14} /> Bank statement proof</div>
          <div className="proof-body">No credit of S$600 or more from the employer between 2026-07-01 and 2026-07-10.</div>
          <div className="proof-foot">Nothing else from the statement was disclosed.</div>
        </div>
      </div>
    </div>
  );
}
