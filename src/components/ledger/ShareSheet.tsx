"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Sheet } from "@/components/ui/Sheet";
import { Button, LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/hooks/useToast";
import { useT } from "@/i18n";

type Props = { open: boolean; onClose: () => void; title: string; url: string | null; intro: string; whatsappText?: string; openLabel?: string };

/** Shares a link by QR, copy, or WhatsApp. Used for the employer request and the dispute bundle. */
export function ShareSheet({ open, onClose, title, url, intro, whatsappText, openLabel }: Props) {
  const { t } = useT();
  const [qr, setQr] = useState<string | null>(null);
  const { push } = useToast();
  useEffect(() => { if (url) QRCode.toDataURL(url, { margin: 1, width: 400 }).then(setQr); else setQr(null); }, [url]);
  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); push({ kind: "success", title: t("sh_copied") }); } catch { push({ kind: "error", title: t("sh_copy_fail"), body: t("sh_copy_fail_text") }); }
  }
  async function share() {
    if (!url) return;
    if (navigator.share) { try { await navigator.share({ title, url, text: whatsappText }); } catch {} } else copy();
  }
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="small muted" style={{ marginBottom: 14 }}>{intro}</p>
      {qr ? <img className="qr" src={qr} alt="QR" /> : <div className="skeleton qr" />}
      <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
        {whatsappText && url && <LinkButton variant="accent" size="lg" href={`https://wa.me/?text=${encodeURIComponent(`${whatsappText} ${url}`)}`} target="_blank" rel="noreferrer" icon={<Icon name="whatsapp" />}>{t("sh_send_wa")}</LinkButton>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Button onClick={copy} icon={<Icon name="copy" />}>{t("sh_copy")}</Button>
          <Button onClick={share} icon={<Icon name="share" />}>{t("sh_share")}</Button>
        </div>
        {url && openLabel && <LinkButton variant="ghost" href={url} target="_blank" rel="noreferrer" icon={<Icon name="arrow" />}>{openLabel}</LinkButton>}
      </div>
    </Sheet>
  );
}
