import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import { LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { DemoLedger } from "@/components/landing/DemoLedger";

export default function Landing() {
  return (
    <Shell nav={<><Link className="btn btn-ghost btn-sm" href="/verify">Verifier</Link><Link className="btn btn-primary btn-sm" href="/app">Open the app</Link></>}>
      <div className="container site" style={{ padding: 0 }}>
        <section className="hero grid-2">
          <div>
            <Pill tone="outline">For migrant domestic workers · Singapore first</Pill>
            <h1 style={{ marginTop: 14 }}>The payslip the employer cannot take back.</h1>
            <p className="lede">Every month, mark whether you were paid. Your employer confirms from a link. When pay goes missing, prove it from your own bank page without showing your balance. The record is yours: no agency, employer or app can rewrite it.</p>
            <div className="cta">
              <LinkButton variant="primary" size="lg" href="/app" icon={<Icon name="arrow" />}>Start your record</LinkButton>
              <LinkButton size="lg" href="/app?sample=1">Try the sample</LinkButton>
            </div>
            <p className="xs faint" style={{ marginTop: 14 }}>Free. No wallet, gas or seed phrase. Test network for now; no money moves.</p>
          </div>
          <DemoLedger />
        </section>

        <section className="section">
          <h2>Pay goes missing, and the only evidence is the employer's word.</h2>
          <p className="sub">Singapore's domestic workers are excluded from the itemised-payslip rule that protects other employees. When a salary does not arrive, they have screenshots and a WhatsApp thread.</p>
          <div className="grid-3" style={{ marginTop: 24 }}>
            <div className="fact"><div className="v num">~300,000</div><div className="k">migrant domestic workers in Singapore</div></div>
            <div className="fact"><div className="v num">9,848</div><div className="k">salary claims filed at TADM in 2024</div></div>
            <div className="fact"><div className="v num">45.6%</div><div className="k">arrive already in debt to recruitment agents (Majurity Trust, 2025)</div></div>
          </div>
        </section>

        <section className="section">
          <h2>How it works</h2>
          <div className="grid-3" style={{ marginTop: 24 }}>
            <div className="step"><div className="n">1</div><div><h3>Record each payday</h3><p>Paid or not paid, signed by a key that lives only on your phone, written to the Base network. You never see a wallet.</p></div></div>
            <div className="step"><div className="n">2</div><div><h3>Employer confirms from a link</h3><p>One tap on WhatsApp. Their answer is signed next to your month. Silence after three days is recorded too.</p></div></div>
            <div className="step"><div className="n">3</div><div><h3>Prove it from your bank</h3><p>For a missing month, prove "no salary-sized credit arrived in the pay window" from your own statement page. Nothing else is disclosed.</p></div></div>
          </div>
        </section>

        <section className="section grid-2">
          <div>
            <h2>A bundle anyone can check, without trusting us.</h2>
            <p className="sub">Choose the months to disclose. The verifier re-checks every signature and proof against the chain and writes a plain-English summary a mediator can read in ten seconds.</p>
            <div className="cta"><LinkButton href="/verify" icon={<Icon name="shield" />}>Open the verifier</LinkButton></div>
          </div>
          <div className="panel panel-pad">
            <div className="summary">July 2026: Maria recorded this month as not paid (S$600). The employer did not confirm it within the window. Her bank statement shows no credit of S$600 or more from TAN between 2026-07-01 and 2026-07-10.</div>
            <p className="xs faint" style={{ marginTop: 10 }}>Example verifier summary for a one-month bundle.</p>
          </div>
        </section>

        <section className="section">
          <h2>Why a public chain, and not our database</h2>
          <div className="grid-3" style={{ marginTop: 24 }}>
            <div><h3>No custodian</h3><p className="small muted" style={{ marginTop: 6 }}>The record survives a lost phone, a new employer, a new country, and us going out of business.</p></div>
            <div><h3>Neutral timestamps</h3><p className="small muted" style={{ marginTop: 6 }}>"The employer did not answer within three days" is checkable by anyone and cannot be back-dated by either side.</p></div>
            <div><h3>Selective disclosure</h3><p className="small muted" style={{ marginTop: 6 }}>Names and balances never go on chain. A bundle contains only the months you choose; a proof contains only the predicate.</p></div>
          </div>
          <p className="small muted" style={{ marginTop: 24, maxWidth: "70ch" }}>Built on Ethereum Attestation Service on Base. Attestations are signed by the worker's and employer's own keys; a relayer pays the gas. The bank in this release is synthetic; see the <a href="https://github.com/successaje/ledgerline#honesty-section-what-is-real-and-what-is-synthetic" target="_blank" rel="noreferrer">honesty section</a> for what is real.</p>
        </section>

        <footer className="footer">
          <span>Ledgerline · Web3 for Social Good 2026 · Tech Track</span>
          <span><a href="https://github.com/successaje/ledgerline" target="_blank" rel="noreferrer">GitHub</a> · <Link href="/bank">Synthetic bank</Link> · <Link href="/app">App</Link></span>
        </footer>
      </div>
    </Shell>
  );
}
