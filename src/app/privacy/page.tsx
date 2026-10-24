import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import { Pill } from "@/components/ui/Pill";

export const metadata: Metadata = { title: "Privacy", description: "What Ledgerline stores, where, and who can see it." };

export default function PrivacyPage() {
  return (
    <Shell nav={<><Pill tone="outline">Privacy</Pill><Link className="btn btn-primary btn-sm" href="/app">Open the app</Link></>}>
      <div style={{ maxWidth: 680, margin: "0 auto", display: "grid", gap: 20 }}>
        <div><h1>Privacy</h1><p className="muted" style={{ marginTop: 6 }}>Ledgerline is built so that the least possible is stored anywhere but your own phone. This page says exactly what goes where.</p></div>
        <div className="panel">
          <table>
            <thead><tr><th>Data</th><th>Where it lives</th><th>Who can see it</th></tr></thead>
            <tbody>
              <tr><td>Your name, the employer's name, notes</td><td>Your phone only (local storage)</td><td>You, and whoever you hand your phone to</td></tr>
              <tr><td>Your signing key and recovery words</td><td>Your phone only</td><td>You. Never sent to us or to the chain</td></tr>
              <tr><td>Month, amount, paid or not, hashed key and employer ids</td><td>Base (public test network)</td><td>Anyone, as pseudonymous records; linkable to you only through a bundle you share</td></tr>
              <tr><td>Employer's answer</td><td>Base, signed by the employer's key</td><td>Anyone, as a record that points at your month</td></tr>
              <tr><td>Bank proof text</td><td>Your phone; a hash on Base</td><td>Only people you send a bundle to</td></tr>
              <tr><td>Bank statement</td><td>Never leaves the bank page; the proof reads one window</td><td>Nobody, beyond the sentence the proof states</td></tr>
              <tr><td>Relayer request (signed record)</td><td>Our server, in transit only; not stored</td><td>Our server sees your key's address and the signed record, which is public anyway</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ display: "grid", gap: 10 }} className="muted">
          <p><strong style={{ color: "var(--ink)" }}>No accounts, no tracking of people.</strong> We do not collect email addresses, phone numbers or names. Product analytics, where present, count events (a month recorded, a bundle opened) without identifiers.</p>
          <p><strong style={{ color: "var(--ink)" }}>Your employer sees only what you ask about.</strong> The confirmation link lists the months awaiting an answer and your first name. It does not show notes, proofs or other months.</p>
          <p><strong style={{ color: "var(--ink)" }}>A bundle is a deliberate disclosure.</strong> It contains exactly the months you tick. Anyone with the link can read those months and verify them. Treat it like a document you hand over.</p>
          <p><strong style={{ color: "var(--ink)" }}>Public chain means permanent.</strong> Records on Base cannot be deleted. They are pseudonymous and carry no names, but choose amounts and months with that in mind.</p>
          <p><strong style={{ color: "var(--ink)" }}>Open source.</strong> Everything above can be checked in the <a href="https://github.com/successaje/ledgerline" target="_blank" rel="noreferrer">repository</a>.</p>
        </div>
      </div>
    </Shell>
  );
}
