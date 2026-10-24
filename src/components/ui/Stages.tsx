import type { TxStage } from "@/domain/types";
import { TX_STAGE_LABEL } from "@/domain/types";
import { Icon } from "./Icon";
import { explorer } from "@/services/chain";

const ORDER: TxStage[] = ["preparing", "signing", "submitting", "confirming", "done"];

/** A staged transaction stepper: the user sees where their record is instead of a spinner. */
export function Stages({ stage, txHash, labels }: { stage: TxStage; txHash?: string; labels?: Partial<Record<TxStage, string>> }) {
  const idx = stage === "error" ? -1 : ORDER.indexOf(stage);
  return (
    <div className="stages" aria-live="polite">
      {ORDER.map((s, i) => {
        const state = stage === "error" && i === 0 ? "error" : i < idx ? "done" : i === idx ? (s === "done" ? "done" : "active") : "";
        return (
          <div key={s} className={`stage ${state}`}>
            <span className="mark">{state === "done" ? <Icon name="check" size={11} /> : state === "error" ? <Icon name="x" size={11} /> : null}</span>
            <span>
              {labels?.[s] || TX_STAGE_LABEL[s]}
              {s === "confirming" && txHash && (i <= idx) && <> · <a href={explorer.tx(txHash)} target="_blank" rel="noreferrer" className="xs">view transaction</a></>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
