# Redesign completion report

Branch `redesign/paybook`, 24 Oct 2026. Four commits on top of `main` at PR #15. Merged to `main` on 24 Oct 2026 after the owner's authorization; `main` deploys to https://ledgerline-sg.vercel.app.

## What changed

**Information architecture.** The worker app is now three destinations: Home (`/app`), Records (`/app/records`, `/app/records/[period]`) and Settings (`/app/settings`), with the record flow at `/app/record`, onboarding at `/app/start` and sharing at `/app/share`. A single ledger provider wraps every worker route so an in-flight publish survives navigation.

**Record model.** A record now carries expected pay, the amount recorded as received, an optional date received, a submission state (Draft, Awaiting confirmation, Submitted, Confirmed, Failed, Status unknown), and for corrections the id it supersedes plus the earlier versions. Ledgers saved by the previous release are normalised on load; "not paid" months that stored the owed amount are read as zero received.

**Record flow.** Month, Payment, Supporting information, Review. Review shows the amounts, a payload preview of exactly the fields written to Base Sepolia, a list of what stays on the phone, and a consent checkbox before "Publish test record". A correction is announced as such and the earlier record stays visible.

**Submission states.** The publish path moves draft → awaiting → submitted (transaction hash known) → confirmed, or to failed (nothing sent) or unknown (sent, result not learnt). Unknown records are resolved from the transaction receipt ("Check status") or on the next sync; the Home attention list surfaces them first.

**Employer.** Acknowledge or Disagree per month, a confirmation step stating what is published, the worker's response deadline, and a plain explanation of what a response is not (not a payslip, not identity verification, silence is not wrongdoing).

**Verifier.** Outcomes are Passed, Failed, Not checked, Unavailable with a category per check; one response window carried by the bundle; "Demo bank data, attestor signed" wording; the summary sentence says received versus expected.

**Design system.** Blueprint palette, type scale, 4 px grid, 48 px controls, 16 px corners, motion durations with reduced-motion handling, visible focus. Pale fills are backgrounds only.

**Languages.** Every new string has Tagalog, Bahasa Indonesia, Burmese and Bengali drafts (258 keys each). They were machine-drafted and are not native-reviewed; the language step and the files say so.

## Files

- changed `.gitignore`
- changed `docs/REDESIGN_AUDIT.md`
- added `e2e/paybook.spec.mjs`
- added `playwright.config.mjs`
- added `scripts/screenshots.mjs`
- added `src/app/app/layout.tsx`
- changed `src/app/app/page.tsx`
- added `src/app/app/record/page.tsx`
- added `src/app/app/records/[period]/page.tsx`
- added `src/app/app/records/page.tsx`
- added `src/app/app/settings/page.tsx`
- added `src/app/app/share/page.tsx`
- added `src/app/app/start/page.tsx`
- changed `src/app/employer/page.tsx`
- changed `src/app/globals.css`
- changed `src/app/page.tsx`
- changed `src/app/verify/page.tsx`
- removed `src/components/landing/DemoLedger.tsx`
- removed `src/components/ledger/Activity.tsx`
- removed `src/components/ledger/BundleSheet.tsx`
- removed `src/components/ledger/LedgerList.tsx`
- removed `src/components/ledger/MonthSheet.tsx`
- removed `src/components/ledger/Onboarding.tsx`
- removed `src/components/ledger/RecoverySheet.tsx`
- removed `src/components/ledger/SettingsSheet.tsx`
- removed `src/components/ledger/SidePanel.tsx`
- removed `src/components/ledger/Today.tsx`
- changed `src/components/ui/Icon.tsx`
- added `src/components/worker/Backup.tsx`
- added `src/components/worker/Frame.tsx`
- added `src/components/worker/LedgerContext.tsx`
- added `src/components/worker/WorkerShell.tsx`
- added `src/components/worker/bits.tsx`
- added `src/domain/__tests__/paybook.test.ts`
- changed `src/domain/bundle.ts`
- added `src/domain/paybook.ts`
- changed `src/domain/types.ts`
- changed `src/hooks/useLedger.ts`
- changed `src/i18n/bn.ts`
- changed `src/i18n/en.ts`
- changed `src/i18n/id.ts`
- changed `src/i18n/index.tsx`
- changed `src/i18n/my.ts`
- changed `src/i18n/tl.ts`
- added `src/services/__tests__/analytics.test.ts`
- added `src/services/__tests__/ledger-store.test.ts`
- added `src/services/__tests__/verify.test.ts`
- changed `src/services/analytics.ts`
- changed `src/services/attest.ts`
- changed `src/services/ledger-store.ts`
- changed `src/services/recovery.ts`
- changed `src/services/verify.ts`

Screenshots: `docs/screenshots/*-{320,375,768,1440}.png` for landing, start, home, records, record detail, record flow review, share, settings, employer and verify.

## Tests

`npx vitest run`: 45 passed (10 files). New: `verify.test.ts` (8), `analytics.test.ts` (2), `paybook.test.ts` (13), `ledger-store.test.ts` (3).

`npx playwright test`: 6 passed. Scenarios: landing entry points and test-network label; onboarding with backup check (wrong word rejected, right words accepted, words never in the URL); Home paybook and detail for the sample; record flow validation, payload preview excludes the note, consent gates publishing, draft saved, filters; restore conflict stop; share preselects nothing and the employer page confirms before signing. None of the scenarios publish an attestation.

