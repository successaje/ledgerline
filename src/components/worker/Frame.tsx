"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { WorkerShell } from "./WorkerShell";
import { useLedgerCtx } from "./LedgerContext";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Pwa } from "@/components/ui/Pwa";
import { useT } from "@/i18n";

/**
 * Gate for worker pages: waits for the ledger to load, sends first-time visitors to onboarding,
 * shows server and last-error notices once, then renders the page inside the shell.
 */
export function Frame({ children, hideNav }: { children: (ctx: ReturnType<typeof useLedgerCtx> & { ledger: NonNullable<ReturnType<typeof useLedgerCtx>["L"]["ledger"]> }) => React.ReactNode; hideNav?: boolean }) {
  const ctx = useLedgerCtx();
  const { L, ready, cfgError, errTitle, errText } = ctx;
  const { t } = useT();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => { if (L.ledger === null && path !== "/app/start") router.replace("/app/start"); }, [L.ledger, path, router]);

  // The ledger loads from this device in the first effect, so the frame is blank for one paint rather than showing a
  // skeleton that would shift when the demo banner appears above it.
  if (L.ledger === undefined || L.ledger === null) {
    return <WorkerShell hideNav><div aria-busy="true" style={{ minHeight: 240 }}><span className="sr-only">Loading</span></div></WorkerShell>;
  }
  const ledger = L.ledger;
  const busy = Boolean(L.activity);
  return (
    <WorkerShell hideNav={hideNav} demo={ledger.meta.demo} onResetDemo={() => L.loadSample()} onExitDemo={() => { L.reset(); router.replace("/"); }}>
      <div className="stack">
        {ctx.config && !ready && !cfgError && <Notice kind="warn" title={t("ap_not_ready_title")}>{t("ap_not_ready_text")}</Notice>}
        {cfgError && <Notice kind="error" title={t("ap_no_server_title")}>{cfgError}</Notice>}
        {L.lastError && !busy && (
          <Notice kind="error" title={errTitle(L.lastError)} action={<Button size="sm" onClick={L.clearError} icon={<Icon name="x" size={14} />}>{t("ap_dismiss")}</Button>}>{errText(L.lastError)}</Notice>
        )}
        <Pwa worthInstalling={L.stats.recorded > 0} />
        {children({ ...ctx, ledger })}
      </div>
    </WorkerShell>
  );
}
