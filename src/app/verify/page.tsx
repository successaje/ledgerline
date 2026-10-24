"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/ui/Shell";
import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { decodeBundle, type Bundle } from "@/domain/bundle";
import { PAY_STATUS } from "@/domain/types";
import { periodLabel, sgd, shortAddr } from "@/domain/format";
import { explorer, CHAIN_NAME } from "@/services/chain";
import { verifyItem, type ItemVerdict } from "@/services/verify";
import { useConfig } from "@/hooks/useConfig";

function Verdict({ v }: { v: ItemVerdict }) {
  return (
    <div className="panel">
      <div className="ledger-head" style={{ borderRadius: "14px 14px 0 0" }}>
        <strong>{periodLabel(v.item.period)}</strong>
        <Pill tone={v.item.status === PAY_STATUS.UNPAID ? "bad" : "ok"} dot>{sgd(v.item.amountCents)} · {v.item.status === PAY_STATUS.UNPAID ? "reported not paid" : "reported paid"}</Pill>
      </div>
      <div className="panel-pad">
        <div className="checklist">
          {v.checks.map((c, i) => (
            <div className="check" key={i}>
              <span className={`mark ${c.ok === null ? "wait" : c.ok ? "ok" : "bad"}`}>{c.ok === null ? null : <Icon name={c.ok ? "check" : "x"} size={11} />}</span>
              <div>
                <div className="label">{c.label}</div>
                {c.detail && <div className="detail">{c.detail}{c.link && <> · <a href={c.link} target="_blank" rel="noreferrer">on chain</a></>}</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="summary" style={{ marginTop: 12 }}>{v.sentence}</div>
      </div>
    </div>
  );
}

function VerifyInner() {
  const sp = useSearchParams();
  const { config } = useConfig();
  const [bundle, setBundle] = useState<Bundle | null | "bad">(null);
  const [verdicts, setVerdicts] = useState<ItemVerdict[]>([]);
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const raw = sp.get("b");
    if (!raw) { setBundle("bad"); return; }
    try { setBundle(decodeBundle(raw)); } catch { setBundle("bad"); }
  }, [sp]);

  useEffect(() => {
    if (!bundle || bundle === "bad" || !config) return;
    let cancelled = false;
    (async () => {
      setState("running"); setVerdicts([]);
      try {
        const out: ItemVerdict[] = [];
        for (const item of bundle.items) {
          const v = await verifyItem(bundle, item, config.schemas, explorer.attestation);
          if (cancelled) return;
          out.push(v); setVerdicts([...out]);
        }
        setState("done");
      } catch { if (!cancelled) setState("error"); }
    })();
    return () => { cancelled = true; };
  }, [bundle, config, runId]);

  if (bundle === null) return <Shell><div className="skeleton" style={{ height: 240, borderRadius: 14 }} /></Shell>;
  if (bundle === "bad") return <Shell><div className="empty"><h3>No bundle in this link</h3><p>A dispute bundle link contains the months the worker chose to disclose. Ask them to share it again.</p></div></Shell>;

  const employerKeys = Array.from(new Set(verdicts.map(v => v.employerKey).filter(Boolean))) as string[];
  const allFound = verdicts.length === bundle.items.length && verdicts.every(v => v.found);

  return (
    <Shell nav={<Pill tone="outline">Verifier · {CHAIN_NAME}</Pill>}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "grid", gap: 16 }}>
        <div>
          <h1>Dispute bundle for {bundle.worker.name}</h1>
          <p className="muted" style={{ marginTop: 6 }}>Employer “{bundle.employer.label}” · {bundle.items.length} month{bundle.items.length === 1 ? "" : "s"} disclosed · issued {new Date(bundle.issuedAt).toLocaleString("en-SG")}</p>
        </div>
        {state === "running" && <Notice kind="info"><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><span className="spinner" /> Checking {verdicts.length + 1} of {bundle.items.length} against the chain…</span></Notice>}
        {state === "error" && <Notice kind="error" title="The record index could not be reached" action={<Button size="sm" onClick={() => setRunId(r => r + 1)} icon={<Icon name="refresh" size={14} />}>Try again</Button>}>Nothing in the bundle was changed. Retry in a moment.</Notice>}
        {verdicts.map((v, i) => <Verdict key={i} v={v} />)}
        {state === "done" && !allFound && <Notice kind="warn" title="Some records are not indexed yet" action={<Button size="sm" onClick={() => setRunId(r => r + 1)} icon={<Icon name="refresh" size={14} />}>Check again</Button>}>Records reach the index about a minute after they are written.</Notice>}
        {state === "done" && (
          <div className="panel panel-pad small muted" style={{ display: "grid", gap: 6 }}>
            <strong style={{ color: "var(--ink)" }}>What was checked</strong>
            <span>Each month is an attestation on {CHAIN_NAME} signed by the worker's key <span className="mono">{shortAddr(bundle.worker.address, 8)}</span>.</span>
            <span>Employer answers are separate attestations that reference the month{employerKeys.length ? <>, signed by <span className="mono">{employerKeys.map(k => shortAddr(k)).join(", ")}</span></> : ""}.</span>
            <span>Bank proofs are hashed on chain; this page recomputes the hash and checks the attestor signature{bundle.bankAttestor ? <> (<span className="mono">{shortAddr(bundle.bankAttestor)}</span>)</> : ""}.</span>
            <span>Months outside this bundle were not disclosed. No names or balances are on chain.</span>
          </div>
        )}
      </div>
    </Shell>
  );
}

export default function VerifyPage() {
  return <Suspense fallback={<Shell><div className="skeleton" style={{ height: 240, borderRadius: 14 }} /></Shell>}><VerifyInner /></Suspense>;
}
