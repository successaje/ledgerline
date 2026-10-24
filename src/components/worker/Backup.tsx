"use client";
import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, MoneyInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/hooks/useToast";
import { logEvent } from "@/services/analytics";
import { useT } from "@/i18n";

type Backup = { kind: "phrase" | "key"; secret: string; address: string };

/** Picks two word positions to check, deterministic per phrase so a retry asks the same words. */
function pickPositions(words: string[]) {
  const h = words.join(" ").split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const a = h % words.length;
  const b = (a + 1 + ((h >> 8) % (words.length - 1))) % words.length;
  return [Math.min(a, b), Math.max(a, b)];
}

/**
 * Shows the recovery words on request, then checks the person's paper copy by asking for two of them.
 * Words are never logged, never placed in a URL and never sent anywhere. Used by onboarding and Settings.
 */
export function BackupPanel({ backup, onVerified, onSkip, startAtVerify }: { backup: () => Backup; onVerified: () => void; onSkip?: () => void; startAtVerify?: boolean }) {
  const { t } = useT();
  const { push } = useToast();
  const [b, setB] = useState<Backup | null>(null);
  const [stage, setStage] = useState<"hidden" | "shown" | "verify" | "ok">(startAtVerify ? "verify" : "hidden");
  const [answers, setAnswers] = useState<string[]>(["", ""]);
  const [bad, setBad] = useState(false);
  useEffect(() => { if (startAtVerify && !b) setB(backup()); }, [startAtVerify, b, backup]);
  const words = useMemo(() => (b?.kind === "phrase" ? b.secret.split(" ") : []), [b]);
  const positions = useMemo(() => (words.length ? pickPositions(words) : [0, 1]), [words]);

  const check = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = positions.every((pos, i) => answers[i].trim().toLowerCase() === words[pos]);
    setBad(!ok);
    if (ok) { setStage("ok"); onVerified(); push({ kind: "success", title: t("ob2_verify_ok"), body: t("ob2_verify_ok_text") }); }
  };

  if (stage === "hidden") {
    return (
      <div className="stack">
        <p>{t("ob2_backup_text")}</p>
        <Button variant="primary" size="lg" onClick={() => { setB(backup()); setStage("shown"); logEvent("backup_shown"); }} icon={<Icon name="eye" />}>{t("ob2_backup_show")}</Button>
        {onSkip && <><Button variant="ghost" onClick={onSkip}>{t("ob2_backup_skip")}</Button><p className="small muted">{t("ob2_backup_skipped")}</p></>}
      </div>
    );
  }
  if (stage === "shown" && b) {
    return (
      <div className="stack">
        <Notice kind="warn" title={t("rc_private_title")}>{t("rc_private_text")}</Notice>
        {b.kind === "phrase" ? <ol className="words">{words.map((w, i) => <li key={i}>{w}</li>)}</ol> : <div className="mono payload">{b.secret}</div>}
        <p className="small muted" style={{ overflowWrap: "anywhere" }}>{t("rc_key_address", { address: b.address })} {b.kind === "key" ? t("rc_raw_key_note") : ""}</p>
        <div className="btn-row">
          <Button variant="primary" size="lg" onClick={() => (b.kind === "phrase" ? setStage("verify") : (setStage("ok"), onVerified()))} icon={<Icon name="check" />}>{t("ob2_backup_written")}</Button>
          <Button variant="ghost" onClick={() => setStage("hidden")} icon={<Icon name="eye-off" />}>{t("rc_copy") === "Copy" ? "Hide" : t("rf_back")}</Button>
        </div>
      </div>
    );
  }
  if (stage === "verify") {
    return (
      <form className="stack" onSubmit={check} noValidate>
        <h3>{t("ob2_verify_title")}</h3>
        <p className="muted">{t("ob2_verify_text")}</p>
        {positions.map((pos, i) => (
          <Field key={pos} id={`w-${pos}`} label={t("ob2_verify_word", { n: pos + 1 })}><TextInput id={`w-${pos}`} value={answers[i]} onChange={e => { const n = [...answers]; n[i] = e.target.value; setAnswers(n); }} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" /></Field>
        ))}
        {bad && <Notice kind="error">{t("ob2_verify_bad")}</Notice>}
        <div className="btn-row"><Button type="submit" variant="primary" size="lg" icon={<Icon name="check" />}>{t("ob2_verify_cta")}</Button><Button type="button" variant="ghost" onClick={() => setStage("shown")}>{t("ob2_backup_show")}</Button></div>
      </form>
    );
  }
  return <Notice kind="ok" title={t("ob2_verify_ok")}>{t("ob2_verify_ok_text")}</Notice>;
}

