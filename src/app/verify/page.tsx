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
import { verifyItem, type ItemVerdict, type Check } from "@/services/verify";
import { useConfig } from "@/hooks/useConfig";
import { logEvent } from "@/services/analytics";

const OUTCOME: Record<Check["outcome"], { word: string; cls: string; icon: "check" | "x" | "info" | "clock" }> = {
  passed: { word: "Passed", cls: "ok", icon: "check" },
  failed: { word: "Failed", cls: "bad", icon: "x" },
  not_checked: { word: "Not checked", cls: "wait", icon: "info" },
  unavailable: { word: "Unavailable", cls: "warn", icon: "clock" },
};

function Verdict({ v }: { v: ItemVerdict }) {
  const tone = v.item.status === PAY_STATUS.UNPAID ? "bad" : v.item.status === PAY_STATUS.PARTIAL ? "warn" : "ok";
  return (
    <div className="panel">
      <div className="ledger-head" style={{ borderRadius: "14px 14px 0 0" }}>
        <strong>{periodLabel(v.item.period)}</strong>
        <span className={`pill pill-${tone} wrap`}><Icon name={tone === "ok" ? "check" : "alert"} size={14} />Worker recorded: {v.paymentLabel} · {sgd(v.item.status === PAY_STATUS.UNPAID ? 0 : v.item.amountCents)} received</span>
      </div>
      <div className="panel-pad">
        <div className="checklist">
          {v.checks.map((c, i) => {
            const o = OUTCOME[c.outcome];
            return (
              <div className="check" key={i}>
                <span className={`mark ${o.cls}`} aria-hidden><Icon name={o.icon} size={11} /></span>
                <div>
                  <div className="label"><span className="check-outcome">{o.word}</span> · {c.label}</div>
                  {c.detail && <div className="detail">{c.detail}{c.link && <> · <a href={c.link} target="_blank" rel="noreferrer">on chain</a></>}</div>}
                </div>
              </div>
            );
          })}
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
      setState("running"); setVerdicts([]); logEvent("verify_opened", { months: bundle.items.length });
      try {
        const out: ItemVerdict[] = [];
        for (const item of bundle.items) {
          const v = await verifyItem(bundle, item, config.schemas, explorer.attestation);
          if (cancelled) return;
          out.push(v); setVerdicts([...out]);
        }
        setState("done"); logEvent("verify_done", { ok: out.every(v => v.checks.every(c => c.outcome !== "failed")) });
        if (out.some(v => !v.found) && runId < 4) setTimeout(() => setRunId(r => r + 1), 15_000);
      } catch { if (!cancelled) setState("error"); }
    })();
    return () => { cancelled = true; };
  }, [bundle, config, runId]);

  if (bundle === null) return <Shell><div className="skeleton" style={{ height: 240, borderRadius: 14 }} /></Shell>;
  if (bundle === "bad") return <Shell nav={<span className="env-label">Test network<span className="hide-xs"> · {CHAIN_NAME}</span></span>}><div className="empty"><h3>No shared records in this link</h3><p>A shared-records link contains only the months the worker chose to share. Ask them to share it again.</p></div></Shell>;

  const employerKeys = Array.from(new Set(verdicts.map(v => v.employerKey).filter(Boolean))) as string[];
  const allFound = verdicts.length === bundle.items.length && verdicts.every(v => v.found);

  return (
    <Shell nav={<span className="env-label" title={`Records are on ${CHAIN_NAME}, a test network.`}>Test network<span className="hide-xs"> · {CHAIN_NAME}</span></span>}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "grid", gap: 16 }}>
        <div>
          <h1>Pay records shared by {bundle.worker.name}</h1>
          <p className="muted" style={{ marginTop: 6 }}>Employer “{bundle.employer.label}” · {bundle.items.length} month{bundle.items.length === 1 ? "" : "s"} shared · link made {new Date(bundle.issuedAt).toLocaleString("en-SG")}</p>
          <p className="small muted" style={{ marginTop: 6 }}>This page re-checks each shared month against the public test network. It shows what the worker recorded, whether the employer responded, and whether demo bank evidence matched. It does not decide who is right.</p>
        </div>
        {state === "running" && <Notice kind="info"><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><span className="spinner" /> Checking {verdicts.length + 1} of {bundle.items.length} against the chain…</span></Notice>}
        {state === "error" && <Notice kind="error" title="The record index could not be reached" action={<Button size="sm" onClick={() => setRunId(r => r + 1)} icon={<Icon name="refresh" size={14} />}>Try again</Button>}>Nothing in the bundle was changed. Retry in a moment.</Notice>}
        {verdicts.map((v, i) => <Verdict key={i} v={v} />)}
        {state === "done" && !allFound && <Notice kind="warn" title="Some records are not indexed yet" action={<Button size="sm" onClick={() => setRunId(r => r + 1)} icon={<Icon name="refresh" size={14} />}>Check again</Button>}>Records reach the index about a minute after they are written.</Notice>}
        {state === "done" && (
          <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="primary" onClick={() => window.print()} icon={<Icon name="share" />}>Save as PDF or print</Button>
            <Button onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); } catch {} }} icon={<Icon name="copy" />}>Copy link</Button>
          </div>
        )}
        {state === "done" && (
          <div className="panel panel-pad small muted" style={{ display: "grid", gap: 6 }}>
            <strong style={{ color: "var(--ink)" }}>What was checked</strong>
            <span>Each month is an attestation on {CHAIN_NAME} signed by the worker's key <span className="mono">{shortAddr(bundle.worker.address, 8)}</span>.</span>
            <span>Employer responses are separate attestations that reference the month{employerKeys.length ? <>, signed from the device that opened the link (<span className="mono">{employerKeys.map(k => shortAddr(k)).join(", ")}</span>)</> : ""}. A device key is not a verified employer identity.</span>
            <span>Bank evidence is hashed on chain; this page recomputes the hash and checks the attestor signature{bundle.bankAttestor ? <> (<span className="mono">{shortAddr(bundle.bankAttestor)}</span>)</> : ""}. In this release the bank is demo data, not a real bank.</span>
            <span>Outcomes: Passed, Failed, Not checked, Unavailable. A timeout is Unavailable, never Failed. A matching signature is not proof of payment.</span>
            <span>Months outside this bundle were not disclosed. No names or balances are on chain.</span>
            <span className="print-only">Verified at {new Date().toLocaleString("en-SG")} · ledgerline-sg.vercel.app/verify</span>
          </div>
        )}
        {state === "done" && (
          <div className="panel panel-pad no-print" style={{ display: "grid", gap: 8 }}>
            <strong>Keep your own pay records</strong>
            <p className="small muted">Ledgerline is free. Each month, record what you expected and what you received. Your employer can respond from a link. Share only the months you choose.</p>
            <a className="btn btn-primary" href="/app/start" style={{ justifySelf: "start" }}>Start my records</a>
          </div>
        )}
      </div>
    </Shell>
  );
}

export default function VerifyPage() {
  return <Suspense fallback={<Shell><div className="skeleton" style={{ height: 240, borderRadius: 14 }} /></Shell>}><VerifyInner /></Suspense>;
}
