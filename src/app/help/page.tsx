import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import { Pill } from "@/components/ui/Pill";

export const metadata: Metadata = { title: "Help", description: "How Ledgerline works, what is on chain, and what to do when something goes wrong." };

const faqs: { q: string; a: React.ReactNode }[] = [
  { q: "What does Ledgerline actually store?", a: <>On chain: the month, the amount, paid or not, a hash of your key, a hash of the employer label, and the hash of any note. Your name, the employer's name, your notes and your bank statement never leave your phone. The employer's answer is a separate signed record that points at your month. A bank proof stores only a hash; the proof text stays with you until you put it in a bundle.</> },
  { q: "Who can see my record?", a: <>Anyone can see that some key recorded some month as paid or not paid, with an amount. Nobody can tell it is you unless you share a bundle, and a bundle contains only the months you choose. The link you send your employer shows them only the months you ask about.</> },
  { q: "Why does the employer get a link instead of an app?", a: <>So there is nothing to install and no account to make. They open it on any phone, tap Confirm or Dispute, and their answer is signed by a key created in their browser. If they do not answer within the window you set (three days by default), that silence is shown as evidence.</> },
  { q: "What is a bank proof?", a: <>For a month you marked as not paid, Ledgerline checks your bank statement page for the pay window and proves one sentence: "no credit of at least your salary from the employer between these dates". Only that sentence and the matching rows are disclosed. In this release the bank is a synthetic stand-in; the proof method is labelled in the app and in the verifier.</> },
  { q: "What is a dispute bundle?", a: <>A link (and QR) for the months you choose. Whoever opens it, a caseworker or a mediator, sees the verifier re-check every signature and proof against the chain and read a plain summary. It works without trusting Ledgerline; the verifier only reads public records.</> },
  { q: "I lost my phone. Is my record gone?", a: <>The months, answers and proofs are on chain. With your recovery words (Settings → Back up my key) you can restore everything on a new phone. Without them the key is gone and the record cannot be signed as yours any more, so write them down early.</> },
  { q: "I pressed Sign and the screen refreshed. Did it work?", a: <>Probably. Every time you open the app it reconciles with the chain and picks up records this phone did not know about. If a month is still a draft after a minute, sign it again; a second signature simply replaces the first.</> },
  { q: "Can I change a month after recording it?", a: <>Yes: Edit or re-record. A re-record writes a new signed record that supersedes the old one. The employer is asked again and any bank proof for the old record no longer applies.</> },
  { q: "Does this cost money?", a: <>No. A relayer pays the network fee for every record. This release runs on a test network, so nothing has monetary value.</> },
  { q: "Is this legal advice?", a: <>No. Ledgerline gives you a record and a way to prove facts from it. For a claim in Singapore, contact the Tripartite Alliance for Dispute Management, or an organisation such as HOME or TWC2, and show them your bundle.</> },
];

export default function HelpPage() {
  return (
    <Shell nav={<><Pill tone="outline">Help</Pill><Link className="btn btn-primary btn-sm" href="/app">Records</Link></>}>
      <div style={{ maxWidth: 680, margin: "0 auto", display: "grid", gap: 20 }}>
        <div><h1>Help</h1><p className="muted" style={{ marginTop: 6 }}>Short answers to the questions people ask before they trust a record with their salary.</p></div>
        <div style={{ display: "grid", gap: 8 }}>
          {faqs.map(f => (
            <details key={f.q} className="panel panel-pad">
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>{f.q}</summary>
              <p className="muted" style={{ marginTop: 8 }}>{f.a}</p>
            </details>
          ))}
        </div>
        <p className="small muted">Still stuck? The project is open source: <a href="https://github.com/successaje/ledgerline/issues" target="_blank" rel="noreferrer">report a problem on GitHub</a>. See also the <Link href="/privacy">privacy page</Link>.</p>
      </div>
    </Shell>
  );
}
