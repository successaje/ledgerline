"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Frame } from "@/components/worker/Frame";
import { PayPill } from "@/components/worker/bits";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { ShareSheet } from "@/components/ledger/ShareSheet";
import { sgd } from "@/domain/format";
import { amounts, employerView } from "@/domain/paybook";
import { useEmployerLabel } from "@/components/worker/bits";
import { encodeBundle, type Bundle } from "@/domain/bundle";
import { logEvent } from "@/services/analytics";
import { useT } from "@/i18n";

/** Choose which months to disclose. Nothing is preselected except a month opened from its detail page. */
function Share() {
  const { t, tn, monthLabel } = useT();
  const sp = useSearchParams();
  const empLabel = useEmployerLabel();
  const [sel, setSel] = useState<Record<number, boolean>>(() => (sp.get("p") ? { [Number(sp.get("p"))]: true } : {}));
  const [url, setUrl] = useState<string | null>(null);
  const count = Object.values(sel).filter(Boolean).length;

  return (
    <Frame>{({ L, ledger, config, fastForward }) => {
      const recorded = ledger.records.filter(r => r.payEventUID).sort((a, b) => b.period - a.period);
      const create = () => {
        if (!config) return;
        const periods = Object.entries(sel).filter(([, v]) => v).map(([k]) => Number(k));
        const items = ledger.records.filter(r => periods.includes(r.period) && r.payEventUID).map(r => ({
          period: r.period, amountCents: r.amountCents, status: r.status, expectedCents: amounts(r, ledger.profile.salaryCents).expected, payEventUID: r.payEventUID!, countersignUID: r.countersign?.uid,
          proof: r.proof?.proofJson ? { uid: r.proof.uid, proofJson: r.proof.proofJson } : undefined,
        }));
        const b: Bundle = { v: 1, worker: { address: L.address, name: ledger.profile.name }, employer: { label: ledger.profile.employerLabel, id: ledger.profile.employerId }, bankAttestor: config.bankAttestor, issuedAt: Date.now(), responseWindowDays: ledger.profile.confirmWindowDays, items };
        setUrl(`${window.location.origin}/verify?b=${encodeBundle(b)}`);
        logEvent("bundle_created", { months: items.length });
      };
      return (
        <>
          <Link href="/app/records" className="small" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="back" size={14} /> {t("rd_back")}</Link>
          <div className="page-head"><div><h1>{t("rl_share")}</h1><p className="muted" style={{ marginTop: 4 }}>{t("bs_intro")}</p></div></div>
          {recorded.length === 0 ? <div className="card"><div className="empty"><h3>{t("bs_empty_title")}</h3><p>{t("bs_empty_text")}</p></div></div> : (
            <section className="card">
              <div className="choice">
                {recorded.map(r => {
                  const a = amounts(r, ledger.profile.salaryCents);
                  const ev = employerView(r, ledger.profile.confirmWindowDays, fastForward);
                  return (
                    <label key={r.period}>
                      <input type="checkbox" checked={!!sel[r.period]} onChange={e => setSel({ ...sel, [r.period]: e.target.checked })} />
                      <span>
                        <span className="choice-title" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{monthLabel(r.period, true)} <PayPill status={r.status} /></span>
                        <span className="choice-sub">{sgd(a.received)} / {sgd(a.expected)}{ev.kind !== "none" ? ` · ${empLabel(ev)}` : ""}{r.proof ? ` · ${t("ev_demo")}` : ""}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}
          <Notice kind="info">{t("sh_bundle_intro")}</Notice>
          <div><Button variant="primary" size="lg" disabled={count === 0} onClick={create} icon={<Icon name="shield" />}>{count ? tn("bs_create_n", count) : t("bs_create")}</Button></div>
          <ShareSheet open={url !== null} onClose={() => setUrl(null)} title={t("sh_bundle_title")} url={url} intro={t("sh_bundle_intro")} whatsappText={t("sh_bundle_wa")} openLabel={t("sh_bundle_open")} />
        </>
      );
    }}</Frame>
  );
}

export default function SharePage() {
  return <Suspense fallback={null}><Share /></Suspense>;
}
