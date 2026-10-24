"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Frame } from "@/components/worker/Frame";
import { useLedgerCtx } from "@/components/worker/LedgerContext";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, MoneyInput, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { Stages } from "@/components/ui/Stages";
import { PAY_STATUS, submissionOf, type PayStatus } from "@/domain/types";
import { currentPeriod, sgd, shortAddr } from "@/domain/format";
import { homePeriod } from "@/domain/paybook";
import { hashJson, idFromAddress } from "@/domain/ids";
import { CHAIN_NAME } from "@/services/chain";
import { useToast } from "@/hooks/useToast";
import { logEvent } from "@/services/analytics";
import { useT } from "@/i18n";

type Step = 1 | 2 | 3 | 4;
type Draft = { period: number; status: PayStatus; expected: string; received: string; receivedOn: string; note: string };

function Flow() {
  const { t, monthLabel, lang } = useT();
  const sp = useSearchParams();
  const router = useRouter();
  const { push } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [d, setD] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<"form" | "publishing" | "done" | "failed" | "unknown">("form");
  const wantPeriod = sp.get("period") ? Number(sp.get("period")) : null;
  const correcting = sp.get("correct") === "1";
  const months = useMemo(() => (lang === "en" ? "January,February,March,April,May,June,July,August,September,October,November,December" : t("months_long")).split(","), [lang, t]);
  const { L: L0 } = useLedgerCtx();
  const ledger0 = L0.ledger;
  useEffect(() => {
    if (d || !ledger0) return;
    const period = wantPeriod ?? homePeriod(ledger0);
    const ex = ledger0.records.find(r => r.period === period);
    setD({
      period,
      status: ex?.status ?? PAY_STATUS.PAID,
      expected: String((ex?.expectedCents ?? ledger0.profile.salaryCents) / 100),
      received: ex && ex.status === PAY_STATUS.PARTIAL ? String(ex.amountCents / 100) : "",
      receivedOn: ex?.receivedOn ?? "",
      note: ex?.note ?? "",
    });
    if (wantPeriod && !correcting && ex && submissionOf(ex) !== "confirmed") setStep(2);
  }, [d, ledger0, wantPeriod, correcting]);

  return (
    <Frame hideNav={phase !== "form"}>{({ L, ledger, ready, fail, config }) => {
      if (!d) return null;
      const existing = ledger.records.find(r => r.period === d.period);
      const existingConfirmed = existing ? submissionOf(existing) === "confirmed" : false;
      const isCorrection = existingConfirmed;
      const expectedCents = Math.round(parseFloat(d.expected || "0") * 100);
      const receivedCents = d.status === PAY_STATUS.PAID ? expectedCents : d.status === PAY_STATUS.UNPAID ? 0 : Math.round(parseFloat(d.received || "0") * 100);
      const act = L.activity?.period === d.period ? L.activity : null;
      const busy = Boolean(L.activity);
      const y = Math.floor(d.period / 100), m = d.period % 100;
      const years = [y - 2, y - 1, y, y + 1].filter(v => v <= Math.floor(currentPeriod() / 100) + 0).filter((v, i, a) => a.indexOf(v) === i);
      const setPeriod = (yy: number, mm: number) => setD({ ...d, period: yy * 100 + mm });
      const future = d.period > currentPeriod();

      const validate = (s: Step) => {
        const e: Record<string, string> = {};
        if (s === 1 && future) e.period = t("rf_future");
        if (s === 2) {
          if (!Number.isFinite(expectedCents) || expectedCents <= 0) e.expected = t("rf_err_expected");
          if (d.status === PAY_STATUS.PARTIAL) {
            if (!d.received || !Number.isFinite(receivedCents)) e.received = t("rf_err_received");
            else if (!(receivedCents > 0 && receivedCents < expectedCents)) e.received = t("rf_err_partial_range");
          }
        }
        setErrors(e);
        return Object.keys(e).length === 0;
      };
      const next = () => { if (validate(step)) { setStep((step + 1) as Step); window.scrollTo({ top: 0 }); } };
      const back = () => { if (step === 1) router.back(); else setStep((step - 1) as Step); };
      const save = (status: PayStatus = d.status) => {
        const p = { status, amountCents: status === PAY_STATUS.UNPAID ? 0 : status === PAY_STATUS.PAID ? expectedCents : receivedCents, expectedCents, note: d.note || undefined, receivedOn: d.receivedOn || undefined };
        if (existing) L.updateMonth(d.period, p); else L.addMonth(d.period, status, p.amountCents, p.note);
        if (!existing) L.updateMonth(d.period, { expectedCents, receivedOn: p.receivedOn });
        logEvent("month_edited");
      };
      const saveDraft = () => { save(); push({ kind: "success", title: t("ap_draft_saved"), body: t("ap_draft_saved_text") }); router.push(`/app/records/${d.period}`); };
      const publish = async () => {
        if (!consent) return;
        save();
        setPhase("publishing");
        logEvent("record_started", { correction: isCorrection });
        try {
          await L.record(d.period, d.status, receivedCents, d.note || undefined, { expectedCents, receivedOn: d.receivedOn || undefined });
          logEvent("record_done"); setPhase("done");
        } catch (e) {
          logEvent("record_failed");
          const rec = L.ledger?.records.find(r => r.period === d.period);
          setPhase(rec?.submission?.state === "unknown" ? "unknown" : "failed");
          fail(e);
        }
      };
      const check = async () => {
        const res = await L.checkSubmission(d.period);
        if (res === "confirmed") setPhase("done"); else if (res === "failed") setPhase("failed"); else push({ kind: "info", title: t("ss_still_pending") });
      };

      const v2 = Boolean(config?.schemas.payEventV2);
      const payload = {
        [t("rf_pl_period")]: d.period,
        ...(v2 ? { [t("rf_pl_expected")]: expectedCents } : {}),
        [t("rf_pl_amount")]: receivedCents,
        [t("rf_pl_status")]: `${d.status} (${d.status === PAY_STATUS.PAID ? t("pay_paid") : d.status === PAY_STATUS.PARTIAL ? t("pay_partial") : t("pay_unpaid")})`,
        ...(v2 && existing?.payEventUID ? { [t("rf_pl_supersedes")]: shortAddr(existing.payEventUID, 10) } : {}),
        [t("rf_pl_worker")]: shortAddr(idFromAddress(L.address || "0x0000000000000000000000000000000000000000"), 10),
        [t("rf_pl_employer")]: shortAddr(ledger.profile.employerId, 10),
        [t("rf_pl_detail")]: shortAddr(hashJson({ worker: ledger.profile.name, employer: ledger.profile.employerLabel, note: d.note || "", expectedCents, receivedOn: d.receivedOn || "", supersedes: existing?.payEventUID || "" }), 10),
        [t("rf_pl_network")]: `${CHAIN_NAME} (${t("nv_env")})`,
      };

      if (phase !== "form") {
        const title = phase === "publishing" ? t("ss_title", { month: monthLabel(d.period, true) }) : phase === "done" ? t("ss_done_title", { month: monthLabel(d.period, true) }) : phase === "unknown" ? t("ss_unknown_title", { month: monthLabel(d.period, true) }) : t("ss_failed_title", { month: monthLabel(d.period, true) });
        return (
          <div className="stack">
            <h1>{title}</h1>
            {act && <section className="card"><Stages stage={act.stage} txHash={act.txHash} /></section>}
            {phase === "done" && <Notice kind="ok">{t("ss_done_text", { chain: CHAIN_NAME })}</Notice>}
            {phase === "unknown" && <Notice kind="warn">{t("ss_unknown_text")}</Notice>}
            {phase === "failed" && <Notice kind="error" title={t("st2_failed")}>{t("st2_failed_text")}</Notice>}
            <div className="btn-row">
              {phase === "done" && <><LinkButton variant="primary" size="lg" href={`/app/records/${d.period}`} icon={<Icon name="arrow" />}>{t("ss_view")}</LinkButton><LinkButton size="lg" href="/app">{t("ss_home")}</LinkButton></>}
              {phase === "unknown" && <><Button variant="primary" size="lg" onClick={() => void check()} icon={<Icon name="refresh" />}>{t("hm_check_status")}</Button><LinkButton size="lg" href="/app">{t("ss_home")}</LinkButton></>}
              {phase === "failed" && <><Button variant="primary" size="lg" disabled={busy || !ready} onClick={() => { setPhase("form"); setStep(4); }} icon={<Icon name="refresh" />}>{t("rd_retry")}</Button><LinkButton size="lg" href={`/app/records/${d.period}`}>{t("rd_keep_draft")}</LinkButton></>}
            </div>
          </div>
        );
      }

      const stepTitle = [t("rf_s1"), t("rf_s2"), t("rf_s3"), t("rf_s4")][step - 1];
      return (
        <form onSubmit={e => { e.preventDefault(); if (step < 4) next(); }} noValidate className="stack">
          <div className="flow-head">
            <div>
              <div className="steps"><span className="step-n">{t("rf_step", { n: step })}</span><span className="sep">·</span><span>{stepTitle}</span></div>
              <h1>{isCorrection ? t("rf_title_correct", { month: monthLabel(d.period, true) }) : t("rf_title_new")}</h1>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => router.push(existing ? `/app/records/${d.period}` : "/app")} icon={<Icon name="x" />} aria-label={t("rf_cancel")}><span className="hide-sm">{t("rf_cancel")}</span></Button>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="error-summary" role="alert">
              <strong>{t("er_unknown_title")}</strong>
              <ul>{Object.entries(errors).map(([k, v]) => <li key={k}><a href={`#f-${k}`}>{v}</a></li>)}</ul>
            </div>
          )}

          {step === 1 && (
            <section className="card stack">
              <h2>{t("rf_month")}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field id="f-period" label={t("rf_month_label")}><select id="f-period" className="input" value={m} onChange={e => setPeriod(y, Number(e.target.value))}>{months.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></Field>
                <Field id="f-year" label={t("rf_year_label")}><select id="f-year" className="input" value={y} onChange={e => setPeriod(Number(e.target.value), m)}>{years.map(v => <option key={v} value={v}>{v}</option>)}</select></Field>
              </div>
              {existing && existingConfirmed && <Notice kind="warn">{t("rf_exists", { month: monthLabel(d.period, true) })}</Notice>}
              {existing && !existingConfirmed && <Notice kind="info">{t("rf_exists_draft", { month: monthLabel(d.period, true) })}</Notice>}
              {future && <Notice kind="error">{t("rf_future")}</Notice>}
            </section>
          )}

          {step === 2 && (
            <section className="card stack">
              <h2>{t("rf_pay_q", { month: monthLabel(d.period, true) })}</h2>
              <div className="choice" role="radiogroup" aria-label={t("rf_s2")}>
                {([PAY_STATUS.PAID, PAY_STATUS.PARTIAL, PAY_STATUS.UNPAID] as PayStatus[]).map(s => (
                  <label key={s}>
                    <input type="radio" name="status" checked={d.status === s} onChange={() => setD({ ...d, status: s })} />
                    <span><span className="choice-title">{s === PAY_STATUS.PAID ? t("pay_paid") : s === PAY_STATUS.PARTIAL ? t("pay_partial") : t("pay_unpaid")}</span><br /><span className="choice-sub">{s === PAY_STATUS.PAID ? t("rf_paid_sub") : s === PAY_STATUS.PARTIAL ? t("rf_partial_sub") : t("rf_unpaid_sub")}</span></span>
                  </label>
                ))}
              </div>
              <Field id="f-expected" label={t("rf_expected")} hint={t("rf_expected_hint")} error={errors.expected}><MoneyInput id="f-expected" value={d.expected} onChange={e => setD({ ...d, expected: e.target.value })} aria-invalid={!!errors.expected} /></Field>
              {d.status === PAY_STATUS.PARTIAL && <Field id="f-received" label={t("rf_received")} hint={t("rf_received_hint")} error={errors.received}><MoneyInput id="f-received" value={d.received} onChange={e => setD({ ...d, received: e.target.value })} aria-invalid={!!errors.received} /></Field>}
              {d.status !== PAY_STATUS.UNPAID && <Field id="f-on" label={t("rf_received_on")}><TextInput id="f-on" type="date" value={d.receivedOn} onChange={e => setD({ ...d, receivedOn: e.target.value })} max={new Date().toISOString().slice(0, 10)} /></Field>}
            </section>
          )}

          {step === 3 && (
            <section className="card stack">
              <h2>{t("rf_support_q")}</h2>
              <Field id="f-note" label={t("rf_note")} hint={t("rf_note_hint")}><textarea id="f-note" className="input" style={{ minHeight: 96, padding: 12, resize: "vertical" }} value={d.note} onChange={e => setD({ ...d, note: e.target.value })} placeholder={t("rf_note_placeholder")} maxLength={500} /></Field>
              <Notice kind="info" title={t("rf_local_title")}>{t("rf_local_text")}</Notice>
            </section>
          )}

          {step === 4 && (
            <>
              <section className="card">
                <h2>{t("rf_review_q")}</h2>
                <div className="review" style={{ marginTop: 8 }}>
                  <div className="review-row"><span className="k">{t("rf_s1")}</span><span className="v">{monthLabel(d.period, true)}</span></div>
                  <div className="review-row"><span className="k">{t("rf_s2")}</span><span className="v">{d.status === PAY_STATUS.PAID ? t("pay_paid") : d.status === PAY_STATUS.PARTIAL ? t("pay_partial") : t("pay_unpaid")}</span></div>
                  <div className="review-row"><span className="k">{t("hm_expected")}</span><span className="v">{sgd(expectedCents)}</span></div>
                  <div className="review-row"><span className="k">{t("hm_received")}</span><span className="v">{sgd(receivedCents)}</span></div>
                  <div className="review-row"><span className="k">{t("hm_difference")}</span><span className="v">{sgd(Math.max(0, expectedCents - receivedCents))}</span></div>
                  {d.receivedOn && <div className="review-row"><span className="k">{t("rf_received_on")}</span><span className="v">{d.receivedOn}</span></div>}
                  {d.note && <div className="review-row"><span className="k">{t("rf_note")}</span><span className="v" style={{ fontWeight: 400 }}>{d.note}</span></div>}
                </div>
                <div className="btn-row" style={{ marginTop: 8 }}><Button type="button" size="sm" variant="ghost" onClick={() => setStep(2)} icon={<Icon name="pencil" size={14} />}>{t("rf_s2")}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setStep(3)} icon={<Icon name="pencil" size={14} />}>{t("rf_s3")}</Button></div>
              </section>
              {isCorrection && <Notice kind="warn">{t("rf_correction_note", { month: monthLabel(d.period, true) })}</Notice>}
              <section className="card stack-sm">
                <h2>{t("rf_will_publish")}</h2>
                <p className="small muted">{t("rf_will_publish_text", { chain: CHAIN_NAME })}</p>
                <div className="payload" aria-label={t("rf_will_publish")}>{Object.entries(payload).map(([k, v]) => <div key={k}><span className="pk">{k}: </span>{String(v)}</div>)}</div>
                <p className="small muted">{v2 ? t("rf_pl_not_v2") : t("rf_pl_not")}</p>
              </section>
              {!ready && <Notice kind="warn">{t("rf_not_ready")}</Notice>}
              <label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>{t("rf_consent", { chain: CHAIN_NAME })}</span></label>
            </>
          )}

          <div className={`form-actions ${step === 4 ? "three" : ""}`}>
            <Button type="button" onClick={back} icon={<Icon name="back" />}>{t("rf_back")}</Button>
            {step < 4 && <Button type="submit" variant="primary" icon={<Icon name="arrow" />}>{t("rf_next")}</Button>}
            {step === 4 && <>
              <Button type="button" onClick={saveDraft}>{t("rf_save_draft")}</Button>
              <Button type="button" variant="primary" disabled={!consent || !ready || busy} onClick={() => void publish()} icon={<Icon name="lock" />}>{isCorrection ? t("rf_publish_correction") : t("rf_publish")}</Button>
            </>}
          </div>
        </form>
      );
    }}</Frame>
  );
}

export default function RecordFlowPage() {
  return <Suspense fallback={null}><Flow /></Suspense>;
}
