"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ZeroHash } from "ethers";
import { getOrCreateKey } from "@/lib/keys";
import { SCHEMAS, DECISION, EXPLORER_ATTESTATION, periodLabel, sgd } from "@/lib/eas";
import { delegatedAttest } from "@/lib/attest";

type Payload = { worker: string; workerName: string; employerLabel: string; items: { uid: string; period: number; amountCents: number; status: number }[] };

function EmployerInner() {
  const sp = useSearchParams();
  const [p, setP] = useState<Payload | null>(null);
  const [cfg, setCfg] = useState<{ schemas: { countersign: string } } | null>(null);
  const [done, setDone] = useState<Record<string, { uid: string; decision: number }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [addr, setAddr] = useState("");

  useEffect(() => {
    const c = sp.get("c");
    if (c) {
      const b = c.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((c.length + 3) % 4);
      setP(JSON.parse(decodeURIComponent(escape(atob(b)))));
    }
    setAddr(getOrCreateKey("employer").address);
    fetch("/api/config").then(r => r.json()).then(setCfg);
    try { setDone(JSON.parse(localStorage.getItem("ll.employer.done") || "{}")); } catch {}
  }, [sp]);

  async function decide(uid: string, decision: number) {
    if (!cfg) return;
    setErr(null); setBusy(uid + decision);
    try {
      const w = getOrCreateKey("employer");
      const res = await delegatedAttest({
        schemaUID: cfg.schemas.countersign, schemaString: SCHEMAS.countersign, signer: w, refUID: uid, recipient: p?.worker,
        fields: [
          { name: "payEventUID", value: uid, type: "bytes32" },
          { name: "decision", value: decision, type: "uint8" },
          { name: "noteHash", value: ZeroHash, type: "bytes32" },
        ],
      });
      const n = { ...done, [uid]: { uid: res.uid, decision } };
      setDone(n); localStorage.setItem("ll.employer.done", JSON.stringify(n));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }

  if (!p) return <main className="phone"><p className="muted">This link is missing its content. Ask the worker to resend it.</p></main>;

  return (
    <main className="phone">
      <div className="top"><div className="brand">Ledger<span>line</span></div><span className="chip">Employer confirmation</span></div>
      <p className="sub">{p.workerName} asks you to confirm these salary records. Confirming creates a signed record from this device that both of you can rely on later.</p>
      {err && <div className="banner" style={{ borderColor: "rgba(248,113,113,.5)" }}>{err}</div>}
      {p.items.length === 0 && <div className="card">Nothing to confirm right now.</div>}
      {p.items.map(it => {
        const d = done[it.uid];
        return (
          <div key={it.uid} className="card">
            <div className="row">
              <div><div className="period">{periodLabel(it.period)}</div><div className="amount">{sgd(it.amountCents)} · worker says {it.status === 2 ? "NOT paid" : "paid"}</div></div>
              {d ? <span className={`chip ${d.decision === 1 ? "ok" : "bad"}`}>{d.decision === 1 ? "Confirmed" : "Disputed"}</span> : <span className="chip warn">Awaiting you</span>}
            </div>
            {d ? <div className="small muted" style={{ marginTop: 8 }}><a href={EXPLORER_ATTESTATION(d.uid)} target="_blank" rel="noreferrer">Your signed confirmation ↗</a></div> : (
              <div className="actions">
                <button className="btn primary" disabled={!!busy} onClick={() => decide(it.uid, DECISION.CONFIRM)}>{busy === it.uid + 1 ? <span className="spin" /> : null}Confirm</button>
                <button className="btn danger" disabled={!!busy} onClick={() => decide(it.uid, DECISION.DISPUTE)}>{busy === it.uid + 2 ? <span className="spin" /> : null}Dispute</button>
              </div>
            )}
          </div>
        );
      })}
      <p className="small muted" style={{ marginTop: 16 }}>Your signing key on this device: <span className="mono">{addr}</span>. Testnet prototype; no money moves.</p>
    </main>
  );
}

export default function EmployerPage() {
  return <Suspense fallback={<main className="phone"><p className="muted">Loading…</p></main>}><EmployerInner /></Suspense>;
}
