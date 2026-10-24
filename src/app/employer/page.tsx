"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ZeroHash } from "ethers";
import { Shell } from "@/components/ui/Shell";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { Stages } from "@/components/ui/Stages";
import { decodeEmployerRequest, type EmployerRequest } from "@/domain/bundle";
import { DECISION, PAY_STATUS, type TxStage } from "@/domain/types";
import { periodLabel, sgd, shortAddr } from "@/domain/format";
import { SCHEMA_DEFS, explorer } from "@/services/chain";
import { getOrCreateKey } from "@/services/keys";
import { useConfig } from "@/hooks/useConfig";
import { useToast } from "@/hooks/useToast";
import { logEvent } from "@/services/analytics";

type Done = Record<string, { uid: string; decision: number; period?: number; amountCents?: number; workerName?: string; at?: number }>;

function EmployerInner() {
  const sp = useSearchParams();
  const { config, ready } = useConfig();
  const { push } = useToast();
  const [req, setReq] = useState<EmployerRequest | null | "bad">(null);
  const [done, setDone] = useState<Done>({});
  const [active, setActive] = useState<{ uid: string; stage: TxStage; txHash?: string } | null>(null);
  const [addr, setAddr] = useState("");

  useEffect(() => {
    const c = sp.get("c");
    try { setReq(c ? decodeEmployerRequest(c) : "bad"); } catch { setReq("bad"); }
    setAddr(getOrCreateKey("employer").address);
    try { setDone(JSON.parse(localStorage.getItem("ll.employer.done") || "{}")); } catch {}
  }, [sp]);

  async function decide(uid: string, decision: 1 | 2) {
    if (!config || req === null || req === "bad") return;
    try {
      const { delegatedAttest } = await import("@/services/attest");
      const res = await delegatedAttest({
        schemaUID: config.schemas.countersign, schemaString: SCHEMA_DEFS.countersign, signer: getOrCreateKey("employer"), refUID: uid, recipient: req.worker,
        fields: [
          { name: "payEventUID", value: uid, type: "bytes32" },
          { name: "decision", value: decision, type: "uint8" },
          { name: "noteHash", value: ZeroHash, type: "bytes32" },
        ],
        onStage: (stage, d) => setActive({ uid, stage, txHash: d?.txHash }),
      });
      const item = req.items.find(i => i.uid === uid);
      const n = { ...done, [uid]: { uid: res.uid, decision, period: item?.period, amountCents: item?.amountCents, workerName: req.workerName, at: Date.now() } };
      setDone(n); try { localStorage.setItem("ll.employer.done", JSON.stringify(n)); } catch {}
      setTimeout(() => setActive(a => (a?.uid === uid ? null : a)), 1200);
      logEvent("employer_answered", { decision: decision === 1 ? "confirm" : "dispute" });
      push({ kind: "success", title: decision === 1 ? "Confirmed" : "Disputed", body: "Your answer is signed and recorded." });
    } catch (e) {
      setActive(null);
      const ue = e as { title: string; hint: string };
      push({ kind: "error", title: ue.title, body: ue.hint });
    }
  }

  if (req === null) return <Shell><div className="skeleton" style={{ height: 240, borderRadius: 14 }} /></Shell>;
  if (req === "bad") {
    const answered = Object.values(done).filter(d => d.period).sort((a, b) => (b.at || 0) - (a.at || 0));
    return (
      <Shell nav={<Pill tone="outline">Employer</Pill>}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
          <div><h1>Employer confirmations</h1><p className="muted" style={{ marginTop: 8 }}>Workers send you a link for each month they record. You confirm or dispute it here; your answer is signed by a key on this phone and becomes part of their record, and your evidence that you paid.</p></div>
          {answered.length === 0 ? (
            <div className="empty"><h3>No requests on this phone yet</h3><p>Open the link the worker sent you on WhatsApp. There is nothing to install.</p></div>
          ) : (
            <div className="ledger">
              <div className="ledger-head"><strong>Answered from this phone</strong><Pill tone="outline">{answered.length}</Pill></div>
              {answered.map(d => (
                <div key={d.uid} className="row" style={{ cursor: "default" }}>
                  <div><div className="row-title">{d.period ? periodLabel(d.period) : "Month"}</div><div className="row-sub"><span>{d.workerName}</span>{d.amountCents ? <span className="num">{sgd(d.amountCents)}</span> : null}{d.at ? <span className="faint">{new Date(d.at).toLocaleDateString("en-SG")}</span> : null}</div></div>
                  <div className="row-right"><Pill tone={d.decision === 1 ? "ok" : "bad"}>{d.decision === 1 ? "Confirmed" : "Disputed"}</Pill><a className="btn btn-ghost btn-sm" href={explorer.attestation(d.uid)} target="_blank" rel="noreferrer" aria-label="View on chain"><Icon name="link" size={14} /></a></div>
                </div>
              ))}
            </div>
          )}
          <p className="small muted"><a href="/help">How this works</a> · <a href="/privacy">Privacy</a></p>
        </div>
      </Shell>
    );
  }

  const pending = req.items.filter(i => !done[i.uid]);
  return (
    <Shell nav={<Pill tone="outline">Employer confirmation</Pill>}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
        <div>
          <h1>{req.workerName} asks you to confirm {req.items.length === 1 ? "a salary record" : `${req.items.length} salary records`}</h1>
          <p className="muted" style={{ marginTop: 8 }}>Each answer is signed from this phone and stored next to the month. Both of you can rely on it later. No app or account is needed.</p>
        </div>
        {!ready && <Notice kind="warn" title="Recording is not available right now">Your answers cannot be saved on this server yet.</Notice>}
        <div className="ledger">
          {req.items.map(it => {
            const d = done[it.uid];
            const a = active?.uid === it.uid ? active : null;
            return (
              <div key={it.uid}>
                <div className="row" style={{ cursor: "default" }}>
                  <div>
                    <div className="row-title">{periodLabel(it.period)}</div>
                    <div className="row-sub"><span className="num">{sgd(it.amountCents)}</span><span>· worker says {it.status === PAY_STATUS.UNPAID ? "not paid" : "paid"}</span></div>
                  </div>
                  <div className="row-right">
                    {d ? <Pill tone={d.decision === 1 ? "ok" : "bad"}><Icon name={d.decision === 1 ? "check" : "x"} size={12} />{d.decision === 1 ? "Confirmed" : "Disputed"}</Pill> : <Pill tone="warn" dot>Awaiting you</Pill>}
                  </div>
                </div>
                <div className="row-detail" style={{ borderBottom: "1px solid var(--line)" }}>
                  {a ? <Stages stage={a.stage} txHash={a.txHash} labels={{ preparing: "Preparing your answer (reading the chain, up to 15 s)", signing: "Signing on this phone", done: "Answer recorded" }} /> : d ? (
                    <div className="small"><a href={explorer.attestation(d.uid)} target="_blank" rel="noreferrer">Your signed answer <Icon name="link" size={12} /></a></div>
                  ) : (
                    <div className="actions" style={{ marginTop: 0 }}>
                      <Button variant="accent" disabled={!ready || !!active} onClick={() => decide(it.uid, DECISION.CONFIRM)} icon={<Icon name="check" />}>Confirm</Button>
                      <Button variant="danger" disabled={!ready || !!active} onClick={() => decide(it.uid, DECISION.DISPUTE)} icon={<Icon name="x" />}>Dispute</Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {pending.length === 0 && <Notice kind="ok" title="All done">Every month in this request has your answer. You can close this page.</Notice>}
        {pending.length === 0 && (
          <div className="panel panel-pad" style={{ display: "grid", gap: 8 }}>
            <strong>Your answers are now part of {req.workerName}'s record</strong>
            <p className="small muted">Each one is signed by the key on this phone and can be verified by anyone, which also protects you: a confirmed month is evidence that you paid. Employers, agencies and workers all use the same free tool.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><a className="btn" href="/help">How this works</a><a className="btn btn-ghost" href="/">About Ledgerline</a></div>
          </div>
        )}
        <p className="xs faint">Signing key on this phone: <span className="mono">{shortAddr(addr, 8)}</span>. Test network; no money moves.</p>
      </div>
    </Shell>
  );
}

export default function EmployerPage() {
  return <Suspense fallback={<Shell><div className="skeleton" style={{ height: 240, borderRadius: 14 }} /></Shell>}><EmployerInner /></Suspense>;
}
