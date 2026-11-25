# Progress Log

## 2026-11-25 — production HTTPS readiness audit

- Audited browser-facing URLs, Supabase callbacks, portal links, CORS origins, media references, and service environment wiring.
- Kept server-side loopback connections private; no PostgreSQL, Studio, service-role key, or local Supabase gateway is browser-facing.
- Replaced stale `portal.purepulse.one` email links with `https://login.purepulse.one/portal` and hardened auth callbacks to accept only same-origin relative redirects.
- Removed browser polling of the private Tailscale management address. Infrastructure actions and TTY links now require the permanent owner identity; demo administrators cannot invoke them through PurePulse.
- Added `scripts/rotate-demo-passwords.mjs`, which generates new demo passwords, stores them mode 0600 outside Git/public roots, and never prints password values.
- `https://purepulse.one` and `https://www.purepulse.one` return HTTP 200. `login.purepulse.one` remains HTTP 402 from disabled Vercel until DNS/Cloudflare cutover approval.
- Latest commit: pending this production-readiness milestone.

## 2026-11-25 — client and affiliate portal recovery validation

- Phase: Portal recovery and account security
- Completed: validated the existing client and affiliate route surface without replacing the recovered interfaces; public login/application pages return 200 and protected dashboard routes redirect unauthenticated requests.
- Database: isolated self-hosted Supabase remains healthy and persistent; owner, administrator, fictional client, and fictional affiliate authentication checks pass. Demo seed remains separate from the owner account.
- Security: client/affiliate scoped RLS checks pass; existing automated authorization suite plus three account-password validation tests pass (54 total tests).
- Account settings: added the original dark/purple sidebar entry and authenticated self-service password change. Current password is verified through Supabase Auth, the new password is written to the authenticated user only, Supabase sessions are revoked, and legacy team cookies are invalidated through persisted session versions.
- Migration: added `040_team_session_version.sql`; applied to the isolated database without destructive changes.
- Build: Next.js production build passes. No second server was launched; `purepulse-admin.service` remains the only backend service.
- External routing: `https://login.purepulse.one` still returns the disabled Vercel deployment (HTTP 402). No DNS or Cloudflare route was changed, per approval gate.
- Latest commits: `1eb1630` (`fix: polish account settings release checks`) and `3b6571a` (`docs: record portal recovery milestone`), pushed to `origin/recovery/consolidate-platform`.

## 2026-11-24

- Phase: Discovery and recovery
- Completed: cloned and preserved all five requested repositories; fetched branches and tags.
- Recovered: original landing source (`PurePulse`), newer Vite marketing source (`PurePulse-Marketing`), historical affiliate collateral (`PurePulseMarketing`), earlier portal-linked static source (`PurePulse-main`), and complete backend/admin candidate (`purepulse-admin`).
- Infrastructure: confirmed host `r510`, existing `purepulse-r510` Cloudflare tunnel, current root ingress to localhost:3014, original static copy at `/var/www/purepulse`, and separate deployed Vite copy at `/home/matt/services/portfolio-projects/purepulse`.
- Canonical: selected `purepulse-admin`; created branch `recovery/consolidate-platform`.
- Tests: existing test suite was not completed because `npm ci` was blocked by the sandbox's read-only npm cache and left a partially populated local dependency tree. No production state changed.
- Blockers: staging hostname/Cloudflare credentials, Supabase project backup authorization, and production deployment approval are not yet verified.
- Latest commit: working tree branch created; documentation milestone pending commit.

## 2026-11-24 — cutover preparation

- GitHub: `restoration/original-website` and annotated tag `purepulse-original-restored-2026-11-24` both point to the confirmed `d2b3ed8` source.
- Backend review: `recovery/consolidate-platform` is clean and pushed; its delta is recovery documentation only. Secret scan found no real credentials or sensitive records.
- Durable deployment: exact static copy staged at `/home/matt/PurePulse-Recovery/deploy/purepulse-original`; byte hashes match the confirmed candidate and `/var/www/purepulse`.
- Service artifact: `deploy/systemd/purepulse-original.service` prepared for localhost:3014 with restart and hardening settings.
- Validation: durable copy returns HTTP 200 for `/`, `/home.html`, CSS, splash HTML, and portfolio assets on the isolated preview port 3040.
- Cutover status: not yet switched. Port 3014 still serves the rejected alternate Vite build; host administrator access is required to install the unit and change the listener safely.
- Final verification: `https://purepulse.one` remains HTTP 200 but is still the alternate Vite build; durable preview `http://127.0.0.1:3040` returns HTTP 200 for the original splash, home, CSS, and portfolio assets.
- Latest commit: `ae8184d` (`ops: add reproducible original site systemd unit`), pushed to `origin/recovery/consolidate-platform`.

