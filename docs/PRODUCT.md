# Ledgerline product model

## Thesis
The weaker party in an employment relationship should hold the authoritative, portable record of what happened, and be able to prove any single fact from it without exposing the rest.

## Core user
A migrant domestic worker in Singapore (about 300,000 people), paid monthly, usually by bank transfer, without a legally required itemised payslip. Secondary users: the NGO caseworker or mediator who reads her record, and the employer who countersigns it.

## Core action
Record this month's pay (paid or not) as a signed, timestamped attestation she owns, and, when pay is missing, prove it from her own bank page without revealing anything else.

## Product loop
Payday → record → employer confirms from a link → month turns green. Twelve months later she has a history no employer can rewrite. The first time pay goes missing, the record becomes a dispute bundle in one tap. Each resolved dispute brings the NGO back with the next worker; each confirmed month gives the employer a reputation worth keeping.

## Magical interaction
"Prove from my bank": fifteen seconds later the phone shows "No credit of S$600 or more from the employer between 1 and 10 July" and nothing else. The balance never appears, and a stranger can verify it.

## Why Web3 (hackathon relevance)
Attestations on a public chain give the record three properties no database owned by one party can give: no custodian, neutral timestamps, and portability across employers, agencies and countries. Selective disclosure (bundle months, predicate-only proofs) keeps the worker in control of what is revealed.

## Essential flows
| Flow | What happens |
|---|---|
| First visit (`/`) | Landing explains the product in one screen and opens the app. |
| Onboarding (`/app`) | A key is created silently on the device. The worker enters her name, employer label and monthly salary. No wallet, gas or seed phrase. A sample ledger can be loaded for evaluation. |
| Primary action | Mark a month paid or unpaid → stages: Preparing → Signing on this phone → Submitting → Confirming → Recorded. |
| Employer countersign (`/employer`) | Link opened from WhatsApp; one screen; Confirm or Dispute per month; key created silently. |
| Bank proof | Unpaid month → Prove from my bank → stages: Reading statement window → Building proof → Recording → Proven. |
| Dispute bundle | Select months → link + QR → `/verify` re-checks everything from chain and prints a summary. |
| History | The timeline is the history; each month expands to show attestations and proofs. |
| Error recovery | Relayer out of gas, RPC timeout, indexer lag, rejected proof each have a specific message and a retry. Records are never lost: they are either on chain or still local and marked as such. |
| Returning user | State is local-first; on-chain records are re-synced from the indexer by worker key. |

## Out of scope for this release
MiniPay packaging, real bank zkTLS providers, recruitment-fee receipts, seafarer and Gulf modes, NGO dashboards, AI assistant, any token.
