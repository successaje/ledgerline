"use client";
import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Frame } from "@/components/worker/Frame";
import { useLedgerCtx } from "@/components/worker/LedgerContext";
import { MonthRow, PayPill, SubmissionPill } from "@/components/worker/bits";
import { Button, LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { sgd } from "@/domain/format";
import { submissionOf } from "@/domain/types";
import { amounts, attention, homePeriod } from "@/domain/paybook";
import { useToast } from "@/hooks/useToast";
import { logEvent } from "@/services/analytics";
import { useT } from "@/i18n";

function SampleLoader() {
  const { L } = useLedgerCtx();
  const sp = useSearchParams();
  const router = useRouter();
  const done = useRef(false);
  const loaded = L.ledger !== undefined;
  const { loadSample } = L;
  useEffect(() => {
    if (done.current || !loaded || sp.get("sample") !== "1") return;
    done.current = true;
    logEvent("sample_loaded");
    loadSample();
    router.replace("/app");
  }, [sp, loaded, loadSample, router]);
  return null;
}

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}><SampleLoader /></Suspense>
      <Frame>{({ L, ledger, fastForward, ready }) => <Home L={L} ledger={ledger} fastForward={fastForward} ready={ready} />}</Frame>
    </>
  );
}

function Home({ L, ledger, fastForward, ready }: { L: ReturnType<typeof useLedgerCtx>["L"]; ledger: NonNullable<ReturnType<typeof useLedgerCtx>["L"]["ledger"]>; fastForward: boolean; ready: boolean }) {
  const { t, tn, monthLabel } = useT();
  const { push } = useToast();
  const period = homePeriod(ledger);
  const rec = ledger.records.find(r => r.period === period);
  const a = rec ? amounts(rec, ledger.profile.salaryCents) : null;
  const items = attention(ledger, fastForward);
  const recent = [...ledger.records].sort((x, y) => y.period - x.period).slice(0, 3);
  const busy = Boolean(L.activity);

  const checkUnknown = async (periods: number[]) => {
    for (const p of periods) {
      const r = await L.checkSubmission(p);
      if (r === "confirmed") push({ kind: "success", title: t("st2_confirmed"), body: monthLabel(p, true) });
      else if (r === "failed") push({ kind: "error", title: t("st2_failed"), body: monthLabel(p, true) });
      else push({ kind: "info", title: t("ss_still_pending") });
    }
  };

  return (
    <>
      <div className="page-head"><div><p className="small muted">{t("hm_hi", { name: ledger.profile.name })}</p><h1>{t("nv_home")}</h1></div></div>

      <section className="paybook" aria-labelledby="pb-month">
        <div className="paybook-head">
          <h2 className="paybook-month" id="pb-month">{monthLabel(period, true)}</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {rec && <PayPill status={rec.status} />}
            {rec && submissionOf(rec) !== "confirmed" && <SubmissionPill state={submissionOf(rec)} />}
          </div>
        </div>
        <div className="paybook-grid">
          <div className="paybook-cell"><div className="k">{t("hm_expected")}</div><div className="v">{sgd(a ? a.expected : ledger.profile.salaryCents)}</div></div>
          <div className="paybook-cell"><div className="k">{t("hm_received")}</div><div className="v">{a ? sgd(a.received) : "—"}</div>{!a && <div className="note">{t("hm_not_recorded")}</div>}</div>
          <div className="paybook-cell"><div className="k">{t("hm_difference")}</div><div className={`v ${a && a.gap > 0 ? "diff-pos" : ""}`}>{a ? sgd(a.gap) : "—"}</div><div className="note">{a ? (a.gap > 0 ? t("hm_short", { amount: sgd(a.gap) }) : t("hm_nothing_missing")) : t("hm_not_recorded")}</div></div>
        </div>
        <div className="paybook-action">
          {rec
            ? <LinkButton variant="primary" size="lg" href={`/app/records/${period}`} icon={<Icon name="arrow" />}>{t("hm_view_record")}</LinkButton>
            : <LinkButton variant="primary" size="lg" href={`/app/record?period=${period}`} icon={<Icon name="plus" />}>{t("hm_record_month", { month: monthLabel(period) })}</LinkButton>}
        </div>
      </section>

      <section className="card" aria-labelledby="attn-h">
        <h2 id="attn-h">{t("hm_attention")}</h2>
        {items.length === 0 ? <p className="muted" style={{ marginTop: 8 }}>{t("hm_all_clear")}</p> : (
          <div style={{ marginTop: 4 }}>
            {items.map(it => {
              if (it.kind === "backup") return <div className="attn" key="backup"><div><div className="t">{t("hm_backup_title")}</div><div className="s">{t("hm_backup_text")}</div></div><LinkButton size="sm" href="/app/settings#backup">{t("hm_backup_cta")}</LinkButton></div>;
              if (it.kind === "unknown") return <div className="attn" key="unknown"><div><div className="t">{tn("hm_unknown", it.periods.length)}</div><div className="s">{t("hm_unknown_text")}</div></div><Button size="sm" onClick={() => void checkUnknown(it.periods)} icon={<Icon name="refresh" size={14} />}>{t("hm_check_status")}</Button></div>;
              if (it.kind === "drafts") return <div className="attn" key="drafts"><div><div className="t">{tn("hm_draft", it.periods.length)}</div><div className="s">{t("hm_draft_text")}</div></div><LinkButton size="sm" href={`/app/records/${it.periods[0]}`}>{t("hm_view")}</LinkButton></div>;
              if (it.kind === "no_response") return <div className="attn" key="noresp"><div><div className="t">{tn("hm_noresp", it.periods.length)}</div><div className="s">{t("hm_noresp_text")}</div></div><LinkButton size="sm" href="/app/records?ask=1" >{t("hm_ask")}</LinkButton></div>;
              return <div className="attn" key="waiting"><div><div className="t">{tn("hm_waiting", it.periods.length)}</div><div className="s">{t("hm_waiting_text")}</div></div><Button size="sm" disabled={busy || !ready || L.syncing} loading={L.syncing} onClick={() => void L.sync(false)} icon={<Icon name="refresh" size={14} />}>{t("sp_check")}</Button></div>;
            })}
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="recent-h">
        <div className="page-head" style={{ marginBottom: 4 }}><h2 id="recent-h">{t("hm_recent")}</h2><Link href="/app/records" className="small">{t("hm_all_records")} ({ledger.records.length})</Link></div>
        {recent.length === 0 ? <p className="muted">{t("rl_empty_text")}</p> : recent.map(r => <MonthRow key={r.period} r={r} salaryCents={ledger.profile.salaryCents} windowDays={ledger.profile.confirmWindowDays} fastForward={fastForward} />)}
        <div style={{ marginTop: 12 }}><LinkButton href="/app/record" icon={<Icon name="plus" />}>{t("hm_add_month")}</LinkButton></div>
      </section>
    </>
  );
}