## 2026-11-24 — backend recovery audit

- Recovered route inventory confirms original admin, client portal, affiliate, applications/video interviews, contracts, onboarding, referrals, payroll/commission, campaigns, and reporting surfaces remain in the canonical repository.
- Dependency/build validation: existing 51-test suite passed; TypeScript/build had previously passed before the security-only fallback removal, with a follow-up TypeScript process requiring additional runtime time on this host.
- Security repair: removed hardcoded database-password and session-secret fallbacks; production now requires `SUPABASE_DB_PASS`/`DATABASE_URL` and `SESSION_SECRET`.
- Service artifact: `deploy/systemd/purepulse-admin.service` prepared for localhost:3041; it intentionally requires an uncommitted `.env.production`.
- Infrastructure blocker: `login.purepulse.one` currently resolves directly to Vercel and returns `DEPLOYMENT_DISABLED` (HTTP 402). No login hostname exists in the R510 tunnel config, and no authorized Supabase/service credentials were found locally.

## 2026-11-24 — isolated demonstration backend

- Official self-hosted Supabase `self-hosted/v0.8.5` stack provisioned under `/home/matt/PurePulse-Recovery/deploy/supabase-demo` with persistent Docker storage and localhost-only API/Postgres/pooler ports.
- All repository migrations applied after compatibility repairs `014b_legacy_referrals.sql`, `031b_affiliate_active_clients.sql`, and `039_recovery_team_login.sql`.
- Seeded isolated fictional records and created restricted credentials for demo admin, client, and affiliate accounts.
- Provisioned permanent owner `admin@purepulse.one` separately with verified Supabase Auth and admin team role; credentials are outside Git at `/home/matt/PurePulse-Recovery/private/purepulse-owner-credentials.txt` mode 0600.
- Recovered original affiliate briefing video from `PurePulseMarketing:1718dc8`, hosted as same-origin `/media/videoplayback.mp4`, with HTTP 206 byte-range support.
- Remaining cutover: install `purepulse-admin.service`, install backup timer, add only `login.purepulse.one -> 127.0.0.1:3041` to `purepulse-r510`, and configure Resend credentials.

## 2026-11-24 — restoration validation

- R510 search: found historical source at `/home/matt/PurePulse/PurePulse-Marketing`, the deployed build at `/home/matt/services/portfolio-projects/purepulse`, and deployment docs under `/home/matt/PurePulse/sites-on-r510`.
- Public artifact: served the recovered built Vite site on `127.0.0.1:3035`; HTTP 200, title `PurePulse — Elite Web Design & Digital Roster`, and SHA-256 matches the deployed build.
- Production status: `https://purepulse.one` currently returns HTTP 200 and the same Vite build hash. The domain is already online; no cutover was performed.
- Dependency recovery: `npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/purepulse-npm-cache` completed successfully after moving the failed generated dependency tree out of the application directory. No package versions were changed.
- Canonical backend validation: TypeScript passed; Next.js production build passed and generated 91 static pages/routes plus the existing API surface.
- Lint: existing application lint currently reports 85 errors/127 warnings, primarily React 19 hook/purity rules and legacy `any` usage. No lint auto-fix was applied because this is restoration work and broad rewrites could change behavior.
- Tests: existing backend suite passed 51 tests across 23 suites.
- Correction: the temporary reimagined homepage was removed; the backend root is restored to its original `/dashboard` behavior. The exact recovered public landing artifact remains the restoration source of truth.

## 2026-11-24 — historical frontend recovery

- Recovered and previewed detached `PurePulse` worktrees: `7af218c` on :3036, `5e6d9f9` on :3037, `821a253` on :3038, and current `d2b3ed8` on :3039.
- Strongest match: `d2b3ed8` (latest complete static lineage) or `821a253` (clean entrance/home split). Both retain the original portfolio lookbook, four service plans, $150 deposit, 12-month commitment, contract page, and portal/backend links.
- Historical backend lineage: `purepulse-admin` commits `8aafe17` (affiliate onboarding), `78ec1d1` (affiliate growth portal and video interview), and `476751a` (Stripe Global Payouts sandbox).
- Added `CANDIDATE_RECOVERY_REPORT.md` with exact commits, dates, feature matches, missing details, and preview URLs.
- User-confirmation gate: do not create a restoration branch from a public candidate until visual inspection identifies the correct baseline.
