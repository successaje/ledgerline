# DoraHacks BUIDL submission

**Name:** Ledgerline

**One line:** The payslip the employer cannot take back: a worker-held, employer-countersigned, bank-proven pay record for migrant domestic workers.

**Track:** Tech Track · **Chain:** Base Sepolia (Ethereum Attestation Service) · **Testnet only, no real funds.**

**Links:** Live app https://ledgerline-sg.vercel.app · Repo https://github.com/successaje/ledgerline · Verifier https://ledgerline-sg.vercel.app/verify · Schemas in SCHEMAS.md

**Submitted:** Tech Track build https://dorahacks.io/build/50263 (24 Oct 2026). Idea Track companion "Due Process" https://dorahacks.io/build/50257 (24 Oct 2026). Both under organizer review.

**Demo video (2 min, captioned screen recording of the live site, no voiceover):** https://ledgerline-sg.vercel.app/demo/ledgerline-demo.mp4 · recorded by `scripts/record-demo.mjs` against production, so it can be re-recorded after any change.

## Vision (paste into the BUIDL form)

Singapore has about 300,000 migrant domestic workers. They are excluded from the itemised-payslip requirement that protects other employees, 45.6% arrive already in debt to recruitment agents, and the Tripartite Alliance for Dispute Management logged 9,848 salary claims in 2024. When a salary does not arrive, the only evidence is the employer's word and the worker's screenshots. The same failure hits Gulf construction workers and the record 6,223 seafarers abandoned in 2025: the person who is harmed cannot prove what the more powerful party knows.

Ledgerline gives the worker the record. Each month she marks paid or not paid; the entry is signed by a key that lives only on her phone and written to Base as an attestation, with a relayer paying gas so she never sees a wallet. Her employer confirms or disputes each month from a WhatsApp link, signed from their own phone; silence after three days is shown as evidence. When pay is missing she proves, from her own bank statement page, that no salary-sized credit arrived in the pay window, disclosing only that predicate and never her balance. She then shares a dispute bundle for the months she chooses; a caseworker or mediator opens the verifier, which re-checks every signature and proof against the chain and prints a plain-English summary.

Why Web3: no party in the relationship can be the custodian of the record; timestamps are neutral and cannot be back-dated by either side; disclosure is selective; and the record is portable to the next employer or country. Names, notes and balances never go on chain. Recovery words let her open the same record on a new phone; months, employer answers and proofs are rebuilt from the chain.

What is real: delegated EAS attestations (the on-chain attester is the worker's or employer's own key), EIP-712 signatures, staged transactions, the verifier, backup and restore. What is synthetic: the sample worker and the bank, which stands in for a DBS or POSB statement page. The bank proof has two methods with one data shape: Reclaim zkFetch (zkTLS) when credentials are set, otherwise a signed attestor stand-in, labelled honestly in the UI and the verifier.

Next six months with the incubation grant: one real bank statement provider via zkTLS, a pilot with a Singapore migrant-worker NGO and 50 workers, recruitment-fee receipts, and measured outcomes of dispute bundles at mediation.

## 30-second demo

Maria's record, nine months, July red. Tap July. "Prove from my bank." Reading your statement window → Signing → Sending → Confirming → Proof recorded. "No credit of S$600 or more from the employer between 2026-07-01 and 2026-07-10." The balance never appears. Switch to the verifier: green, red, green, one sentence.

## 2-minute demo script

1. (0:00) Landing page. "Singapore's domestic workers are excluded from the itemised payslip rule. When pay goes missing, there is no evidence." Click **Try the sample**.
2. (0:15) Nine months, July red. "Each month is a signed record on Base. She never sees a wallet." Open a paid month: signed, employer confirmed, on-chain link.
3. (0:35) **Ask employer to confirm**: show the WhatsApp link and QR. Open it as the employer on a second screen: Confirm one month; stages run; the answer is signed from the employer's phone. Back in the app: **Check for confirmations**.
4. (1:00) July: "The employer did not confirm." Tap **Prove from my bank**. Stages. The proof sentence. "Only the pay window was disclosed."
5. (1:25) **Build dispute bundle**, select July, open the verifier: three checks, the summary sentence. "Anyone can verify this without trusting us."
6. (1:45) **Back up my key** → recovery words. "Lose the phone, keep the record." Close: honesty table (synthetic bank, real attestations), roadmap, incubation plan.

## Judging criteria mapping

- Social impact & relevance (30%): named population, three sourced statistics, a daily behaviour (payday) and the moment it fails.
- Solution quality (25%): product architecture, design system, staged states, error handling, tests, CI, recovery.
- Innovation & meaningful Web3 (20%): counter-evidence held by the weaker party; delegated attestations as the person's own signature; negative proofs from a bank page; selective disclosure bundles.
- Feasibility & sustainability (15%): no token, no custody; a relayer and an attestor are the only infrastructure; a six-month pilot plan.
- Pitch (10%): one scene, one sentence, one verifier.
