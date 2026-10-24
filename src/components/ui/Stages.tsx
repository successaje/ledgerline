"use client";
import type { TxStage } from "@/domain/types";
import { Icon } from "./Icon";
import { explorer } from "@/services/chain";
import { useT } from "@/i18n";

const ORDER: TxStage[] = ["preparing", "signing", "submitting", "confirming", "done"];

/** A staged transaction stepper: the user sees where their record is instead of a spinner. */
export function Stages({ stage, txHash, labels }: { stage: TxStage; txHash?: string; labels?: Partial<Record<TxStage, string>> }) {
  const { t } = useT();
  const base: Record<TxStage, string> = { preparing: t("st_preparing"), signing: t("st_signing"), submitting: t("st_submitting"), confirming: t("st_confirming"), done: t("st_done"), error: t("st_error") };
  const idx = stage === "error" ? -1 : ORDER.indexOf(stage);
  return (
    <div className="stages" aria-live="polite">
      {ORDER.map((s, i) => {
        const state = stage === "error" && i === 0 ? "error" : i < idx ? "done" : i === idx ? (s === "done" ? "done" : "active") : "";
        return (
          <div key={s} className={`stage ${state}`}>
            <span className="mark">{state === "done" ? <Icon name="check" size={11} /> : state === "error" ? <Icon name="x" size={11} /> : null}</span>
            <span>
              {labels?.[s] || base[s]}
              {s === "confirming" && txHash && (i <= idx) && <> · <a href={explorer.tx(txHash)} target="_blank" rel="noreferrer" className="xs">{t("st_view_tx")}</a></>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