`npx tsc --noEmit` and `next build` clean.

Not exercised in this session: an end-to-end publish on Base Sepolia from the new flow. The blueprint said not to assume permission to publish attestations, so the state machine is covered by unit tests on the derived views and by the receipt-resolution path, not by a live transaction. The existing demo recorder (`scripts/record-demo.mjs`) targets the previous UI and will need updating before it is run again.

## Environment

- macOS 15.5, Node 24.2.0, Next.js 15.5.28, React 19
- Playwright 1.64.1 with Chromium 156.0.8078.4 (headless) for e2e, screenshots and vitals
- Manual checks in the desktop app's built-in browser at 375 × 812 and 1440 × 900

## Web Vitals

Measured with `node scripts/screenshots.mjs http://localhost:3001` against the production build served by `next start`, cold context per width, reduced motion. INP is not measurable headless and is not reported. Values are milliseconds except CLS.

|---|---|---|---|---|---|---|
| landing | 320 | 21 | 92 | 92 | 0 | none |
| start | 320 | 8 | 52 | 52 | 0 | none |
| home | 320 | 5 | 28 | 56 | 0 | none |
| records | 320 | 3 | 32 | 32 | 0 | none |
| record-detail | 320 | 45 | 60 | 92 | 0 | none |
| record-flow-review | 320 | 19 | 72 | 72 | 0 | none |
| share | 320 | 8 | 52 | 52 | 0 | none |
| settings | 320 | 5 | 20 | 40 | 0 | none |
| employer | 320 | 11 | 24 | 124 | 0 | none |
| verify | 320 | 13 | 24 | 48 | 0 | none |
| landing | 375 | 5 | 32 | 32 | 0 | none |
| start | 375 | 4 | 52 | 52 | 0 | none |
| home | 375 | 5 | 24 | 56 | 0 | none |
| records | 375 | 5 | 52 | 52 | 0 | none |
| record-detail | 375 | 28 | 48 | 96 | 0 | none |
| record-flow-review | 375 | 15 | 60 | 60 | 0 | none |
| share | 375 | 16 | 68 | 68 | 0 | none |
| settings | 375 | 4 | 16 | 36 | 0 | none |
| employer | 375 | 8 | 28 | 84 | 0 | none |
| verify | 375 | 3 | 20 | 28 | 0 | none |
| landing | 768 | 5 | 64 | 64 | 0 | none |
| start | 768 | 3 | 48 | 48 | 0 | none |
| home | 768 | 4 | 24 | 52 | 0 | none |
| records | 768 | 3 | 36 | 36 | 0 | none |
| record-detail | 768 | 12 | 28 | 44 | 0 | none |
| record-flow-review | 768 | 5 | 52 | 52 | 0 | none |
| share | 768 | 7 | 36 | 36 | 0 | none |
| settings | 768 | 5 | 24 | 56 | 0 | none |
| employer | 768 | 8 | 28 | 84 | 0.05 | none |
| verify | 768 | 8 | 28 | 36 | 0 | none |
| landing | 1440 | 9 | 36 | 36 | 0 | none |
| start | 1440 | 8 | 60 | 60 | 0 | none |
| home | 1440 | 5 | 32 | 64 | 0.039 | none |
| records | 1440 | 5 | 44 | 44 | 0 | none |
| record-detail | 1440 | 9 | 24 | 68 | 0.039 | none |
| record-flow-review | 1440 | 4 | 40 | 40 | 0 | none |
| share | 1440 | 3 | 32 | 32 | 0 | none |
| settings | 1440 | 3 | 20 | 36 | 0.039 | none |
| employer | 1440 | 3 | 16 | 48 | 0.017 | none |
| verify | 1440 | 3 | 20 | 32 | 0 | none |

The earlier CLS of 0.1 on Home, detail and Settings came from the demo banner inserting itself above the page after hydration; it is now a fixed strip above the bottom navigation and CLS is 0 on every page.

## Accessibility notes

- Every control is at least 48 px tall; focus rings are 2 px with offset; choice cards and the consent row are native radio / checkbox inputs with visible labels.
- Error summaries link to the field; fields set `aria-invalid`.
- Sheets trap focus and return it; the skip link targets `#main`.
- No horizontal overflow at 320 px on any captured page (the script checks `scrollWidth`).
- Not done: a screen-reader run and a full 200% zoom pass. Both are listed under unresolved items.

## Privacy and telemetry

- Recovery words render only after an explicit tap, never in a URL, never in analytics (`sanitise` drops any property whose name looks sensitive and any string over 32 characters; two tests cover it), and the backup check compares locally.
- The payload preview on Review is built from the same fields the attestation encodes; names, notes, expected pay and the date received are listed as not published.

## Unresolved dependencies (owner decisions)

1. ~~PayEvent v2 schema~~ Registered as `0xb30a394de0f0e18c20ca0710fcc8f6670587d7247e653cc98f32c99c22e9bb30` after the owner's go-ahead; the app writes v2 (expected, received, supersedes on chain) and still reads v1 records. Verifier and reconciliation handle both.
2. ~~Merge and deploy~~ Authorized; merged as PR #16.
3. **Native review of the four translations.**
4. **Demo recorder** rewrite for the new UI before any new demo video.
