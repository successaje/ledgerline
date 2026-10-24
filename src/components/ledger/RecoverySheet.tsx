"use client";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, MoneyInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/hooks/useToast";
import { logEvent } from "@/services/analytics";

type Backup = { kind: "phrase" | "key"; secret: string; address: string };
type Props = {
  open: boolean; onClose: () => void;
  mode: "backup" | "restore";
  backup?: () => Backup;
  onRestore?: (secret: string, profile: { name: string; employerLabel: string; salaryCents: number }) => Promise<number>;
};

/** Back up the device key, or restore one on a new phone and rebuild the record from the chain. */
export function RecoverySheet({ open, onClose, mode, backup, onRestore }: Props) {
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
    if (!secret.trim() || !name.trim() || !employer.trim() || !(cents > 0)) { setErr("Fill in the phrase, your name, the employer and the monthly salary."); return; }
    setBusy(true); setErr(null);
    try {
      const n = await onRestore!(secret, { name, employerLabel: employer, salaryCents: cents });
      logEvent("restore_done", { months: n });
      push({ kind: "success", title: n ? `${n} month${n === 1 ? "" : "s"} restored from the chain` : "Key restored", body: n ? "Employer answers and proofs were restored too." : "No recorded months were found for this key yet." });
      close();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not restore. Check the phrase and try again.");
    } finally { setBusy(false); }
  }

  if (mode === "backup") {
    return (
      <Sheet open={open} onClose={close} title="Back up your key">
        <p className="small muted">Your record is signed by a key that lives on this phone. Write these words down and keep them somewhere safe. With them you can open your record on any phone; without them, a lost phone means a lost key (the records themselves stay on chain).</p>
        {!revealed ? (
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            <Notice kind="warn" title="Private">Anyone with these words can sign as you. Do not send them to your employer or agency.</Notice>
            <Button variant="primary" onClick={() => { setRevealed(backup!()); logEvent("backup_shown"); }} icon={<Icon name="lock" />}>Show my recovery words</Button>
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
            <p className="xs faint">Key address <span className="mono">{revealed.address}</span>. {revealed.kind === "key" ? "This key was created before recovery phrases; store the full key." : ""}</p>
            <Button onClick={async () => { try { await navigator.clipboard.writeText(revealed.secret); push({ kind: "success", title: "Copied" }); } catch {} }} icon={<Icon name="copy" />}>Copy</Button>
            <Button variant="primary" onClick={close} icon={<Icon name="check" />}>I have written it down</Button>
          </div>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={close} title="Restore on this phone">
      <form onSubmit={restore} style={{ display: "grid", gap: 14 }} noValidate>
        <p className="small muted">Enter the recovery words from your old phone. Your months, the employer's answers and your proofs are read back from the chain. Names were never on chain, so tell us again who you are.</p>
        <Field id="secret" label="Recovery words (or key)"><textarea id="secret" className="input" style={{ minHeight: 80, padding: 10, resize: "vertical" }} value={secret} onChange={e => setSecret(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} /></Field>
        <Field id="rname" label="Your name"><TextInput id="rname" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field id="remp" label="Employer"><TextInput id="remp" value={employer} onChange={e => setEmployer(e.target.value)} placeholder="Mdm Tan (+65 9xxx 1234)" /></Field>
        <Field id="rsal" label="Monthly salary"><MoneyInput id="rsal" value={salary} onChange={e => setSalary(e.target.value)} placeholder="600" /></Field>
        {err && <Notice kind="error">{err}</Notice>}
        <Button type="submit" variant="primary" size="lg" loading={busy} icon={<Icon name="refresh" />}>{busy ? "Reading the chain" : "Restore my record"}</Button>
      </form>
    </Sheet>
  );
}
