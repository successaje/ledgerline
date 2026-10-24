"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useConfig } from "@/hooks/useConfig";
import { useLedger } from "@/hooks/useLedger";
import { useToast } from "@/hooks/useToast";
import { useT } from "@/i18n";
import type { UserError } from "@/services/errors";

type LedgerApi = ReturnType<typeof useLedger>;
type ConfigApi = ReturnType<typeof useConfig>;

export type LedgerCtx = {
  L: LedgerApi;
  config: ConfigApi["config"];
  ready: boolean;
  cfgError: string | null;
  fastForward: boolean;
  setFastForward: (v: boolean) => void;
  /** Shows a translated error toast for a UserError. */
  fail: (e: unknown) => void;
  errTitle: (e: UserError) => string;
  errText: (e: UserError) => string;
};

const Ctx = createContext<LedgerCtx | null>(null);

/** One ledger for every worker route, so an in-flight publish survives navigation between Home, Records and Settings. */
export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const { config, ready, error: cfgError } = useConfig();
  const [ff, setFf] = useState(false);
  const L = useLedger(config, { fastForward: ff });
  const { push } = useToast();

  useEffect(() => { try { setFf(localStorage.getItem("ll.demo.ff") === "1"); } catch {} }, []);
  const setFastForward = useCallback((v: boolean) => { setFf(v); try { localStorage.setItem("ll.demo.ff", v ? "1" : "0"); } catch {} }, []);

  const errTitle = useCallback((ue: UserError) => t(`er_${ue.code}_title` as "er_unknown_title"), [t]);
  const errText = useCallback((ue: UserError) => t(`er_${ue.code}_text` as "er_unknown_text"), [t]);
  const fail = useCallback((e: unknown) => { const ue = e as UserError; push({ kind: "error", title: errTitle(ue), body: errText(ue) }); }, [push, errTitle, errText]);

  const value = useMemo<LedgerCtx>(() => ({ L, config, ready, cfgError, fastForward: ff, setFastForward, fail, errTitle, errText }), [L, config, ready, cfgError, ff, setFastForward, fail, errTitle, errText]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLedgerCtx() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLedgerCtx outside LedgerProvider");
  return c;
}
