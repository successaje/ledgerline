"use client";
import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import { LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { CHAIN_NAME } from "@/services/chain";
import { LanguageSwitch, useT } from "@/i18n";

export default function Landing() {
  const { t } = useT();
  return (
    <Shell nav={<><LanguageSwitch /><Link className="btn btn-ghost btn-sm hide-sm" href="/verify">{t("ld_verifier")}</Link><Link className="btn btn-primary btn-sm" href="/app">{t("nv_records")}</Link></>}>
      <div className="container site" style={{ padding: 0 }}>
        <section className="hero grid-2">
          <div>
            <span className="env-label" title={t("nv_env_title", { chain: CHAIN_NAME })}>{t("nv_env")}<span className="hide-xs"> · {CHAIN_NAME}</span></span>
            <h1 style={{ marginTop: 14 }}>{t("ld_title")}</h1>
            <p className="lede">{t("ld_lede")}</p>
            <div className="cta">
              <LinkButton variant="primary" size="lg" href="/app/start" icon={<Icon name="arrow" />}>{t("ld_start")}</LinkButton>
              <LinkButton size="lg" href="/app?sample=1">{t("ld_sample")}</LinkButton>
              <LinkButton size="lg" variant="ghost" href="/app/start?mode=restore">{t("ld_restore")}</LinkButton>
            </div>
            <p className="small muted" style={{ marginTop: 14 }}>{t("ld_foot_test")}</p>
          </div>
          <div className="paybook" aria-label={t("ld_example_title")}>
            <div className="paybook-head"><div><div className="small muted">{t("ld_example_title")}</div><div className="paybook-month">July 2026</div></div><Pill tone="warn"><Icon name="alert" size={14} />{t("ld_partly")}</Pill></div>
            <div className="paybook-grid">
              <div className="paybook-cell"><div className="k">{t("ld_expected")}</div><div className="v">S$700</div></div>
              <div className="paybook-cell"><div className="k">{t("ld_received")}</div><div className="v">S$500</div></div>
              <div className="paybook-cell"><div className="k">{t("ld_difference")}</div><div className="v diff-pos">S$200</div><div className="note">{t("ld_short", { amount: "S$200" })}</div></div>
            </div>
            <p className="small muted" style={{ marginTop: 14 }}>{t("nv_demo")}</p>
          </div>
        </section>

        <section className="section grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <h2 style={{ fontSize: "var(--fs-xl)" }}>{t("ld_is_title")}</h2>
            <ul className="bullets" style={{ marginTop: 12 }}>
              <li><Icon name="check" /><span>{t("ld_is_1")}</span></li>
              <li><Icon name="check" /><span>{t("ld_is_2")}</span></li>
              <li><Icon name="check" /><span>{t("ld_is_3")}</span></li>
            </ul>
          </div>
          <div className="card">
            <h2 style={{ fontSize: "var(--fs-xl)" }}>{t("ld_isnt_title")}</h2>
            <ul className="bullets" style={{ marginTop: 12 }}>
              <li><Icon name="x" /><span>{t("ld_isnt_1")}</span></li>
              <li><Icon name="x" /><span>{t("ld_isnt_2")}</span></li>
              <li><Icon name="x" /><span>{t("ld_isnt_3")}</span></li>
            </ul>
          </div>
        </section>

        <section className="section">
          <h2>{t("ld_how")}</h2>
          <div className="grid-3" style={{ marginTop: 24 }}>
            <div className="step"><div className="n">1</div><div><h3>{t("ld_how_1_t")}</h3><p>{t("ld_how_1")}</p></div></div>
            <div className="step"><div className="n">2</div><div><h3>{t("ld_how_2_t")}</h3><p>{t("ld_how_2")}</p></div></div>
            <div className="step"><div className="n">3</div><div><h3>{t("ld_how_3_t")}</h3><p>{t("ld_how_3")}</p></div></div>
          </div>
          <div className="cta"><LinkButton href="/verify" icon={<Icon name="shield" />}>{t("ld_verifier")}</LinkButton></div>
        </section>

        <footer className="footer">
          <span>Ledgerline · Web3 for Social Good 2026</span>
          <span><Link href="/help">Help</Link> · <Link href="/privacy">Privacy</Link> · <a href="https://github.com/successaje/ledgerline" target="_blank" rel="noreferrer">GitHub</a> · <Link href="/bank">Demo bank</Link></span>
        </footer>
      </div>
    </Shell>
  );
}
