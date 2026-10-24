# Idea Track companion entry

**Name:** Due Process

**One line:** Platform workers keep their own tamper-evident log of ratings, earnings and account events, and every deactivation starts a public appeal clock that the platform must answer on the record.

**Track:** Idea Track · **Relationship to Ledgerline (Tech Track):** same thesis, different population. Ledgerline gives domestic workers a pay record no employer can rewrite; Due Process gives platform workers an employment record no algorithm can erase.

---

## The social challenge

Delivery riders and ride-hail drivers are managed by software. A rating drops, an automated fraud flag fires, and the account is deactivated, often with no reason given and no person to appeal to. Human Rights Watch's 2025 study of US platform workers found most deactivated workers received no explanation. There is no quantitative base rate of unfair deactivations anywhere in the world, because the only records are held by the platforms. Spain already presumes employment for riders under the Rider Law; the EU Platform Work Directive must be transposed by 2 December 2026 and requires human review of significant automated decisions. The law now demands due process, but the worker still has no evidence to bring to it.

## Intended users and beneficiaries

- Riders and drivers in Spain and Southeast Asia, starting with Málaga and Singapore, the hackathon's host cities.
- Riders' associations and unions that need the first real deactivation statistics.
- Labour inspectorates and courts that need an evidence trail they can verify without the platform's cooperation.
- Platforms that want a cheap, credible way to show compliance with the Directive.

## The proposed solution

1. **Worker-held log.** Each week the worker takes a cryptographic snapshot of their own platform dashboard (rating, completed jobs, strikes, earnings) using a zkTLS web proof over their own logged-in session. Only the selected fields are extracted. The snapshot is signed by a key on the worker's phone and anchored as an attestation; the platform is never asked to cooperate.
2. **Appeal clock.** When the worker reports a deactivation, the log is attached and a public, timestamped clock starts. The platform (or, after a deadline, a bonded reviewer chosen under union and inspectorate rules) must answer on the record. Silence is itself recorded.
3. **Anonymous statistics.** Each worker holds a nullifier, so unions can publish deactivation and reversal rates per platform and city without any list of names.
4. **Evidence bundle.** Like Ledgerline, the worker chooses what to disclose. A labour lawyer or inspector opens a verifier that re-checks every signature and snapshot against the chain and prints a plain summary.

## How Web3 adds meaningful value

- **No custodian.** The platform cannot alter the worker's history; neither can the union or the app. The record survives a closed account.
- **Neutral clocks.** "The platform did not answer within the legal window" is checkable by anyone and cannot be back-dated by either side.
- **Sybil-resistant anonymity.** Nullifiers let unions aggregate real statistics without identity databases, which is what makes publishing them safe for workers.
- **Portability.** The same attestations work across platforms, cities and countries, and feed any verifier, including a court's.
- **Reuse.** The attestation schemas, device-key model, relayer, verifier and recovery flow are the ones already running in Ledgerline on Base Sepolia, so the first prototype is a new provider and a new appeal contract, not a new stack.

## Potential social impact

- The first dataset on platform deactivations produced by workers themselves, in time for the Directive's December 2026 deadline.
- Faster, cheaper reinstatements: an appeal with evidence attached instead of a social-media campaign.
- A compliance channel platforms can adopt, which turns an adversarial record into shared infrastructure.
- A pattern that generalises: any population managed by a counterparty's database (gig workers, migrant workers, benefit claimants) can hold counter-evidence the same way.

## What a prototype would show (if shortlisted)

Thirty seconds: a deactivation notice, a swipe, the worker's own twelve-month record, and a ticking appeal clock. Two minutes: a union dashboard with anonymous rates by platform, a bonded reviewer resolving a case the platform ignored, and the verifier reading the bundle.

## Why this team

Ledgerline (Tech Track) is live on Base Sepolia with real delegated attestations, employer countersigns, bank-window proofs, a verifier and key recovery. Due Process is the next population for the same engine.
