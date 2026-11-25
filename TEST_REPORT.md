# Test Report

## Discovery checks

- Remote reachability: passed for all five GitHub repositories.
- Repository preservation: passed; each source is cloned in the recovery workspace.
- Live domain response: passed HTTP 200; confirmed current Vite title and assets.
- Original asset parity: passed; `/var/www/purepulse/index.html` SHA-256 matches `PurePulse/index.html`.
- Historical production artifact parity: passed; `/home/matt/PurePulse/PurePulse-Marketing/dist/index.html` SHA-256 matches `/home/matt/services/portfolio-projects/purepulse/index.html`.
- Public production smoke check: passed; `https://purepulse.one` returned HTTP 200 with the expected PurePulse title.
- Host service inventory: passed read-only inspection; unrelated services remain untouched.

## Application checks

Pending clean dependency installation and canonical recovery changes. Existing repository tests include affiliate social assets, Stripe global payout sandbox, Google Calendar, GitHub deployment, and handoff integration coverage. These will be rerun with a writable task-local npm cache before staging.
# Test Report

## 2026-11-24 isolated demonstration validation

- Host capacity checked: 47 GiB RAM available and 177 GiB disk free before provisioning.
- Official self-hosted Supabase `self-hosted/v0.8.5` stack: all containers healthy.
- Published interfaces: API `127.0.0.1:18000`, Postgres `127.0.0.1:15433`, pooler `127.0.0.1:15432/16543`; no public database or Studio binding.
- Repository migrations: all original migrations applied, plus documented compatibility migrations for legacy referrals, affiliate active-client counters, and team login timestamps.
- Next.js production build: passed.
- Automated application tests: 51 passed across 23 suites.
- Supabase Auth: owner, administrator, client, and affiliate demonstration accounts authenticated successfully.
- Application sessions: owner and demonstration administrator login/session/dashboard checks passed.
- RLS: client and affiliate scoped queries passed through the anonymous client; no service-role bypass was used for those checks.
- Demonstration seed: 13 clients including the portal client, 9 team records, 15 affiliates, 12 contracts/projects/campaigns/leads, 8 interviews, commissions, invoices, tickets, and timesheet previews.
- Affiliate video: original H.264/AAC `videoplayback.mp4` recovered from `PurePulseMarketing:1718dc8`; HTTP 206 byte-range and MIME checks passed.
- Payments, payouts, payroll execution, external email, and social publication: not executed.

## Pending acceptance

- Install the systemd unit with administrator access.
- Add the single Cloudflare route for `login.purepulse.one`.
- Configure Resend credentials and verified sender domain before testing external email links.
