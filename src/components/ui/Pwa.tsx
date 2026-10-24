"use client";
import { useEffect, useState } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { logEvent } from "@/services/analytics";
import { useT } from "@/i18n";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** Registers the service worker and, once the person has something worth keeping, offers to install. */
export function Pwa({ worthInstalling }: { worthInstalling: boolean }) {
  const { t } = useT();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
    try { setDismissed(localStorage.getItem("ll.pwa.dismissed") === "1"); } catch {}
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setDeferred(null); logEvent("pwa_installed"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (!deferred || dismissed || !worthInstalling) return null;
  const dismiss = () => { try { localStorage.setItem("ll.pwa.dismissed", "1"); } catch {} setDismissed(true); };
  return (
    <div className="notice notice-info no-print" role="status" style={{ alignItems: "center" }}>
      <Icon name="share" size={18} />
      <div className="row" style={{ gap: 12 }}>
        <div><strong>{t("pw_title")}</strong><div>{t("pw_text")}</div></div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="sm" variant="primary" onClick={async () => { await deferred.prompt(); const c = await deferred.userChoice; if (c.outcome !== "accepted") dismiss(); }}>{t("pw_add")}</Button>
          <Button size="sm" variant="ghost" onClick={dismiss} aria-label={t("pw_not_now")}><Icon name="x" size={14} /></Button>
        </div>
      </div>
    </div>
  );
}
