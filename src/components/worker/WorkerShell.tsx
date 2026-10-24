"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/ui/Brand";
import { Icon } from "@/components/ui/Icon";
import { CHAIN_NAME } from "@/services/chain";
import { useT } from "@/i18n";

/** Worker app frame: brand and test-network label on top, Home / Records / Settings as the only navigation. */
export function WorkerShell({ children, demo, onResetDemo, onExitDemo, hideNav }: { children: React.ReactNode; demo?: boolean; onResetDemo?: () => void; onExitDemo?: () => void; hideNav?: boolean }) {
  const { t } = useT();
  const path = usePathname();
  const is = (p: string) => (p === "/app" ? path === "/app" : path.startsWith(p));
  return (
    <div className="wshell">
      <a href="#main" className="skip-link">{t("nv_skip")}</a>
      <div className="wtop">
        <header className="topbar">
          <div className="container topbar-inner" style={{ maxWidth: "var(--w-site)" }}>
            <Brand href="/app" />
            <span className="env-label" title={t("nv_env_title", { chain: CHAIN_NAME })}>{t("nv_env")} · {CHAIN_NAME}</span>
          </div>
        </header>
        {demo && (
          <div className="demo-banner" role="status">
            <div className="inner">
              <span>{t("nv_demo")}</span>
              <span style={{ display: "flex", gap: 6 }}>
                {onResetDemo && <button className="btn btn-sm" onClick={onResetDemo}>{t("nv_demo_reset")}</button>}
                {onExitDemo && <button className="btn btn-sm" onClick={onExitDemo}>{t("nv_demo_exit")}</button>}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="wbody">
        {!hideNav && (
          <nav className="wnav" aria-label="Main">
            <Link href="/app" aria-current={is("/app") && !is("/app/records") && !is("/app/settings") && !is("/app/record") ? "page" : undefined}><Icon name="home" size={22} /><span>{t("nv_home")}</span></Link>
            <Link href="/app/records" aria-current={is("/app/records") || is("/app/record") ? "page" : undefined}><Icon name="list" size={22} /><span>{t("nv_records")}</span></Link>
            <Link href="/app/settings" aria-current={is("/app/settings") ? "page" : undefined}><Icon name="settings" size={22} /><span>{t("nv_settings")}</span></Link>
          </nav>
        )}
        <main id="main" className="wmain" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
