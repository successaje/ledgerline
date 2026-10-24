"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Frame } from "@/components/worker/Frame";
import { PayPill, SubmissionPill, useEmployerLabel } from "@/components/worker/bits";
import { Button, LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { Stages } from "@/components/ui/Stages";
import { ShareSheet } from "@/components/ledger/ShareSheet";
import { PAY_STATUS, PROOF_METHOD, submissionOf } from "@/domain/types";
import { dateLabel, sgd, shortAddr } from "@/domain/format";
import { amounts, employerView, employerRequestItems } from "@/domain/paybook";
import { encodeEmployerRequest } from "@/domain/bundle";
import { CHAIN_NAME, SCHEMA_DEFS, explorer } from "@/services/chain";
import { useToast } from "@/hooks/useToast";
import { logEvent } from "@/services/analytics";
import { useT } from "@/i18n";

export default function RecordDetailPage() {
  const params = useParams<{ period: string }>();
  const period = Number(params.period);
  const router = useRouter();
  const { t, tn, monthLabel, lang } = useT();
  const { push } = useToast();
  const empLabel = useEmployerLabel();
  const [askUrl, setAskUrl] = useState<string | null>(null);
  const date = (ms: number) => new Date(ms).toLocaleDateString(lang === "en" ? "en-SG" : lang, { day: "numeric", month: "short", year: "numeric" });

  return (
    <Frame>{({ L, ledger, fastForward, ready, config, fail }) => {
      const r = ledger.records.find(x => x.period === period);
      if (!r) return <><Link href="/app/records" className="small"><Icon name="back" size={14} /> {t("rd_back")}</Link><Notice kind="info">{t("rd_not_found")}</Notice></>;
      const a = amounts(r, ledger.profile.salaryCents);
      const sub = submissionOf(r);
      const ev = employerView(r, ledger.profile.confirmWindowDays, fastForward);
      const act = L.activity?.period === period ? L.activity : null;
      const busy = Boolean(L.activity);

      const publish = async () => {
        logEvent("record_started");
        try { await L.record(period); logEvent("record_done"); push({ kind: "success", title: t("ap_recorded_title"), body: t("ap_recorded_text") }); }
        catch (e) { logEvent("record_failed"); fail(e); }
      };
      const check = async () => {
        const res = await L.checkSubmission(period);
        if (res === "pending") push({ kind: "info", title: t("ss_still_pending") });
      };
      const prove = async () => {
        try { await L.prove(period); logEvent("proof_done"); push({ kind: "success", title: t("ap_proof_title"), body: t("ap_proof_text") }); }
        catch (e) { logEvent("proof_failed"); fail(e); }
      };
      const ask = () => {
        if (!r.payEventUID) return;
        const req = encodeEmployerRequest({ worker: L.address, workerName: ledger.profile.name, employerLabel: ledger.profile.employerLabel, items: employerRequestItems(ledger, [period]) });
        setAskUrl(`${window.location.origin}/employer?c=${req}`);
        logEvent("employer_link_created", { months: 1 });
      };
      const proofText = r.proof ? (!r.proof.proofJson ? t("ll_proof_elsewhere") : r.proof.satisfied ? t("ll_proof_summary_none", { amount: sgd(a.expected), from: r.proof.window.from, to: r.proof.window.to }) : tn("ll_proof_summary_found", (() => { try { return JSON.parse(r.proof!.proofJson).extracted?.count ?? 1; } catch { return 1; } })(), { from: r.proof.window.from, to: r.proof.window.to })) : "";

      return (
        <>
          <Link href="/app/records" className="small" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="back" size={14} /> {t("rd_back")}</Link>
          <div className="page-head" style={{ marginBottom: 0 }}>
            <div><h1>{monthLabel(period, true)}</h1>{r.signedAt && sub === "confirmed" && <p className="small muted">{t("rd_recorded_on", { date: date(r.signedAt) })}</p>}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><PayPill status={r.status} /><SubmissionPill state={sub} /></div>
          </div>

          <section className="paybook">
            <div className="paybook-grid" style={{ marginTop: 0 }}>
              <div className="paybook-cell"><div className="k">{t("hm_expected")}</div><div className="v">{sgd(a.expected)}</div></div>
              <div className="paybook-cell"><div className="k">{t("hm_received")}</div><div className="v">{sgd(a.received)}</div>{r.receivedOn && <div className="note">{t("rd_received_on", { date: dateLabel(r.receivedOn) })}</div>}</div>
              <div className="paybook-cell"><div className="k">{t("hm_difference")}</div><div className={`v ${a.gap > 0 ? "diff-pos" : ""}`}>{sgd(a.gap)}</div><div className="note">{a.gap > 0 ? t("hm_short", { amount: sgd(a.gap) }) : t("hm_nothing_missing")}</div></div>
            </div>
            {r.note && <p style={{ marginTop: 14 }}><span className="small muted">{t("rd_note")}</span><br />{r.note}</p>}
          </section>

          {act && <section className="card"><Stages stage={act.stage} txHash={act.txHash} labels={act.kind === "proof" ? { preparing: t("st_proof_preparing"), signing: t("st_proof_signing"), done: t("st_proof_done") } : undefined} /></section>}

          <section className="card">
            <h2>{t(`st2_${sub}` as "st2_draft")}</h2>
            <p className="muted" style={{ marginTop: 4 }}>{t(`st2_${sub}_text` as "st2_draft_text")}</p>
            <div className="btn-row" style={{ marginTop: 12 }}>
              {(sub === "draft" || sub === "failed") && <>
                <Button variant="primary" disabled={busy || !ready} onClick={() => void publish()} icon={<Icon name="lock" />}>{sub === "failed" ? t("rd_retry") : t("rd_publish")}</Button>
                <LinkButton href={`/app/record?period=${period}`} icon={<Icon name="pencil" />}>{t("rd_edit_draft")}</LinkButton>
                <Button variant="danger" onClick={() => { if (confirm(t("rd_delete_draft_confirm"))) { L.removeDraft(period); router.replace("/app/records"); } }} icon={<Icon name="x" />}>{t("rd_delete_draft")}</Button>
              </>}
              {(sub === "unknown" || sub === "submitted") && !act && <Button variant="primary" onClick={() => void check()} icon={<Icon name="refresh" />}>{t("hm_check_status")}</Button>}
              {sub === "confirmed" && <>
                {!r.countersign && <Button variant="primary" onClick={ask} icon={<Icon name="whatsapp" />}>{t("rd_ask")}</Button>}
                <LinkButton href={`/app/record?period=${period}&correct=1`} icon={<Icon name="pencil" />}>{t("rd_correct")}</LinkButton>
                <LinkButton href={`/app/share?p=${period}`} icon={<Icon name="share" />}>{t("rd_share")}</LinkButton>
              </>}
            </div>
          </section>

          {sub === "confirmed" && (
            <section className="card">
              <h2>{t("rd_employer")}</h2>
              <p style={{ marginTop: 4 }}>{ev.kind === "none" ? t("emp_none") : empLabel(ev)}</p>
              {(ev.kind === "acknowledged" || ev.kind === "disagreed") && <p className="small muted">{t("rd_employer_key", { key: shortAddr(ev.key, 8) })} · {date(ev.at)} · <a href={explorer.attestation(r.countersign!.uid)} target="_blank" rel="noreferrer">{t("rd_view_chain")}</a></p>}
              {ev.kind === "no_response" && <p className="small muted" style={{ marginTop: 4 }}>{t("hm_noresp_text")}</p>}
            </section>
          )}

          {sub === "confirmed" && (
            <section className="card">
              <h2>{t("rd_evidence")}</h2>
              {r.proof ? (
                <>
                  <p style={{ marginTop: 4 }}>{proofText}</p>
                  <p className="small muted" style={{ marginTop: 4 }}>{r.proof.method === PROOF_METHOD.ZKTLS ? t("ll_proof_zktls") : t("ev_demo")} · {t("ev_demo_text")} · <a href={explorer.attestation(r.proof.uid)} target="_blank" rel="noreferrer">{t("rd_view_chain")}</a></p>
                </>
              ) : (
                <>
                  <p className="muted" style={{ marginTop: 4 }}>{t("rd_evidence_text")}</p>
                  {r.status !== PAY_STATUS.PAID && <div style={{ marginTop: 12 }}><Button disabled={busy || !ready} onClick={() => void prove()} icon={<Icon name="bank" />}>{t("rd_add_evidence")}</Button></div>}
                </>
              )}
            </section>
          )}

          <details className="acc">
            <summary>{t("rd_technical")}</summary>
            <div className="acc-body">
              <dl className="kv2">
                <dt>{t("rd_network")}</dt><dd>{CHAIN_NAME} ({t("nv_env")})</dd>
                <dt>{t("rd_signer")}</dt><dd className="mono">{L.address}</dd>
                {r.payEventUID && <><dt>{t("rd_uid")}</dt><dd className="mono"><a href={explorer.attestation(r.payEventUID)} target="_blank" rel="noreferrer">{r.payEventUID}</a></dd></>}
                {(r.payEventTx || r.submission?.txHash) && <><dt>{t("rd_tx")}</dt><dd className="mono"><a href={explorer.tx(r.payEventTx || r.submission!.txHash!)} target="_blank" rel="noreferrer">{r.payEventTx || r.submission!.txHash}</a></dd></>}
                <dt>{t("rd_schema")}</dt><dd className="mono">{r.payEventSchema === 2 ? SCHEMA_DEFS.payEventV2 : SCHEMA_DEFS.payEvent}{(r.payEventSchema === 2 ? config?.schemas.payEventV2 : config?.schemas.payEvent) ? <><br />{r.payEventSchema === 2 ? config!.schemas.payEventV2 : config!.schemas.payEvent}</> : null}</dd>
                {r.supersedes && <><dt>{t("rd_supersedes")}</dt><dd className="mono"><a href={explorer.attestation(r.supersedes)} target="_blank" rel="noreferrer">{r.supersedes}</a></dd></>}
              </dl>
              {r.previous && r.previous.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <strong>{t("rd_previous")}</strong>
                  <p className="small muted">{t("rd_previous_text")}</p>
                  <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {[...r.previous].reverse().map(p => <li key={p.uid}>{p.signedAt ? date(p.signedAt) : ""} · {p.status === PAY_STATUS.UNPAID ? t("pay_unpaid") : p.status === PAY_STATUS.PARTIAL ? t("pay_partial") : t("pay_paid")} · {sgd(p.amountCents)} · <a className="mono" href={explorer.attestation(p.uid)} target="_blank" rel="noreferrer">{shortAddr(p.uid, 8)}</a></li>)}
                  </ul>
                </div>
              )}
            </div>
          </details>

          <ShareSheet open={askUrl !== null} onClose={() => setAskUrl(null)} title={t("sh_emp_title")} url={askUrl} intro={t("sh_emp_intro")} whatsappText={t("sh_emp_wa")} openLabel={t("sh_emp_open")} />
        </>
      );
    }}</Frame>
  );
}
