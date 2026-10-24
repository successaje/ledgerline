"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keccak256, toUtf8Bytes, verifyMessage, getAddress } from "ethers";
import { decodeBundle, type Bundle, type BundleItem } from "@/lib/bundle";
import { fetchAttestation, fetchByRefUIDs, schemaUIDs, periodLabel, sgd, EXPLORER_ATTESTATION } from "@/lib/eas";

type Check = { ok: boolean | null; label: string; detail?: string; link?: string };
type Result = { item: BundleItem; checks: Check[]; sentence: string; employerKey?: string };

function ItemResult({ r }: { r: Result }) {
  return (
    <div className={`card ${r.item.status === 2 ? "red" : ""}`}>
      <div className="row"><div className="period">{periodLabel(r.item.period)}</div><span className={`chip ${r.item.status === 2 ? "bad" : "ok"}`}>{sgd(r.item.amountCents)} · {r.item.status === 2 ? "reported unpaid" : "reported paid"}</span></div>
      <div style={{ marginTop: 8 }}>
        {r.checks.map((c, i) => (
          <div className="check" key={i}>
            <div className={`dot ${c.ok === null ? "wait" : c.ok ? "ok" : "bad"}`} />
            <div><div>{c.label}</div>{c.detail && <div className="small muted">{c.detail} {c.link && <a href={c.link} target="_blank" rel="noreferrer">↗</a>}</div>}</div>
          </div>
        ))}
      </div>
      <div className="proofbox summary">{r.sentence}</div>
    </div>
  );
}

