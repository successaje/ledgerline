"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en, type Dict } from "./en";
import { tl } from "./tl";
import { id } from "./id";
import { my } from "./my";
import { bn } from "./bn";

export type Lang = "en" | "tl" | "id" | "my" | "bn";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "tl", label: "Tagalog" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "my", label: "မြန်မာ" },
  { code: "bn", label: "বাংলা" },
];
const DICTS: Record<Lang, Partial<Dict>> = { en, tl, id, my, bn };
const KEY = "ll.lang";

type Vars = Record<string, string | number>;
export type T = (key: keyof Dict, vars?: Vars) => string;

function fill(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Detects the phone's language once; the person can override it and the choice is remembered. */
function detect(): Lang {
  try {
    const saved = window.localStorage.getItem(KEY) as Lang | null;
    if (saved && saved in DICTS) return saved;
    const nav = (navigator.language || "").toLowerCase();
    if (nav.startsWith("tl") || nav.startsWith("fil")) return "tl";
    if (nav.startsWith("id")) return "id";
    if (nav.startsWith("my")) return "my";
    if (nav.startsWith("bn")) return "bn";
  } catch {}
  return "en";
}

type Ctx = {
  lang: Lang; setLang: (l: Lang) => void; t: T;
  /** Plural-aware: picks `${key}_one` or `${key}_other` and fills {n}. */
  tn: (key: string, n: number, vars?: Vars) => string;
  monthLabel: (period: number, long?: boolean) => string;
};
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => { setLangState(detect()); }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); try { window.localStorage.setItem(KEY, l); } catch {} }, []);
  const value = useMemo<Ctx>(() => {
    const d = DICTS[lang];
    const t: T = (key, vars) => fill(d[key] ?? en[key] ?? String(key), vars);
    const tn = (key: string, n: number, vars?: Vars) => {
      const k = `${key}_${n === 1 ? "one" : "other"}` as keyof Dict;
      return fill(d[k] ?? en[k] ?? String(key), { n, ...(vars || {}) });
    };
    const short = (d.months_short ?? en.months_short).split(","), long = (d.months_long ?? en.months_long).split(",");
    const monthLabel = (period: number, isLong = false) => `${(isLong ? long : short)[(period % 100) - 1]} ${Math.floor(period / 100)}`;
    return { lang, setLang, t, tn, monthLabel };
  }, [lang, setLang]);
  useEffect(() => { document.documentElement.lang = lang === "tl" ? "fil" : lang; }, [lang]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useT() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useT outside I18nProvider");
  return c;
}

/** Small language picker for the top bar. */
export function LanguageSwitch() {
  const { lang, setLang, t } = useT();
  return (
    <label className="lang-switch">
      <span className="sr-only">{t("language")}</span>
      <select className="lang-select" value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label={t("language")}>
        {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
