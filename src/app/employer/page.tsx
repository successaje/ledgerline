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
import { CHAIN_NAME, SCHEMA_DEFS, explorer } from "@/services/chain";
import { getOrCreateKey } from "@/services/keys";
import { useConfig } from "@/hooks/useConfig";
import { useToast } from "@/hooks/useToast";
import { logEvent } from "@/services/analytics";

type Done = Record<string, { uid: string; decision: number; period?: number; amountCents?: number; workerName?: string; at?: number }>;

const payLabel = (status: number) => (status === PAY_STATUS.UNPAID ? "Not paid" : status === PAY_STATUS.PARTIAL ? "Partly paid" : "Paid in full");
const dateOf = (ms: number) => new Date(ms).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });

/**
 * The employer's page. One response per month: Acknowledge (agree with the worker's statement) or Disagree.
 * The response is signed by a key on this phone and recorded next to the worker's month. It is not a payslip
 * and it does not verify the employer's identity.
 */
function EmployerInner() {
  const sp = useSearchParams();
  const { config, ready } = useConfig();
  const { push } = useToast();
  const [req, setReq] = useState<EmployerRequest | null | "bad">(null);
  const [done, setDone] = useState<Done>({});
  const [active, setActive] = useState<{ uid: string; stage: TxStage; txHash?: string } | null>(null);
  const [confirming, setConfirming] = useState<{ uid: string; decision: 1 | 2 } | null>(null);
  const [addr, setAddr] = useState("");

  useEffect(() => {
    const c = sp.get("c");
    try { setReq(c ? decodeEmployerRequest(c) : "bad"); } catch { setReq("bad"); }
    setAddr(getOrCreateKey("employer").address);
    try { setDone(JSON.parse(localStorage.getItem("ll.employer.done") || "{}")); } catch {}
  }, [sp]);

  async function decide(uid: string, decision: 1 | 2) {
    if (!config || req === null || req === "bad") return;
    setConfirming(null);
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
      logEvent("employer_answered", { decision: decision === 1 ? "acknowledge" : "disagree" });
      push({ kind: "success", title: decision === 1 ? "Acknowledged" : "Disagreement recorded", body: "Your response is signed and recorded on the test network." });
    } catch (e) {
      setActive(null);
      const ue = e as { title: string; hint: string };
      push({ kind: "error", title: ue.title, body: ue.hint });
    }
  }

  const nav = <span className="env-label" title={`Responses are written to ${CHAIN_NAME}, a test network.`}>Test network<span className="hide-xs"> · {CHAIN_NAME}</span></span>;
  if (req === null) return <Shell nav={nav}><div className="skeleton" style={{ height: 240, borderRadius: 16 }} /></Shell>;

  if (req === "bad") {
    const answered = Object.values(done).filter(d => d.period).sort((a, b) => (b.at || 0) - (a.at || 0));
    return (
      <Shell nav={nav}>
        <div className="stack" style={{ maxWidth: 560, margin: "0 auto" }}>
          <div><h1>Employer responses</h1><p className="muted" style={{ marginTop: 8 }}>Workers send you a link for each month they record. You acknowledge or disagree here. Your response is signed by a key on this phone and recorded next to their month.</p></div>
          {answered.length === 0 ? (
            <div className="card"><div className="empty"><h3>No requests on this phone yet</h3><p>Open the link the worker sent you. There is nothing to install.</p></div></div>
          ) : (
            <div className="card">
              <div className="page-head" style={{ marginBottom: 4 }}><strong>Responded from this phone</strong><Pill tone="neutral">{answered.length}</Pill></div>
              {answered.map(d => (
                <div key={d.uid} className="mrow">
                  <div><div className="mrow-title">{d.period ? periodLabel(d.period, true) : "Month"}</div><div className="mrow-sub"><span>{d.workerName}</span>{d.amountCents ? <span>{sgd(d.amountCents)}</span> : null}{d.at ? <span>{dateOf(d.at)}</span> : null}</div></div>
                  <div className="mrow-state"><Pill tone={d.decision === 1 ? "ok" : "bad"}>{d.decision === 1 ? "Acknowledged" : "Disagreed"}</Pill><a className="btn btn-ghost btn-sm" href={explorer.attestation(d.uid)} target="_blank" rel="noreferrer" aria-label="View on the test network"><Icon name="link" size={14} /></a></div>
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
    <Shell nav={nav}>
      <div className="stack" style={{ maxWidth: 560, margin: "0 auto" }}>
        <div>
          <h1>{req.workerName} recorded {req.items.length === 1 ? "a month of pay" : `${req.items.length} months of pay`} and asks for your response</h1>
          <p className="muted" style={{ marginTop: 8 }}>For each month, you can acknowledge the statement or disagree with it. Your response is signed from this phone and recorded next to the month on {CHAIN_NAME}, a public test network. It is not a payslip, it does not move money, and it does not verify who you are.</p>
        </div>
        {config && !ready && <Notice kind="warn" title="Responding is not available right now">Your responses cannot be recorded on this server yet.</Notice>}
        <div className="stack">
          {req.items.map(it => {
            const d = done[it.uid];
            const a = active?.uid === it.uid ? active : null;
            const c = confirming?.uid === it.uid ? confirming : null;
            const overdue = it.respondBy ? Date.now() > it.respondBy : false;
            return (
              <section className="card stack-sm" key={it.uid} aria-labelledby={`m-${it.uid}`}>
                <div className="page-head" style={{ marginBottom: 0 }}>
                  <h2 id={`m-${it.uid}`}>{periodLabel(it.period, true)}</h2>
                  {d ? <Pill tone={d.decision === 1 ? "ok" : "bad"}><Icon name={d.decision === 1 ? "check" : "x"} size={14} />{d.decision === 1 ? "Acknowledged" : "Disagreed"}</Pill> : <Pill tone={overdue ? "bad" : "warn"}><Icon name="clock" size={14} />{overdue ? "Response window passed" : "Awaiting your response"}</Pill>}
                </div>
                <div className="review">
                  <div className="review-row"><span className="k">Worker recorded</span><span className="v">{payLabel(it.status)}</span></div>
                  {typeof it.expectedCents === "number" && <div className="review-row"><span className="k">Expected</span><span className="v">{sgd(it.expectedCents)}</span></div>}
                  <div className="review-row"><span className="k">Recorded received</span><span className="v">{sgd(it.status === PAY_STATUS.UNPAID ? 0 : it.amountCents)}</span></div>
                  {it.respondBy && !d && <div className="review-row"><span className="k">Response requested by</span><span className="v">{dateOf(it.respondBy)}</span></div>}
                </div>
                {a ? <Stages stage={a.stage} txHash={a.txHash} labels={{ preparing: "Preparing your response (reading the test network, up to 15 s)", signing: "Signing on this phone", done: "Response recorded" }} /> : d ? (
                  <p className="small"><a href={explorer.attestation(d.uid)} target="_blank" rel="noreferrer">Your signed response on the test network <Icon name="link" size={12} /></a></p>
                ) : c ? (
                  <div className="stack-sm">
                    <Notice kind={c.decision === 1 ? "info" : "warn"} title={c.decision === 1 ? `Acknowledge ${periodLabel(it.period)}?` : `Disagree with ${periodLabel(it.period)}?`}>
                      {c.decision === 1
                        ? `You agree that the worker recorded this month correctly: ${payLabel(it.status).toLowerCase()}, ${sgd(it.status === PAY_STATUS.UNPAID ? 0 : it.amountCents)} received. This will be signed from this phone and published to ${CHAIN_NAME}. It cannot be deleted.`
                        : `You disagree with the worker's statement for this month. This will be signed from this phone and published to ${CHAIN_NAME}. It cannot be deleted. It does not say what you think happened; talk to the worker about that.`}
                    </Notice>
                    <div className="btn-row">
                      <Button variant={c.decision === 1 ? "primary" : "danger"} disabled={!ready || !!active} onClick={() => decide(it.uid, c.decision)} icon={<Icon name={c.decision === 1 ? "check" : "x"} />}>{c.decision === 1 ? "Yes, acknowledge" : "Yes, disagree"}</Button>
                      <Button variant="ghost" onClick={() => setConfirming(null)}>Back</Button>
                    </div>
                  </div>
                ) : (
                  <div className="btn-row">
                    <Button variant="primary" disabled={!ready || !!active} onClick={() => setConfirming({ uid: it.uid, decision: DECISION.CONFIRM })} icon={<Icon name="check" />}>Acknowledge</Button>
                    <Button variant="danger" disabled={!ready || !!active} onClick={() => setConfirming({ uid: it.uid, decision: DECISION.DISPUTE })} icon={<Icon name="x" />}>Disagree</Button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
        {pending.length === 0 && <Notice kind="ok" title="All done">Every month in this request has your response. You can close this page.</Notice>}
        <details className="acc">
          <summary>What acknowledging means</summary>
          <div className="acc-body stack-sm small muted">
            <p>Acknowledging means you agree with what the worker recorded for that month. Disagreeing means you do not. Either way, your response is signed by a key on this phone and stored next to the worker's record where anyone with the worker's shared link can see it.</p>
            <p>A response is not a payslip, not a contract, and not a verification of your identity. It is a record that this phone responded. If you do not respond by the requested date, the worker's record shows "no response by the deadline". That is not a finding of wrongdoing.</p>
            <p>Signing key on this phone: <span className="mono">{shortAddr(addr, 8)}</span>. Test network only; no money moves.</p>
          </div>
        </details>
      </div>
    </Shell>
  );
}

export default function EmployerPage() {
  return <Suspense fallback={<Shell><div className="skeleton" style={{ height: 240, borderRadius: 16 }} /></Shell>}><EmployerInner /></Suspense>;
}
