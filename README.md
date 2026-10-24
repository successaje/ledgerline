# Ledgerline

**The payslip the employer cannot take back.**

A worker-held, employer-countersigned, bank-proven pay record for migrant domestic workers. Each month the worker records whether she was paid, signed by a key that lives only on her phone and written to Base through the Ethereum Attestation Service. Her employer confirms from a WhatsApp link. When pay goes missing, she proves it from her own bank statement page without revealing her balance, and shares a bundle that anyone can verify against the chain.

Live: **https://ledgerline-sg.vercel.app** · Built for the Web3 for Social Good Hackathon 2026 (SMU, GSR Foundation, University of Málaga), Tech Track · Base Sepolia, testnet only, no real funds.

## Problem

Singapore has about 300,000 migrant domestic workers. They are excluded from the itemised-payslip requirement that protects other employees; 45.6% arrive already in debt to recruitment agents (Majurity Trust, 2025); the Tripartite Alliance for Dispute Management logged 9,848 salary claims in 2024. When a salary does not arrive, the only evidence is the employer's word and the worker's screenshots. The same failure applies to Gulf construction workers and to the record 6,223 seafarers abandoned in 2025.

The root failure is **counterparty capture of records**: the person who is harmed cannot prove what the more powerful party knows.

## Solution

| Step | What happens | What goes on chain |
|---|---|---|
| Record | Worker marks a month paid or not paid. Signed on the device; a relayer pays gas. | PayEvent attestation, attester = worker's key |
| Countersign | Employer opens a link, taps Confirm or Dispute. Silence after three days is shown as evidence. | Countersign attestation, attester = employer's key, refUID = the month |
| Bank proof | For a missing month, "no credit of S$600 or more from the employer between the 1st and the 10th" is proven from the statement page. Only that predicate and the matching rows are disclosed. | BankProof attestation with the hash of the proof |
| Bundle | Worker selects the months to disclose; a link and QR let a mediator verify everything against the chain and read a plain-English summary. | Nothing new; the verifier reads |

Names, notes and balances never go on chain. Ids are hashes of keys and labels.

## Why a public chain, not our database

- **No custodian.** Not the employer, not the agency, not an NGO, not us. The record survives a lost phone (with the recovery words), a new employer and a new country.
- **Neutral timestamps.** "The employer did not confirm within three days" is checkable by anyone and cannot be back-dated by either side.
- **Selective disclosure.** A bundle contains only the chosen months; a proof contains only the predicate.
- **Portability.** Any verifier in any country can read the attestations with no integration with the party that produced them.

## What is real and what is synthetic

| Component | Status |
|---|---|
| Pay-event, countersign and bank-proof attestations on Base Sepolia | Real. Delegated EAS attestations; the on-chain attester is the worker's or employer's own key; the relayer only pays gas. |
| Worker and employer signatures (EIP-712), transaction stages, verifier | Real. The client watches the transaction and parses the `Attested` event for the UID. |
| Key backup and restore, rebuild of the ledger from chain | Real. |
| The worker "Maria" and her nine months of pay | Sample data, one tap away in onboarding. Anything you do with it is a real test-network attestation. |
| The bank | Synthetic. `/bank` stands in for a DBS or POSB statement page. |
| The bank proof | Two methods, identical data shape. Method 1: Reclaim zkFetch (zkTLS) over the statement endpoint when `RECLAIM_APP_ID` and `RECLAIM_APP_SECRET` are set. Method 2: the synthetic bank's attestor signs the extracted window. The UI and the verifier label which method produced each proof. |

