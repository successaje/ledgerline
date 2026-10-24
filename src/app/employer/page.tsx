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

type Done = Record<string, { uid: string; decision: number }>;

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
      const n = { ...done, [uid]: { uid: res.uid, decision } };
      setDone(n); try { localStorage.setItem("ll.employer.done", JSON.stringify(n)); } catch {}
      setTimeout(() => setActive(a => (a?.uid === uid ? null : a)), 1200);
      push({ kind: "success", title: decision === 1 ? "Confirmed" : "Disputed", body: "Your answer is signed and recorded." });
    } catch (e) {
      setActive(null);
      const ue = e as { title: string; hint: string };
      push({ kind: "error", title: ue.title, body: ue.hint });
    }
  }

  if (req === null) return <Shell><div className="skeleton" style={{ height: 240, borderRadius: 14 }} /></Shell>;
  if (req === "bad") return <Shell><div className="empty"><h3>This link is incomplete</h3><p>Ask the worker to send the confirmation link again from their Ledgerline app.</p></div></Shell>;

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
                  {a ? <Stages stage={a.stage} txHash={a.txHash} labels={{ preparing: "Preparing your answer", signing: "Signing on this phone", done: "Answer recorded" }} /> : d ? (
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
