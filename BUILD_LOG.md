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
- [ ] README complete; demo script; BUIDL text
