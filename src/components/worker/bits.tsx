"use client";
import Link from "next/link";
import type { PayRecord } from "@/domain/types";
import { PAY_STATUS, submissionOf, type SubmissionState } from "@/domain/types";
import { sgd } from "@/domain/format";
import { amounts, employerView, type EmployerView } from "@/domain/paybook";
import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n";

export function usePayLabel() {
  const { t } = useT();
  return (status: number) => (status === PAY_STATUS.UNPAID ? t("pay_unpaid") : status === PAY_STATUS.PARTIAL ? t("pay_partial") : t("pay_paid"));
}

export function PayPill({ status }: { status: number }) {
  const label = usePayLabel();
  const tone = status === PAY_STATUS.PAID ? "ok" : status === PAY_STATUS.PARTIAL ? "warn" : "bad";
  return <Pill tone={tone}><Icon name={status === PAY_STATUS.PAID ? "check" : "alert"} size={14} />{label(status)}</Pill>;
}

export function SubmissionPill({ state }: { state: SubmissionState }) {
  const { t } = useT();
  const map: Record<SubmissionState, { tone: "neutral" | "ok" | "bad" | "warn" | "info"; label: string; icon: "check" | "clock" | "alert" | "x" | "pencil" | "help" }> = {
    draft: { tone: "neutral", label: t("st2_draft"), icon: "pencil" },
    awaiting: { tone: "info", label: t("st2_awaiting"), icon: "clock" },
    submitted: { tone: "info", label: t("st2_submitted"), icon: "clock" },
    confirmed: { tone: "ok", label: t("st2_confirmed"), icon: "lock" as never },
    failed: { tone: "bad", label: t("st2_failed"), icon: "x" },
    unknown: { tone: "warn", label: t("st2_unknown"), icon: "help" },
  };
  const m = map[state];
  return <Pill tone={m.tone}><Icon name={m.icon} size={14} />{m.label}</Pill>;
}

export function useEmployerLabel() {
  const { t, lang } = useT();
  const date = (ms: number) => new Date(ms).toLocaleDateString(lang === "en" ? "en-SG" : lang, { day: "numeric", month: "short" });
  return (v: EmployerView) => {
    switch (v.kind) {
      case "none": return "";
      case "waiting": return t("emp_waiting_due", { date: date(v.dueAt) });
      case "acknowledged": return t("emp_ack");
      case "disagreed": return t("emp_disagree");
      case "no_response": return t("emp_noresp", { date: date(v.dueAt) });
    }
  };
}

/** One month in a list: month, payment label, amounts, employer and submission state. Links to the detail page. */
export function MonthRow({ r, salaryCents, windowDays, fastForward }: { r: PayRecord; salaryCents: number; windowDays: number; fastForward: boolean }) {
  const { monthLabel } = useT();
  const empLabel = useEmployerLabel();
  const a = amounts(r, salaryCents);
  const sub = submissionOf(r);
  const ev = employerView(r, windowDays, fastForward);
  return (
    <Link href={`/app/records/${r.period}`} className="mrow" aria-label={monthLabel(r.period, true)}>
      <div>
        <div className="mrow-title">{monthLabel(r.period, true)}</div>
        <div className="mrow-sub">
          <span>{sgd(a.received)} / {sgd(a.expected)}</span>
          {ev.kind !== "none" && <span>{empLabel(ev)}</span>}
        </div>
      </div>
      <div className="mrow-state">
        <PayPill status={r.status} />
        {sub !== "confirmed" && <SubmissionPill state={sub} />}
      </div>
    </Link>
  );
}