Production path: replace the synthetic bank with a zkTLS provider for a real statement page (Reclaim's provider builder, or TLSNotary MPC mode for sensitive portals); the schemas, the verifier and the app do not change.

## Architecture

```
src/
  app/            Next.js routes: / (landing), /app (worker), /employer, /verify, /bank, /api/*
  components/
    ui/           Design system: tokens in globals.css, Button, Pill, Notice, Stages, Sheet, Toasts, Field, Skeleton, Shell
    ledger/       Onboarding, LedgerList, ShareSheet, BundleSheet, SidePanel, RecoverySheet
    landing/      DemoLedger (the product's key screen, rendered statically)
  hooks/          useLedger (all worker behaviour), useConfig, useToast
  services/       chain (constants + EAS indexer client), attest (delegated attestation with stages), keys (device keys, backup, restore),
                  recovery (rebuild from chain), ledger-store (local-first state), verify (bundle verification), errors (user-facing messages), api
  server/         relayer (RPC fallback, serialised sends), proof (zkFetch or signed attestor), bank-data (synthetic statement)
  domain/         types, format, ids, bundle codec, proof verification (pure; unit-tested)
scripts/          register-schemas.cjs (idempotent schema registration)
docs/PRODUCT.md   product model; BUILD_LOG.md; SCHEMAS.md
```

Flow of a record: `useLedger.record` → `services/attest.delegatedAttest` (encode, sign EIP-712 with the device key) → `POST /api/attest` → `server/relayer.submitDelegatedAttestation` (returns the tx hash immediately) → client waits for the receipt, parses `Attested`, stores the UID locally. Stages shown: Preparing → Signing on this device → Sending to Base → Confirming on chain → Recorded.

## Sponsor and ecosystem technology

- **Ethereum Attestation Service on Base Sepolia.** Three schemas (see [SCHEMAS.md](SCHEMAS.md)). Delegated attestations (`attestByDelegation`) so the attester is the person, not the server. Indexed by the EAS GraphQL API for the verifier and for recovery.
- **Reclaim zkFetch (optional).** zkTLS proof over the statement endpoint; enabled by credentials, otherwise an honest signed-attestor stand-in with the same shape.
- No token, no governance, no custody.

## Languages

The worker app is available in English, Tagalog and Bahasa Indonesia. The language follows the phone's setting (`tl`/`fil` → Tagalog, `id` → Bahasa Indonesia) and can be changed in the header or in Settings; the choice is remembered on the device. Strings live in `src/i18n/en.ts`, `tl.ts` and `id.ts`; the `Dict` type guarantees every key exists in every language. The Tagalog and Bahasa Indonesia texts were written without a native reviewer: corrections are welcome as pull requests against those two files.

## Chain details

- Network: Base Sepolia (chain id 84532). EAS `0x4200000000000000000000000000000000000021`, Schema Registry `0x4200000000000000000000000000000000000020`.
- PayEvent `0x727cb593e24f6443adeab5c76f7d32346bee1946f2f655f596df75bd86129e5c` · Countersign `0x41a9799c98f850f33f146251c65f65d2b36be5833dc4936fcd88a0a59dac65c2` · BankProof `0xf5956e3b0cc6f69c8f93f008b75e7de329b84fdd3bc45db96bee7167bce503df`
- Relayer (gas only) `0x58C90453b6cdEc0aC348C4D6ef4a3470E63aC7fb` · Synthetic bank attestor `0x511f493a74505E7420E9850E3E4978110D072379`

## Local development

```bash
cp .env.example .env.local        # fill RELAYER_PRIVATE_KEY (funded on Base Sepolia) and BANK_ATTESTOR_PRIVATE_KEY
npm install
npm run schemas                   # idempotent; writes schemas.env, copy the three UIDs into .env.local
npm run dev                       # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `RPC_URL`, `NEXT_PUBLIC_RPC_URL` | Base Sepolia RPC (server and client). The relayer falls back to public RPCs. |
| `RELAYER_PRIVATE_KEY` | Pays gas for delegated attestations. Testnet only. |
| `BANK_ATTESTOR_PRIVATE_KEY`, `NEXT_PUBLIC_BANK_ATTESTOR_ADDRESS` | Signs statement-window proofs (method 2). |
| `NEXT_PUBLIC_SCHEMA_PAYEVENT`, `_COUNTERSIGN`, `_BANKPROOF` | Schema UIDs. |
| `RECLAIM_APP_ID`, `RECLAIM_APP_SECRET` | Optional; enables zkFetch (method 1). |
| `NEXT_PUBLIC_BASE_URL` | Public URL, used by zkFetch to reach the statement endpoint. |

## Testing

```bash
npm run typecheck
npm test            # vitest: bundle codec, proof verification, formatting, synthetic statement
npm run build
```

CI runs all three on every push and pull request.

## Deployment

Vercel, from `main`. Set the variables above in the project; `maxDuration` is 60 s for the relayer route. Production: https://ledgerline-sg.vercel.app

## Demo path

1. Open `/app`, tap **Load sample record**. Nine months, July red.
2. **Record 9 draft months**; watch each go Preparing → Signing → Sending → Confirming → Recorded.
3. **Ask employer to confirm** → open the link as the employer → Confirm every month except July.
4. Back in the app, **Check for confirmations**. July stays unanswered; tick "treat the employer window as elapsed" to show the three-day rule.
5. Open July, **Prove from my bank**. "No credit of S$600 or more from the employer between 2026-07-01 and 2026-07-10." The balance never appears.
6. **Build dispute bundle** → July → open the verifier: green, red, green, and a sentence a mediator can read in ten seconds.
7. **Back up my key** → **Clear this record** → **Restore from recovery words**: the months, answers and proofs come back from the chain.

## Roadmap

Real bank providers via zkTLS; MiniPay distribution; recruitment-fee receipts; seafarer and Gulf modes; an attested legal-aid assistant that reads the worker's own record; "fair employer" reputation from countersign history; a pilot with a Singapore NGO and 50 workers funded by the incubation grant.

## Licence

MIT.
