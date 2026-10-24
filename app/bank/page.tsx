"use client";
import { useEffect, useState } from "react";
import { sgd } from "@/lib/eas";
type Txn = { date: string; description: string; creditCents: number; debitCents: number; counterparty: string };

export default function BankPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [txns, setTxns] = useState<Txn[]>([]);
  useEffect(() => { if (loggedIn) fetch("/api/bank/statement?account=maria").then(r => r.json()).then(j => setTxns(j.txns)); }, [loggedIn]);
  return (
    <main className="wide">
      <div className="banner">Synthetic bank for the demo. It stands in for a real internet-banking statement page (for example DBS or POSB). The proof flow reads this page the way a zkTLS provider would read the real one.</div>
      <div className="top"><div className="brand" style={{ color: "#f0b429" }}>LionBank <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>internet banking</span></div></div>
      {!loggedIn ? (
        <div className="card" style={{ maxWidth: 380 }}>
          <label>User ID</label><input defaultValue="maria.s" />
          <label>PIN</label><input type="password" defaultValue="••••••" />
          <div className="actions"><button className="btn primary" onClick={() => setLoggedIn(true)}>Log in</button></div>
        </div>
      ) : (
        <div className="card">
          <div className="row"><strong>Savings Account ····4471 · Maria S.</strong><span className="chip">2026</span></div>
          <table>
            <thead><tr><th>Date</th><th>Description</th><th>Counterparty</th><th style={{ textAlign: "right" }}>Credit</th><th style={{ textAlign: "right" }}>Debit</th></tr></thead>
            <tbody>
              {txns.map((t, i) => (
                <tr key={i}><td>{t.date}</td><td>{t.description}</td><td>{t.counterparty}</td>
                  <td className="credit" style={{ textAlign: "right" }}>{t.creditCents ? sgd(t.creditCents) : ""}</td>
                  <td className="debit" style={{ textAlign: "right" }}>{t.debitCents ? sgd(t.debitCents) : ""}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