export function BackupSheet({ open, onClose, backup, onVerified, startAtVerify }: { open: boolean; onClose: () => void; backup: () => Backup; onVerified: () => void; startAtVerify?: boolean }) {
  const { t } = useT();
  return <Sheet open={open} onClose={onClose} title={t("ob2_backup_title")}>{open && <BackupPanel backup={backup} onVerified={onVerified} startAtVerify={startAtVerify} />}</Sheet>;
}

/** Restore on this phone. Stops when local records exist, so a restore never silently replaces them. */
export function RestorePanel({ hasLocal, onRestore, onDone }: { hasLocal: boolean; onRestore: (secret: string, profile: { name: string; employerLabel: string; salaryCents: number }) => Promise<number>; onDone?: () => void }) {
  const { t, tn } = useT();
  const { push } = useToast();
  const [secret, setSecret] = useState("");
  const [name, setName] = useState("");
  const [employer, setEmployer] = useState("");
  const [salary, setSalary] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function restore(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(salary) * 100);
    if (!secret.trim() || !name.trim() || !employer.trim() || !(cents > 0)) { setErr(t("rc_err_fill")); return; }
    setBusy(true); setErr(null);
    try {
      const n = await onRestore(secret, { name, employerLabel: employer, salaryCents: cents });
      logEvent("restore_done", { months: n });
      push(n ? { kind: "success", title: tn("rc_restored", n), body: t("rc_restored_text") } : { kind: "success", title: t("rc_restored_none"), body: t("rc_restored_none_text") });
      setSecret("");
      onDone?.();
    } catch (ex) {
      setErr(ex instanceof Error && ex.message && !/not ready/.test(ex.message) ? ex.message : t("rc_err_restore"));
    } finally { setBusy(false); }
  }

  if (hasLocal) return <Notice kind="warn" title={t("ob2_restore_conflict_title")}>{t("ob2_restore_conflict_text")}</Notice>;
  return (
    <form onSubmit={restore} className="stack" noValidate>
      <p className="muted">{t("ob2_restore_text")}</p>
      <Field id="secret" label={t("rc_words_label")}><textarea id="secret" className="input" style={{ minHeight: 88, padding: 12, resize: "vertical" }} value={secret} onChange={e => setSecret(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" data-sensitive="true" /></Field>
      <Field id="rname" label={t("rc_name")}><TextInput id="rname" value={name} onChange={e => setName(e.target.value)} /></Field>
      <Field id="remp" label={t("rc_employer")}><TextInput id="remp" value={employer} onChange={e => setEmployer(e.target.value)} placeholder="Mdm Tan (+65 9xxx 1234)" /></Field>
      <Field id="rsal" label={t("rc_salary")}><MoneyInput id="rsal" value={salary} onChange={e => setSalary(e.target.value)} placeholder="700" /></Field>
      {err && <Notice kind="error">{err}</Notice>}
      <Button type="submit" variant="primary" size="lg" loading={busy} icon={<Icon name="refresh" />}>{busy ? t("rc_restoring") : t("rc_restore_btn")}</Button>
    </form>
  );
}

export function RestoreSheet({ open, onClose, hasLocal, onRestore }: { open: boolean; onClose: () => void; hasLocal: boolean; onRestore: RestorePanelProps["onRestore"] }) {
  const { t } = useT();
  return <Sheet open={open} onClose={onClose} title={t("ob2_restore_title")}>{open && <RestorePanel hasLocal={hasLocal} onRestore={onRestore} onDone={onClose} />}</Sheet>;
}
type RestorePanelProps = Parameters<typeof RestorePanel>[0];
