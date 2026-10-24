"use client";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, MoneyInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/hooks/useToast";
import { logEvent } from "@/services/analytics";
import { useT } from "@/i18n";

type Backup = { kind: "phrase" | "key"; secret: string; address: string };
type Props = {
  open: boolean; onClose: () => void; mode: "backup" | "restore";
  backup?: () => Backup;
  onRestore?: (secret: string, profile: { name: string; employerLabel: string; salaryCents: number }) => Promise<number>;
};

/** Back up the device key, or restore one on a new phone and rebuild the record from the chain. */
export function RecoverySheet({ open, onClose, mode, backup, onRestore }: Props) {
  const { t, tn } = useT();
  const { push } = useToast();
  const [revealed, setRevealed] = useState<Backup | null>(null);
  const [secret, setSecret] = useState("");
  const [name, setName] = useState("");
  const [employer, setEmployer] = useState("");
  const [salary, setSalary] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function close() { setRevealed(null); setErr(null); onClose(); }

  async function restore(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(salary) * 100);
    if (!secret.trim() || !name.trim() || !employer.trim() || !(cents > 0)) { setErr(t("rc_err_fill")); return; }
    setBusy(true); setErr(null);
    try {
      const n = await onRestore!(secret, { name, employerLabel: employer, salaryCents: cents });
      logEvent("restore_done", { months: n });
      push(n ? { kind: "success", title: tn("rc_restored", n), body: t("rc_restored_text") } : { kind: "success", title: t("rc_restored_none"), body: t("rc_restored_none_text") });
      close();
    } catch (ex) {
      setErr(ex instanceof Error && ex.message && !/not ready/.test(ex.message) ? ex.message : t("rc_err_restore"));
    } finally { setBusy(false); }
  }

  if (mode === "backup") {
    return (
      <Sheet open={open} onClose={close} title={t("rc_backup_title")}>
        <p className="small muted">{t("rc_backup_intro")}</p>
        {!revealed ? (
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            <Notice kind="warn" title={t("rc_private_title")}>{t("rc_private_text")}</Notice>
            <Button variant="primary" onClick={() => { setRevealed(backup!()); logEvent("backup_shown"); }} icon={<Icon name="lock" />}>{t("rc_show")}</Button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <div className="panel panel-pad" style={{ background: "var(--paper-3)" }}>
              {revealed.kind === "phrase" ? (
                <ol style={{ margin: 0, paddingLeft: 22, columns: 2, gap: 24, fontSize: 15, lineHeight: 1.8 }}>{revealed.secret.split(" ").map((w, i) => <li key={i}>{w}</li>)}</ol>
              ) : (
                <div className="mono" style={{ wordBreak: "break-all" }}>{revealed.secret}</div>
              )}
            </div>
            <p className="xs faint">{t("rc_key_address", { address: revealed.address })} {revealed.kind === "key" ? t("rc_raw_key_note") : ""}</p>
            <Button onClick={async () => { try { await navigator.clipboard.writeText(revealed.secret); push({ kind: "success", title: t("rc_copied") }); } catch {} }} icon={<Icon name="copy" />}>{t("rc_copy")}</Button>
            <Button variant="primary" onClick={close} icon={<Icon name="check" />}>{t("rc_written")}</Button>
          </div>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={close} title={t("rc_restore_title")}>
      <form onSubmit={restore} style={{ display: "grid", gap: 14 }} noValidate>
        <p className="small muted">{t("rc_restore_intro")}</p>
        <Field id="secret" label={t("rc_words_label")}><textarea id="secret" className="input" style={{ minHeight: 80, padding: 10, resize: "vertical" }} value={secret} onChange={e => setSecret(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} /></Field>
        <Field id="rname" label={t("rc_name")}><TextInput id="rname" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field id="remp" label={t("rc_employer")}><TextInput id="remp" value={employer} onChange={e => setEmployer(e.target.value)} placeholder="Mdm Tan (+65 9xxx 1234)" /></Field>
        <Field id="rsal" label={t("rc_salary")}><MoneyInput id="rsal" value={salary} onChange={e => setSalary(e.target.value)} placeholder="600" /></Field>
        {err && <Notice kind="error">{err}</Notice>}
        <Button type="submit" variant="primary" size="lg" loading={busy} icon={<Icon name="refresh" />}>{busy ? t("rc_restoring") : t("rc_restore_btn")}</Button>
      </form>
    </Sheet>
  );
}
