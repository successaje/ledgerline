"use client";
import { useEffect, useState } from "react";
import { sgd, dateLabel } from "@/domain/format";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Field, TextInput } from "@/components/ui/Field";

type Txn = { date: string; description: string; creditCents: number; debitCents: number; counterparty: string };

/** Synthetic internet-banking page. Stands in for a real statement page so the proof flow can be demonstrated end to end. */
export default function BankPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [txns, setTxns] = useState<Txn[] | null>(null);
  useEffect(() => { if (loggedIn) fetch("/api/bank/statement?account=maria").then(r => r.json()).then(j => setTxns(j.txns)); }, [loggedIn]);
  return (
    <div className="shell" style={{ background: "#eef1f5" }}>
      <header className="topbar" style={{ background: "#102a43", borderColor: "#102a43" }}>
        <div className="container topbar-inner" style={{ color: "#fff" }}>
          <strong style={{ letterSpacing: "-0.01em" }}>LionBank <span style={{ fontWeight: 400, opacity: .8 }}>· internet banking</span></strong>
          <span className="xs" style={{ opacity: .8 }}>Synthetic</span>
        </div>
      </header>
      <main className="main"><div className="container" style={{ display: "grid", gap: 16 }}>
        <Notice kind="info" title="This bank is synthetic">It stands in for a real statement page such as DBS or POSB. Ledgerline's proof reads this page the way a zkTLS provider would read the real one, and discloses only the pay window.</Notice>
        {!loggedIn ? (
          <form className="panel panel-pad" style={{ maxWidth: 380, display: "grid", gap: 14 }} onSubmit={e => { e.preventDefault(); setLoggedIn(true); }}>
            <Field id="uid" label="User ID"><TextInput id="uid" defaultValue="maria.s" /></Field>
            <Field id="pin" label="PIN"><TextInput id="pin" type="password" defaultValue="123456" /></Field>
            <Button type="submit" variant="primary">Log in</Button>
          </form>
        ) : (
          <div className="panel">
            <div className="ledger-head" style={{ borderRadius: "14px 14px 0 0" }}><strong>Savings account ····4471 · Maria S.</strong><span className="small muted">2026</span></div>
            <div style={{ overflowX: "auto", padding: "0 8px" }}>
              {txns ? (
                <table>
                  <thead><tr><th>Date</th><th>Description</th><th>Counterparty</th><th className="r">Credit</th><th className="r">Debit</th></tr></thead>
                  <tbody>{txns.map((t, i) => (
                    <tr key={i}><td className="num">{dateLabel(t.date)}</td><td>{t.description}</td><td>{t.counterparty}</td><td className="r num credit">{t.creditCents ? sgd(t.creditCents) : ""}</td><td className="r num muted">{t.debitCents ? sgd(t.debitCents) : ""}</td></tr>
                  ))}</tbody>
                </table>
              ) : <div className="skeleton" style={{ height: 200, margin: 12 }} />}
            </div>
          </div>
        )}
      </div></main>
    </div>
  );
}
