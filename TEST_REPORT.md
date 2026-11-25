# Test Report

## 2026-11-25 Account Settings production-origin regression

- Trusted origin `https://login.purepulse.one`: accepted by the new validation helper.
- Malicious origin `https://evil.example`: rejected.
- Localhost origin and missing origin: rejected.
- Cloudflare model: validation no longer uses the internal `req.nextUrl.host`; it uses the explicit public HTTPS allowlist and does not trust forwarded headers.
- Profile identity: `/api/auth/me` is now preferred, so legacy team-session authentication displays the authenticated name and email.
- Automated tests: 56 passed across 23 suites.
- Next.js production build: passed.
- Live restart: not performed because `sudo` is unavailable under this environment's no-new-privileges constraint.

## 2026-11-25 production HTTPS readiness

- `https://purepulse.one/` and `https://www.purepulse.one/` return HTTP 200.
- `https://login.purepulse.one/login` still returns HTTP 402 `DEPLOYMENT_DISABLED` from Vercel; DNS was not modified.
- Local unauthenticated checks: `/account-settings`, `/dashboard`, and `/affiliates/dashboard` return HTTP 307.
- No browser-facing `portal.purepulse.one` or localhost application links remain in the audited UI/email templates.
- Auth callbacks reject external redirect targets; only same-origin relative paths are accepted.
- Direct private Tailscale polling was removed from the browser; management actions require the permanent owner identity.
- Automated tests: 54 passed across 23 suites. Next.js production build passed.
- Full-repository lint remains legacy debt; targeted cutover files report existing dashboard/chat hook and style issues and were not broadly rewritten during restoration.

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

## 2026-11-25 portal and account-settings validation

- Existing service state: `purepulse-admin.service` is active on `127.0.0.1:3041`; no conflicting preview server was launched.
- Local route smoke tests: `/login`, `/portal`, `/affiliates/login`, `/affiliates/apply`, and the restored video return 200. Unauthenticated requests to `/dashboard`, `/affiliates/dashboard`, `/interviews`, `/marketing`, `/campaigns`, `/social`, `/contracts`, and `/time-clock` redirect to `/login`.
- Restored video: `/media/videoplayback.mp4` returns `Content-Type: video/mp4`, `Accept-Ranges: bytes`, and supports byte-range delivery.
- Authentication: owner, administrator, demo client, and demo affiliate Supabase Auth checks pass. Client and affiliate RLS-scoped checks pass.
- Account settings: password input validation tests pass; production build includes `/account-settings` and `/api/account/password`. The API has no target-user input, verifies the current password against the authenticated account, updates only that account, revokes other Supabase sessions, and invalidates legacy team sessions with the new persisted version function.
- Automated tests: 54 passed across 23 suites.
- Production build: passed with Next.js 16.3.0; generated route table includes `/account-settings` and `/api/account/password`.
- Browser automation: no browser surface was available in this environment, so route-level and application-auth tests were used instead; visual browser acceptance remains for the owner.
- External hostname: `login.purepulse.one` returns Vercel `DEPLOYMENT_DISABLED` HTTP 402 and is not yet routed to the R510. DNS/tunnel changes were intentionally not made.

## Pending acceptance

- Install the systemd unit with administrator access.
- Add the single Cloudflare route for `login.purepulse.one`.
- Configure Resend credentials and verified sender domain before testing external email links.
