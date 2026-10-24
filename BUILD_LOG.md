# Build log

- [x] Repository initialised, pushed to GitHub (successaje/ledgerline)
- [x] EAS schemas registered on Base Sepolia (see SCHEMAS.md)
- [x] Delegated attestation path verified: worker key is the on-chain attester, relayer pays gas
- [x] Synthetic bank + statement-window proof API (signed attestor; zkFetch path optional)
- [x] Product architecture: `src/` split into components, hooks, services, domain (PR #1)
- [x] Design system: tokens, buttons, status pills, cards, toasts, staged transaction states (PR #1)
- [x] Routes: `/` landing, `/app` worker, `/employer`, `/verify`, `/bank` (PR #1)
- [x] Onboarding (name, employer, salary; sample ledger) (PR #1)
- [x] Primary workflow end-to-end with staged states, verified on Base Sepolia
- [ ] Error, loading and empty states pass
- [ ] Responsive pass (mobile, tablet, desktop)
- [x] Unit tests and CI (PR #2, #3)
- [x] Key backup, restore and rebuild from chain (PR #4)
- [x] Deployed to Vercel: https://ledgerline-sg.vercel.app
- [x] README complete; demo script; BUIDL text
- [x] Brand kit, icons and Open Graph (PR #6)
- [x] Submitted: Tech Track (build 50263) and Idea Track companion Due Process (build 50257)

## Post-submission production pass (24 Oct 2026)
- [x] Audit, scorecard and backlog (docs/PRODUCT_AUDIT.md)
- [x] Relayer hardening, security headers, lazy-loaded chain code (PR #7)
- [x] Returning-user view, chain reconciliation, activity feed, month editing, settings (PR #8)
- [x] Help and privacy pages, print-ready verifier, recipient loops (PR #9)
- [x] Product analytics, offline shell, install prompt (PR #10)
- [x] Focus-trapped sheets, indexer retries, employer inbox, verifier auto-retry (PR #11)
- [x] Languages: Tagalog, Bahasa Indonesia (PR #12), Burmese and Bengali (PR #13) for the worker app; native review still wanted
- [ ] Reminders on payday and when an employer answers (opt-in channel needed)
- [ ] Real bank statement provider via zkTLS

## 24 Oct 2026, evening: paybook redesign shipped

- PR #16 `redesign/paybook`: Home / Records / Settings, four-stage record flow with payload preview and consent, submission state model, employer Acknowledge / Disagree, verifier outcome taxonomy, blueprint tokens, four new translations, e2e tests, screenshots and vitals. Report in `docs/REDESIGN_REPORT.md`.
- PayEvent v2 schema registered on Base Sepolia (`0xb30a394d…bb30`) after the owner's go-ahead; the app writes v2 and reads v1.
- PR #17: overflow fixes after probing every page at twelve widths.
- PR #18: demo re-recorded on the redesigned product with a drawn cursor and no captions (`/demo/ledgerline-demo-2.mp4`); both DoraHacks builds point at it and the Tech Track description was rewritten for the new flow.