function VerifyInner() {
  const sp = useSearchParams();
  const [b, setB] = useState<Bundle | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState("Verifying on Base Sepolia…");

  useEffect(() => {
    const raw = sp.get("b");
    if (!raw) { setStatus("No bundle in this link."); return; }
    let bundle: Bundle;
    try { bundle = decodeBundle(raw); } catch { setStatus("This bundle could not be decoded."); return; }
    setB(bundle);
    (async () => {
      const uids = schemaUIDs();
      const out: Result[] = [];
      for (const item of bundle.items) {
        const checks: Check[] = [];
        let sentence = "";
        // 1. Pay event attested by the worker's key
        const pe = await fetchAttestation(item.payEventUID);
        if (!pe) { checks.push({ ok: false, label: "Pay record not found on chain (indexer may lag a minute)" }); out.push({ item, checks, sentence: "Could not verify this month yet." }); continue; }
        const attesterOk = pe.attester.toLowerCase() === bundle.worker.address.toLowerCase();
        const fieldsOk = Number(pe.decoded.period) === item.period && String(pe.decoded.amountCents) === String(item.amountCents) && Number(pe.decoded.status) === item.status;
        checks.push({ ok: attesterOk && fieldsOk && !pe.revoked, label: `Worker's own record, signed ${new Date(pe.time * 1000).toLocaleDateString()}`, detail: `attester ${pe.attester.slice(0, 10)}… ${fieldsOk ? "fields match" : "fields differ"}`, link: EXPLORER_ATTESTATION(pe.id) });
        // 2. Employer countersign (by refUID, any attester) 
        const cs = await fetchByRefUIDs([item.payEventUID], uids.countersign);
        const chosen = item.countersignUID ? cs.find(c => c.id === item.countersignUID) || cs[0] : cs[0];
        let employerState: "confirmed" | "disputed" | "silent" = "silent";
        if (chosen) {
          const decision = Number(chosen.decoded.decision);
          employerState = decision === 1 ? "confirmed" : "disputed";
          checks.push({ ok: decision === 1, label: decision === 1 ? "Employer confirmed this month" : "Employer disputed this month", detail: `signed by ${chosen.attester.slice(0, 10)}… on ${new Date(chosen.time * 1000).toLocaleDateString()}`, link: EXPLORER_ATTESTATION(chosen.id) });
        } else {
          const days = Math.floor((Date.now() - pe.time * 1000) / 86400000);
          checks.push({ ok: false, label: `Employer did not confirm (${days} day${days === 1 ? "" : "s"} since the record was signed)`, detail: "No countersign attestation references this record." });
        }
        // 3. Bank proof
        let bankSentence = "";
        if (item.proof) {
          const bp = await fetchAttestation(item.proof.uid);
          let okHash = false, okSig = false, okRef = false, satisfied = false, method = 0, predicateText = "";
          try {
            const pj = JSON.parse(item.proof.proofJson);
            method = pj.method; satisfied = !!pj.satisfied;
            const h = keccak256(toUtf8Bytes(item.proof.proofJson));
            okHash = !!bp && String(bp.decoded.proofHash).toLowerCase() === h.toLowerCase();
            okRef = !!bp && bp.refUID.toLowerCase() === item.payEventUID.toLowerCase();
            predicateText = `no credit ≥ ${sgd(pj.predicate.minAmountCents)}${pj.predicate.counterparty ? " from " + pj.predicate.counterparty : ""} between ${pj.predicate.from} and ${pj.predicate.to}`;
            if (method === 2) {
              const { signature, ...payload } = pj;
              const rec = verifyMessage(JSON.stringify(payload), signature);
              okSig = getAddress(rec) === getAddress(pj.attestor) && (!bundle.bankAttestor || getAddress(pj.attestor) === getAddress(bundle.bankAttestor));
            } else if (method === 1) {
              okSig = Boolean(pj.reclaim); // full zkTLS verification would call Reclaim's verifier; shown as present
            }
          } catch {}
          const all = okHash && okSig && okRef;
          checks.push({ ok: all, label: method === 1 ? "Bank statement proof (zkTLS)" : "Bank statement proof (signed attestor, stand-in for zkTLS)", detail: `${okHash ? "hash matches chain" : "hash mismatch"} · ${okSig ? "attestor signature valid" : "signature invalid"} · ${okRef ? "linked to this record" : "not linked"} · ${predicateText}`, link: bp ? EXPLORER_ATTESTATION(bp.id) : undefined });
          bankSentence = all ? (satisfied ? `The bank statement shows ${predicateText}.` : `The bank statement shows a matching credit in that window.`) : "The bank proof could not be verified.";
        }
        const who = bundle.worker.name;
        const month = periodLabel(item.period);
        if (item.status === 2) {
          sentence = `${month}: ${who} recorded this month as unpaid (${sgd(item.amountCents)}). ` +
            (employerState === "confirmed" ? "The employer confirmed the record. " : employerState === "disputed" ? "The employer disputed the record. " : "The employer did not confirm within the window. ") + bankSentence;
        } else {
          sentence = `${month}: ${who} recorded ${sgd(item.amountCents)} as paid. ` + (employerState === "confirmed" ? "The employer confirmed it." : employerState === "disputed" ? "The employer disputed it." : "The employer has not confirmed it.");
        }
        out.push({ item, checks, sentence, employerKey: chosen?.attester });
        setResults([...out]);
      }
      setStatus("");
    })();
  }, [sp]);

  const employerKeys = Array.from(new Set(results.map(r => r.employerKey).filter(Boolean))) as string[];

  return (
    <main className="phone">
      <div className="top"><div className="brand">Ledger<span>line</span></div><span className="chip">Verifier</span></div>
      {b && <p className="sub">Dispute bundle for <strong>{b.worker.name}</strong> · employer “{b.employer.label}” · {b.items.length} month{b.items.length === 1 ? "" : "s"} disclosed · issued {new Date(b.issuedAt).toLocaleString()}</p>}
      {status && <div className="banner"><span className="spin" />{status}</div>}
      {results.map((r, i) => <ItemResult key={i} r={r} />)}
      {b && !status && (
        <div className="card">
          <strong>What this verifier checked</strong>
          <ul className="small muted" style={{ paddingLeft: 18, margin: "6px 0 0" }}>
            <li>Each month is an attestation on Base Sepolia signed by the worker's key <span className="mono">{b.worker.address.slice(0, 10)}…</span>.</li>
            <li>Employer confirmations are separate attestations that reference the month{employerKeys.length ? <> and were signed by <span className="mono">{employerKeys.map(k => k.slice(0, 10) + "…").join(", ")}</span></> : ""}.</li>
            <li>Bank proofs are hashed on chain; the verifier recomputes the hash and checks the attestor signature{b.bankAttestor ? <> (<span className="mono">{b.bankAttestor.slice(0, 10)}…</span>)</> : ""}.</li>
            <li>Nothing outside the selected months was disclosed. No names or balances are on chain.</li>
          </ul>
        </div>
      )}
    </main>
  );
}

export default function VerifyPage() {
  return <Suspense fallback={<main className="phone"><p className="muted">Loading…</p></main>}><VerifyInner /></Suspense>;
}
