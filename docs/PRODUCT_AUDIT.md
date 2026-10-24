# Product audit and improvement backlog

Date: 24 Oct 2026, after the hackathon submission. The implementation on `main` is the source of truth.

## What exists today

| Area | State |
|---|---|
| Pages | `/` landing · `/app` onboarding + ledger · `/employer` countersign · `/verify` bundle verifier · `/bank` synthetic statement |
| Identity | Device key per role (worker, employer), created silently; 12-word recovery phrase; restore rebuilds from chain |
| Persistence | Local-first ledger in `localStorage`; chain is the source of truth for recorded months, employer answers and proof hashes |
| Chain | Base Sepolia; EAS delegated attestations (attester = person's key); relayer pays gas with RPC fallback and serialised sends |
| States | Staged transactions, user-facing errors, skeletons, empty onboarding, sample record, demo fast-forward |
| Mobile | Responsive; sticky action bar; bottom sheets |
| Docs | README, PRODUCT, SCHEMAS, BRAND, SUBMISSION, BUILD_LOG; CI with typecheck, tests, build |
| Missing | Returning-user view, activity feed, month editing, settings, reconciliation after a refresh mid-transaction, relayer abuse protection, print/PDF bundle, help and privacy pages, analytics, offline shell, languages |

## Feature depth classification

| Feature | Today | To reach polished |
|---|---|---|
| Record a month | polished | Edit amount, partial payment, note; re-record supersedes |
| Employer countersign | functional | Employer sees previous answers; reminder copy; "start your own record" loop |
| Bank proof | functional (synthetic) | Real provider; proof detail view; retry copy |
| Dispute bundle | functional | Print/PDF; bundle history; expiry note |
| Verifier | polished | Print stylesheet; shareable verdict summary |
| Recovery | functional | Merge-sync (not only restore); multi-device reconciliation |
| Onboarding | polished | Pay window and confirmation window choices; language |
| Landing | polished | Live demo link, FAQ, trust section |
| Returning user | placeholder | Since-last-visit, due month, pending answers, activity |

## Scorecard (1–10)

| Category | Score | Why it is below 9 |
|---|---|---|
| Product clarity | 9 | |
| UX | 7 | No month editing; no reconciliation after refresh mid-tx; employer page is single-shot |
| UI | 8 | Consistent system; year grouping and long labels untested at scale |
| Personalization | 4 | Same view every visit; nothing remembered beyond the ledger |
| Onboarding | 8 | No pay-window choice; no language |
| Responsiveness | 8 | Untested on tablet widths between 760 and 960 |
| Mobile quality | 7 | No install prompt or offline shell; sheets lack focus trap |
| Performance | 6 | `/app` ships ethers + EAS SDK on first paint (587 kB); nonce reads per action |
| Loading states | 8 | Verifier shows per-item progress; employer "preparing" can take 15 s with no explanation |
| Errors | 8 | Good copy; no automatic reconciliation when a tx was mined but the tab closed |
| Empty states | 8 | Bundle sheet, employer link; activity feed missing |
| Architecture | 8 | Clean layers; relayer and proof routes need abuse protection |
| Reliability | 6 | Relayer is an open gas faucet; public RPC nonce reads; indexer lag not retried automatically |
| Security | 5 | No rate limiting, no schema allow-list on the relayer, no security headers |
| Documentation | 9 | |
| Retention | 4 | No reason to return until payday; nothing reminds; nothing summarises |
| Discoverability | 7 | Settings hidden in a details element; no help or privacy page |
| Growth | 6 | Employer and verifier pages do not invite the recipient to start their own record |
| Accessibility | 7 | Sheets do not trap focus; some icon-only buttons; contrast fine |
| Overall maturity | 7 | |

## Backlog

### Critical
1. **Relayer abuse protection.** Problem: anyone can spend the relayer's gas. Change: allow-list our three schemas, verify the delegated signature off-chain before sending, per-IP and per-attester rate limits, body size cap, security headers. Impact: the service survives public exposure. Difficulty: low. Files: `server/relayer.ts`, `api/attest`, `next.config`.
2. **Reconciliation.** Problem: a refresh during "Confirming" loses the local link to a mined record; a second device shows nothing. Change: on load and on demand, merge chain records for the worker key into the local ledger (keep local detail, adopt chain UIDs, dedupe by period). Impact: records are never "lost". Difficulty: medium. Files: `services/recovery.ts`, `hooks/useLedger.ts`.

### High impact
3. **Returning-user home.** Since-last-visit summary (new confirmations, new disputes), "This month is due" prompt after the pay window, pending employer answers count, auto-sync on open. Files: `app/app/page.tsx`, new `components/ledger/Today.tsx`.
4. **Activity feed.** Human-readable history derived from the ledger: "Recorded September", "Employer confirmed August", "Bank proof added for July". Files: `domain/activity.ts`, `components/ledger/Activity.tsx`.
5. **Edit a month.** Amount, partial payment, note; re-recording writes a new attestation that supersedes (latest per period). Files: `components/ledger/MonthSheet.tsx`, `useLedger.record`.
6. **Settings.** Name, employer label, salary, pay window, confirmation window, export JSON, clear. Files: `components/ledger/SettingsSheet.tsx`.
7. **Lazy-load chain code.** Dynamic import of `services/attest` and the EAS SDK so `/app` paints without 480 kB of wallet code. Files: `hooks/useLedger.ts`.

### Product depth
8. **Print-ready verifier and bundle PDF.** Print stylesheet, "Save as PDF" button, issuer and verification date in the header. Files: `app/verify/page.tsx`, `globals.css`.
9. **Employer inbox.** `/employer` without a payload lists previously answered requests from this device and explains the role. Files: `app/employer/page.tsx`.
10. **Year grouping** in the ledger for records beyond 12 months. Files: `LedgerList.tsx`.
11. **Help and privacy pages.** What is on chain, what is not, who can see what, how recovery works. Files: `app/help`, `app/privacy`.

### Personalization
12. Remember last opened month, preferred share channel (WhatsApp vs copy), dismissed banners; default the bundle to unpaid months of the last 12.

### Growth
13. **Recipient loops.** "Start your own record" on the employer page after answering, and on the verifier footer; share copy that explains the product in one line. Files: employer, verify pages.

### Mobile
14. **Installable PWA.** Minimal service worker with offline shell for `/app` (records are local; chain calls fail gracefully), install prompt after the first recorded month, iOS splash meta. Files: `public/sw.js`, `app/layout.tsx`.

### Visual polish
15. Focus trap and return-focus in sheets; year headers; long-label ellipsis; employer "preparing" explanation copy; consistent icon-button labels.

### Engineering
16. **Analytics** with privacy-preserving events (no PII, no keys): record started/done, proof done, bundle created, verifier opened, restore done. Vercel Analytics custom events. Files: `services/analytics.ts`.
17. Indexer retry with backoff; nonce caching; tests for reconciliation and activity derivation.

### Future bets
18. Languages: Tagalog, Bahasa Indonesia, Burmese, Bengali for the worker app (needs native review).
19. Telegram or WhatsApp reminders on payday and when an employer answers (needs a notification identity; opt-in).
20. Real bank providers via zkTLS; NGO caseworker console with consented aggregate view; recruitment-fee receipts; seafarer mode.

## Competitor benchmark (maturity, not template)

- **Payslip and HR apps (Payboy, Talenox):** polished history, PDF export, per-month detail. We need month editing, export and print.
- **M-Pesa / GrabPay statements:** reconciliation and dispute flows with receipts and timelines. We need a human-readable activity feed and recovery after interruption.
- **Expense trackers (Splitwise):** returning-user summaries and reminders. We need a "today" view and due prompts.
- **Where they are weak:** none let the user hold evidence the counterparty cannot alter, or prove a single fact to a third party without the rest. That stays our moat; everything above exists to make people come back often enough to accumulate it.

## Lifecycle

- Day 0: sample record or first real month in under a minute; employer link sent.
- Day 1: employer answered; worker sees it on open without pressing anything.
- Week 1: nothing to do, which is the point; a due prompt on the next payday.
- Month 1: three months recorded, confirmations accumulating; the record starts to be worth more than screenshots.
- Month 6: a missing month becomes a bundle in one tap, with six months of confirmed context; switching away would mean losing a countersigned history no other app has.

## What would reveal "hackathon" next to a real product

1. Open relayer with no abuse protection. 2. Losing a record on refresh. 3. The same screen on every visit. 4. No way to edit a month or a salary. 5. No print or PDF for the one artefact that leaves the app. 6. Heavy first paint. 7. No help or privacy page. 8. English only for a Tagalog- and Bahasa-speaking audience.

Items 1 to 7 are addressed in the first three pull requests below; item 8 is a future bet needing native speakers.
