"use client";
import { useEffect, useMemo, useState } from "react";
import { keccak256, toUtf8Bytes, ZeroHash } from "ethers";
import { getOrCreateKey, idFromAddress, idFromLabel } from "@/lib/keys";
import { loadState, saveState, seedMaria, type PayRecord, type WorkerState } from "@/lib/store";
import { SCHEMAS, PAY_STATUS, PROOF_METHOD, EXPLORER_ATTESTATION, periodLabel, sgd, fetchByRefUIDs } from "@/lib/eas";
import { delegatedAttest } from "@/lib/attest";
import { encodeBundle, type Bundle } from "@/lib/bundle";
import QRCode from "qrcode";

type Cfg = { schemas: { payEvent: string; countersign: string; bankProof: string }; bankAttestor: string; zkTls: boolean };

export default function WorkerPage() {
  const [state, setState] = useState<WorkerState | null>(null);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [addr, setAddr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [share, setShare] = useState<{ url: string; qr: string } | null>(null);
  const [bundle, setBundle] = useState<{ url: string; qr: string } | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<Record<number, boolean>>({});
  const [ffwd, setFfwd] = useState(false);

  useEffect(() => {
    const w = getOrCreateKey("worker");
    setAddr(w.address);
    let s = loadState();
    if (!s) { s = seedMaria(idFromLabel("Mdm Tan +65 9xxx 1234")); saveState(s); }
    setState(s);
    fetch("/api/config").then(r => r.json()).then(setCfg);
    setFfwd(window.localStorage.getItem("ll.ffwd") === "1");
  }, []);

  const update = (fn: (s: WorkerState) => WorkerState) => setState(prev => { if (!prev) return prev; const n = fn(structuredClone(prev)); saveState(n); return n; });

  async function recordEvent(rec: PayRecord) {
    if (!cfg || !state) return;
    setErr(null); setBusy(`record-${rec.period}`);
    try {
      const w = getOrCreateKey("worker");
      const detail = { worker: state.name, employer: state.employerLabel, note: rec.note || "" };
      const detailHash = keccak256(toUtf8Bytes(JSON.stringify(detail)));
      const res = await delegatedAttest({
        schemaUID: cfg.schemas.payEvent, schemaString: SCHEMAS.payEvent, signer: w,
        fields: [
          { name: "workerId", value: idFromAddress(w.address), type: "bytes32" },
          { name: "employerId", value: state.employerId, type: "bytes32" },
          { name: "period", value: rec.period, type: "uint32" },
          { name: "amountCents", value: BigInt(rec.amountCents), type: "uint256" },
          { name: "status", value: rec.status, type: "uint8" },
          { name: "detailHash", value: detailHash, type: "bytes32" },
        ],
      });
      update(s => { const r = s.records.find(x => x.period === rec.period)!; r.payEventUID = res.uid; r.payEventTx = res.tx || undefined; r.signedAt = Date.now(); return s; });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }

  async function recordAll() {
    if (!state) return;
    for (const r of state.records) if (!r.payEventUID) { await recordEvent(r); }
  }

  async function refreshCountersigns() {
    if (!cfg || !state) return;
    setBusy("refresh");
    try {
      const uids = state.records.filter(r => r.payEventUID && !r.countersign).map(r => r.payEventUID!);
      const list = await fetchByRefUIDs(uids, cfg.schemas.countersign);
      update(s => {
        for (const a of list) {
          const r = s.records.find(x => x.payEventUID === a.refUID);
          if (r && !r.countersign) r.countersign = { uid: a.id, decision: Number(a.decoded.decision) as 1 | 2, employer: a.attester, at: Number(a.time) * 1000 };
        }
        return s;
      });
    } finally { setBusy(null); }
  }

  async function proveFromBank(rec: PayRecord) {
    if (!cfg || !state) return;
    setErr(null); setBusy(`prove-${rec.period}`);
    try {
      const y = Math.floor(rec.period / 100), m = String(rec.period % 100).padStart(2, "0");
      const from = `${y}-${m}-01`, to = `${y}-${m}-10`;
      const r = await fetch("/api/bank/prove", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account: "maria", from, to, minAmountCents: rec.amountCents, counterparty: "TAN" }) });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error || "proof failed");
      const w = getOrCreateKey("worker");
      const predicateHash = keccak256(toUtf8Bytes(JSON.stringify(p.predicate)));
      const proofHash = keccak256(toUtf8Bytes(p.proofJson));
      const res = await delegatedAttest({
        schemaUID: cfg.schemas.bankProof, schemaString: SCHEMAS.bankProof, signer: w, refUID: rec.payEventUID,
        fields: [
          { name: "payEventUID", value: rec.payEventUID, type: "bytes32" },
          { name: "predicateHash", value: predicateHash, type: "bytes32" },
          { name: "proofHash", value: proofHash, type: "bytes32" },
          { name: "method", value: p.method, type: "uint8" },
          { name: "satisfied", value: p.satisfied, type: "bool" },
        ],
      });
      const summary = p.satisfied
        ? `No credit of ${sgd(rec.amountCents)} or more from the employer between ${from} and ${to}.`
        : `${p.extracted.count} matching credit(s) found between ${from} and ${to}.`;
      update(s => { const x = s.records.find(q => q.period === rec.period)!; x.proof = { uid: res.uid, satisfied: p.satisfied, method: p.method, summary, proofJson: p.proofJson, at: Date.now() }; return s; });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }

  function employerLink() {
    if (!state) return;
    const items = state.records.filter(r => r.payEventUID && !r.countersign).map(r => ({ uid: r.payEventUID, period: r.period, amountCents: r.amountCents, status: r.status }));
    const payload = { worker: addr, workerName: state.name, employerLabel: state.employerLabel, items };
    const b = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const url = `${window.location.origin}/employer?c=${b}`;
    QRCode.toDataURL(url, { margin: 1, width: 220 }).then(qr => setShare({ url, qr }));
  }

  function buildBundle() {
    if (!state || !cfg) return;
    const items = state.records.filter(r => sel[r.period] && r.payEventUID).map(r => ({
      period: r.period, amountCents: r.amountCents, status: r.status, payEventUID: r.payEventUID!,
      countersignUID: r.countersign?.uid, proof: r.proof ? { uid: r.proof.uid, proofJson: r.proof.proofJson } : undefined,
    }));
    const b: Bundle = { v: 1, worker: { address: addr, name: state.name }, employer: { label: state.employerLabel, id: state.employerId }, bankAttestor: cfg.bankAttestor, issuedAt: Date.now(), items };
    const url = `${window.location.origin}/verify?b=${encodeBundle(b)}`;
    QRCode.toDataURL(url, { margin: 1, width: 220 }).then(qr => setBundle({ url, qr }));
    setSelecting(false);
  }

  const awaitingDays = (r: PayRecord) => {
    if (!r.signedAt) return 0;
    const real = (Date.now() - r.signedAt) / 86400000;
    return ffwd ? Math.max(real, 3.5) : real;
  };

  const ready = useMemo(() => Boolean(cfg?.schemas.payEvent), [cfg]);

  if (!state) return <main className="phone"><p className="muted">Loading…</p></main>;

  return (
    <main className="phone">
      <div className="top"><div className="brand">Ledger<span>line</span></div><span className="chip">Base Sepolia · testnet</span></div>
      <p className="sub">{state.name} · {state.employerLabel}<br /><span className="mono">{addr.slice(0, 10)}…{addr.slice(-6)}</span> (your key, held on this phone)</p>

      {!ready && <div className="banner">Schemas are not registered yet. Run <span className="mono">npm run schemas</span> and set the env vars.</div>}
      {err && <div className="banner" style={{ borderColor: "rgba(248,113,113,.5)" }}>{err}</div>}

      <div className="actions" style={{ marginBottom: 12 }}>
        <button className="btn" disabled={!ready || !!busy} onClick={recordAll}>Record all unsigned months</button>
        <button className="btn" disabled={!ready || !!busy} onClick={refreshCountersigns}>{busy === "refresh" ? <span className="spin" /> : null}Check employer confirmations</button>
        <button className="btn" disabled={!ready} onClick={employerLink}>Ask employer to confirm</button>
      </div>

      {share && (
        <div className="card">
          <div className="row"><strong>Share with employer</strong><button className="btn" onClick={() => setShare(null)}>Close</button></div>
          <p className="small muted">Send this link on WhatsApp. The employer confirms or disputes each month with one tap. No app, no account.</p>
          <div style={{ textAlign: "center" }}><img className="qr" src={share.qr} alt="QR" /></div>
          <div className="actions">
            <button className="btn primary" onClick={() => navigator.clipboard.writeText(share.url)}>Copy link</button>
            <a className="btn" href={`https://wa.me/?text=${encodeURIComponent("Please confirm my salary record: " + share.url)}`} target="_blank" rel="noreferrer">Open WhatsApp</a>
            <a className="btn" href={share.url} target="_blank" rel="noreferrer">Open as employer</a>
          </div>
        </div>
      )}

      {state.records.map(r => {
        const unpaid = r.status === PAY_STATUS.UNPAID;
        const days = awaitingDays(r);
        return (
          <div key={r.period} className={`card ${unpaid ? "red" : ""}`}>
            <div className="row">
              <div>
                <div className="period">{periodLabel(r.period)} {selecting && <input type="checkbox" style={{ width: "auto", marginLeft: 8 }} checked={!!sel[r.period]} onChange={e => setSel({ ...sel, [r.period]: e.target.checked })} />}</div>
                <div className="amount">{sgd(r.amountCents)} · {unpaid ? "Not paid" : "Paid"}</div>
              </div>
              <span className={`chip ${unpaid ? "bad" : "ok"}`}>{unpaid ? "UNPAID" : "PAID"}</span>
            </div>
            <div className="chips">
              {r.payEventUID ? <a className="chip info" href={EXPLORER_ATTESTATION(r.payEventUID)} target="_blank" rel="noreferrer">On chain ↗</a> : <span className="chip">Not recorded</span>}
              {r.countersign ? (r.countersign.decision === 1 ? <span className="chip ok">Employer confirmed</span> : <span className="chip bad">Employer disputed</span>)
                : r.payEventUID ? (days >= 3 ? <span className="chip bad">Employer did not confirm ({Math.floor(days)}d)</span> : <span className="chip warn">Awaiting employer ({days < 1 ? "today" : Math.floor(days) + "d"})</span>) : null}
              {r.proof && <span className={`chip ${r.proof.satisfied ? "ok" : "warn"}`}>Bank proof {r.proof.method === PROOF_METHOD.ZKTLS ? "(zkTLS)" : "(signed attestor)"}</span>}
            </div>
            {r.proof && (
              <div className="proofbox">
                <div className="big">{r.proof.summary}</div>
                <div className="small muted">Nothing else from the statement was disclosed. <a href={EXPLORER_ATTESTATION(r.proof.uid)} target="_blank" rel="noreferrer">Attestation ↗</a></div>
              </div>
            )}
            <div className="actions">
              {!r.payEventUID && <button className="btn primary" disabled={!ready || !!busy} onClick={() => recordEvent(r)}>{busy === `record-${r.period}` ? <span className="spin" /> : null}Sign &amp; record</button>}
              {r.payEventUID && unpaid && !r.proof && <button className="btn primary" disabled={!!busy} onClick={() => proveFromBank(r)}>{busy === `prove-${r.period}` ? <span className="spin" /> : null}Prove from my bank</button>}
            </div>
          </div>
        );
      })}

      <div className="sticky">
        {!selecting && !bundle && <button className="btn primary" style={{ width: "100%" }} onClick={() => { setSelecting(true); const s: Record<number, boolean> = {}; state.records.forEach(r => { if (r.status === PAY_STATUS.UNPAID) s[r.period] = true; }); setSel(s); }}>Build dispute bundle</button>}
        {selecting && <div className="actions"><button className="btn primary" onClick={buildBundle}>Create bundle for selected months</button><button className="btn" onClick={() => setSelecting(false)}>Cancel</button></div>}
        {bundle && (
          <div className="card">
            <div className="row"><strong>Dispute bundle</strong><button className="btn" onClick={() => setBundle(null)}>Close</button></div>
            <p className="small muted">Only the selected months are included. Anyone with the link can verify every signature and proof; nothing else about you is revealed.</p>
            <div style={{ textAlign: "center" }}><img className="qr" src={bundle.qr} alt="QR" /></div>
            <div className="actions"><button className="btn primary" onClick={() => navigator.clipboard.writeText(bundle.url)}>Copy link</button><a className="btn" href={bundle.url} target="_blank" rel="noreferrer">Open verifier</a></div>
          </div>
        )}
      </div>

      <details style={{ marginTop: 18 }}>
        <summary className="small muted">Demo controls</summary>
        <div className="actions">
          <button className="btn" onClick={() => { const v = !ffwd; setFfwd(v); window.localStorage.setItem("ll.ffwd", v ? "1" : "0"); }}>{ffwd ? "Disable" : "Enable"} “3 days have passed”</button>
          <button className="btn danger" onClick={() => { window.localStorage.removeItem("ll.worker.state"); window.location.reload(); }}>Reset records (keep key)</button>
          <a className="btn" href="/bank" target="_blank" rel="noreferrer">Open the synthetic bank</a>
        </div>
        <p className="small muted">Testnet prototype. The bank is synthetic; the worker is seeded. Attestations, signatures and the proof flow are real.</p>
      </details>
    </main>
  );
}
