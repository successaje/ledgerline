"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Frame } from "@/components/worker/Frame";
import { MonthRow } from "@/components/worker/bits";
import { LinkButton, Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ShareSheet } from "@/components/ledger/ShareSheet";
import { submissionOf } from "@/domain/types";
import { employerView, isShort } from "@/domain/paybook";
import { encodeEmployerRequest } from "@/domain/bundle";
import { useToast } from "@/hooks/useToast";
import { logEvent } from "@/services/analytics";
import { useT } from "@/i18n";

type Filter = "all" | "short" | "waiting" | "drafts";

function RecordsInner() {
  const { t, tn } = useT();
  const { push } = useToast();
  const sp = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [askUrl, setAskUrl] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);

  return (
    <Frame>{({ L, ledger, fastForward }) => {
      const rows = [...ledger.records].sort((a, b) => b.period - a.period);
      const win = ledger.profile.confirmWindowDays;
      const shown = rows.filter(r => {
        if (filter === "short") return isShort(r);
        if (filter === "waiting") { const k = employerView(r, win, fastForward).kind; return k === "waiting" || k === "no_response"; }
        if (filter === "drafts") { const s = submissionOf(r); return s !== "confirmed"; }
        return true;
      });
      const years = [...new Set(shown.map(r => Math.floor(r.period / 100)))];
      const ask = () => {
        const items = ledger.records.filter(r => r.payEventUID && !r.countersign).map(r => ({ uid: r.payEventUID!, period: r.period, amountCents: r.amountCents, status: r.status }));
        if (!items.length) { push({ kind: "info", title: t("ap_nothing_title"), body: t("ap_nothing_text") }); return; }
        const req = encodeEmployerRequest({ worker: L.address, workerName: ledger.profile.name, employerLabel: ledger.profile.employerLabel, items });
        setAskUrl(`${window.location.origin}/employer?c=${req}`);
        logEvent("employer_link_created", { months: items.length });
        setAskOpen(true);
      };
      return <RecordsBody rows={rows} shown={shown} years={years} filter={filter} setFilter={setFilter} ledger={ledger} fastForward={fastForward} ask={ask} askUrl={askUrl} askOpen={askOpen} setAskOpen={setAskOpen} autoAsk={sp.get("ask") === "1"} t={t} tn={tn} />;
    }}</Frame>
  );
}

type Body = {
  rows: import("@/domain/types").PayRecord[]; shown: import("@/domain/types").PayRecord[]; years: number[]; filter: Filter; setFilter: (f: Filter) => void;
  ledger: import("@/domain/types").Ledger; fastForward: boolean; ask: () => void; askUrl: string | null; askOpen: boolean; setAskOpen: (b: boolean) => void; autoAsk: boolean;
  t: ReturnType<typeof useT>["t"]; tn: ReturnType<typeof useT>["tn"];
};
function RecordsBody({ shown, years, filter, setFilter, ledger, fastForward, ask, askUrl, askOpen, setAskOpen, autoAsk, t, tn }: Body) {
  const fired = useMemo(() => ({ done: false }), []);
  useEffect(() => { if (autoAsk && !fired.done) { fired.done = true; ask(); } }, [autoAsk, ask, fired]);
  const filters: { k: Filter; label: string }[] = [
    { k: "all", label: t("rl_filter_all") }, { k: "short", label: t("rl_filter_short") }, { k: "waiting", label: t("rl_filter_waiting") }, { k: "drafts", label: t("rl_filter_drafts") },
  ];
  return (
    <>
      <div className="page-head">
        <div><h1>{t("rl_title")}</h1><p className="small muted">{tn("rl_count", ledger.records.length)}</p></div>
        <LinkButton variant="primary" href="/app/record" icon={<Icon name="plus" />}>{t("hm_add_month")}</LinkButton>
      </div>
      <div className="filters" role="group" aria-label={t("rl_title")}>
        {filters.map(f => <button key={f.k} aria-pressed={filter === f.k} onClick={() => setFilter(f.k)}>{f.label}</button>)}
      </div>
      <section className="card">
        {ledger.records.length === 0 ? <div className="empty"><h3>{t("rl_empty_title")}</h3><p>{t("rl_empty_text")}</p></div>
          : shown.length === 0 ? <p className="muted">{t("rl_empty_filter")}</p>
          : years.map(y => (
            <div key={y}>
              {years.length > 1 && <div className="year-head">{y}</div>}
              {shown.filter(r => Math.floor(r.period / 100) === y).map(r => <MonthRow key={r.period} r={r} salaryCents={ledger.profile.salaryCents} windowDays={ledger.profile.confirmWindowDays} fastForward={fastForward} />)}
            </div>
          ))}
      </section>
      <div className="btn-row">
        <Button onClick={ask} icon={<Icon name="whatsapp" />} disabled={!ledger.records.some(r => r.payEventUID && !r.countersign)}>{t("hm_ask")}</Button>
        <LinkButton href="/app/share" icon={<Icon name="share" />}>{t("rl_share")}</LinkButton>
      </div>
      <ShareSheet open={askOpen} onClose={() => setAskOpen(false)} title={t("sh_emp_title")} url={askUrl} intro={t("sh_emp_intro")} whatsappText={t("sh_emp_wa")} openLabel={t("sh_emp_open")} />
    </>
  );
}

export default function RecordsPage() {
  return <Suspense fallback={null}><RecordsInner /></Suspense>;
}
