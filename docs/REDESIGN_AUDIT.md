# Redesign audit, plan and decision log

Baseline: `main` at PR #15, 24 Oct 2026. Branch for this work: `redesign/paybook`. Nothing in this branch is deployed to production until the owner authorizes a merge.

## 1. What exists today (verified in code, not from the blueprint)

| Area | Implementation | Real, demo or missing |
|---|---|---|
| Routes | `/` landing, `/app` worker (onboarding + ledger + sheets), `/employer` (link payload or inbox), `/verify` (bundle), `/bank` (synthetic statement), `/help`, `/privacy`; APIs `/api/attest`, `/api/bank/prove`, `/api/bank/statement`, `/api/config` | Real, except `/bank` which is a fixture |
| Identity | secp256k1 key in `localStorage` (`ll.key.worker`, `ll.key.employer`), 12-word BIP-39 phrase for keys created after PR #4, raw hex export for older keys; restore imports phrase or hex and rebuilds from chain | Real. Browser storage, not hardware custody |
| Records | `PayRecord { period, amountCents, status 1 paid / 2 unpaid / 3 partial, note, payEventUID, signedAt, countersign, proof }`; local-first in `ll.ledger.v1` | Real |
| On-chain | EAS on Base Sepolia, three schemas; delegated attestations (attester = person's key); relayer pays gas; reconciliation merges chain into local on open | Real, test network only |
| Employer response | Countersign attestation `decision` 1 confirm / 2 dispute referencing the worker's record; worker's statement is never overwritten | Real |
| Corrections | Re-record creates a new PayEvent; local merge keeps latest per period; no on-chain `supersedes` link | Partly: supersession is implied by time, not declared |
| Sharing | Bundle = selected months, base64url in the URL; verifier re-checks from the indexer | Real; unpaid months preselected (blueprint wants no default selection) |
| Bank evidence | `/api/bank/prove`: Reclaim zkFetch when credentials exist, else a signed-attestor stand-in over fixture data | Demo. Never a real bank |
| Languages | en, tl, id, my, bn for the worker app; employer, verifier, landing, help, privacy in English | Real, unreviewed by native speakers |
| Telemetry | Vercel Analytics custom events; payloads are counts and enums only | Real; checked below |
| Tests | 19 unit tests (domain, bank fixture); no component or end-to-end tests | Gap |

## 2. Findings against the blueprint (ordered by harm)

1. **Partial payment collapses to "paid" in three views.** `employer/page.tsx` ("worker says paid"), `verify/page.tsx` ("reported paid"), `BundleSheet.tsx`. The ledger list and activity feed handle it. Fix in Phase 1.
2. **Two response windows.** The worker's `confirmWindowDays` (settings, default 3) versus a hard-coded 3 in `services/verify.ts`; the verifier also writes "did not confirm" at day 0 rather than "Awaiting response". Fix in Phase 1: the bundle carries the window; the verifier shows the due time; before it, "Awaiting response".
3. **Verifier outcomes are binary.** `ok: true | false | null` with `null` used for "not indexed yet". Blueprint wants Passed, Failed, Not checked, Unavailable, with a timeout as Unavailable. Fix in Phase 1.
4. **Expected versus received is not modelled.** `amountCents` means "received" for paid or partial and "expected salary" for unpaid. The blueprint's S$700 expected / S$500 received fixture cannot be expressed on chain without overloading. Needs a v2 schema (decision 2 below). Local model and review payload preview can carry both now.
5. **No declared supersession.** Corrections should reference the original; needs a `supersedes` field (same v2 schema).
6. **Submission state model is implicit.** Stages exist (preparing → signing → submitting → confirming → done) but "Status unknown" after a lost response is not modelled; a refresh mid-flight relies on the next reconciliation. Phase 2 adds an operation record (`pending-ops`) with idempotent reconciliation before any retry.
7. **Home composition.** Today's `/app` stacks a today-panel, a nine-row ledger, a stats strip, a six-button panel and an activity feed. The blueprint's single current-month paybook with one next action is a composition change, not a palette change. Phase 2.
8. **Sharing defaults.** Unpaid months are preselected; no preview before copying; the "anyone with this link" statement is present but not prominent. Phase 3.
9. **Trust language.** "Employer confirmed", "bank proof", "On chain" pills; the verifier says "Worker's own record" (fine) and "Employer confirmed this month" (acceptable) but the bank line needs "Demo bank data" or "Attestor signed" labels everywhere. Phase 1 and 3.
10. **Telemetry** carries only enums and counts (`months`, `decision`, `ok`). No names, amounts, keys, phrases or share tokens. Keep it that way; add a test that fails if a sensitive key name appears in an event payload.
11. **Keys** are described in the help and privacy pages as living in the phone's local storage, which is accurate. The onboarding bullet "The app holds your key" should become the blueprint's "This device holds the key used to sign your records."
12. **Landing** promises nothing false, but the headline and sequence differ from the blueprint. Phase 2.

## 3. Plan

- **Phase 1 (this branch, first commits):** findings 1, 2, 3, 9; typed status taxonomy; tests for every downstream view with the S$700/S$500 fixture.
- **Phase 2:** tokens and components per the blueprint (palette, type scale, 48 px controls, motion spec, reduced motion); three-destination navigation (Home, Records, Settings); landing; onboarding (language → ownership → create → backup with verification); Home paybook; Records list and detail; the four-stage record flow with Review, payload preview and explicit consent; submission state model with reconciliation.
- **Phase 3:** restore with identity-versus-local distinction and conflict stop; corrections with declared supersession (needs decision 2); employer Acknowledge / Disagree with a single authoritative deadline; sharing with explicit selection and preview; verifier check categories.
- **Phase 4:** resilience (storage missing or full, offline draft, duplicate taps, unknown outcome), accessibility pass (keyboard, focus, 320 px, 200% zoom), translations for the new strings, Playwright end-to-end scenarios, screenshots at 320/375/768/1440, measured Web Vitals, and the completion report.

## 4. Decision log (owner decisions needed are marked ⚠)

| # | Decision | Status |
|---|---|---|
| 1 | Launch environment | Base Sepolia test network only; every write-path label says "test". No production chain. |
| 2 | ⚠ PayEvent v2 schema `bytes32 workerId, bytes32 employerId, uint32 period, uint256 expectedCents, uint256 receivedCents, uint8 status, bytes32 detailHash, bytes32 supersedes` | Registering it is one transaction from the relayer on Base Sepolia (balance 0.00093 ETH, sufficient). Until authorized, the app keeps writing v1 and the review preview shows exactly which v1 fields are published and states that expected/received are local only. |
| 3 | Key storage | Browser `localStorage`, phrase-backed. Described as such everywhere; never as secure custody. Hardware or passkey custody is out of scope for this branch. |
| 4 | Public schema and privacy | Month, amounts, status, hashed worker and employer ids, and a note hash are public and permanent. Stated on the review screen with explicit acknowledgment before publication. |
| 5 | Evidence storage | No attachments are stored by the service in this branch. The flow offers notes only and says so; attachment upload is scoped out rather than faked. |
| 6 | Employer identity | Possession of the link plus a device key. Shown as "signed from the device that opened the link", never "verified employer". |
| 7 | Share-link capabilities | Anyone with the link can open it; no expiry, password or revocation. Stated verbatim. |
| 8 | Demo-only parts | `/bank` and the signed-attestor proof path; the sample ledger. Labelled "Example" or "Demo" in every view that shows them. |
| 9 | ⚠ Merge and deploy | Not assumed. The branch gets Vercel preview URLs automatically; production stays on `main` until the owner merges. |

## 5. Risks

- The owner may decide against schema v2; then expected/received remain local-only and the review screen must say so (implemented that way by default).
- Translations for new strings are mine, not native-reviewed; the language step will say so.
- Storage-full and offline behaviour can be implemented and unit-tested but only partially end-to-end tested in headless Chromium.
- Core Web Vitals will be measured in a lab run, not from the field.
