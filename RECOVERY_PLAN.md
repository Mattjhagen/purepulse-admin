# PurePulse Recovery Plan

## Audit baseline

Audit date: 2026-11-24. Five repositories were cloned and preserved side by side in the recovery workspace. No production service, tunnel, database, or unrelated application was modified.

| Source | Role recovered | Evidence | Decision |
|---|---|---|---|
| `PurePulse` | Original branded static landing page, portfolio, pricing, contract page, print assets | 95 commits, tag `v1`, `index.html`, `home.html`, `contract.html`, `style.css`; prices Starter $20, Growth $50, Premium $75 | Preserve as canonical visual reference and migrate public experience into the canonical app |
| `PurePulse-Marketing` | Newer Vite landing/roster concept and optimized project assets | React/Vite app, $150 deposit model, plan calculator, real project roster | Preserve as visual/asset source; do not discard |
| `purepulse-admin` | Most complete application platform | 321 commits, 38 Supabase migrations, admin/client/affiliate/interview/social/invoice/project/time routes and tests | Canonical implementation repository |
| `PurePulseMarketing` | Historical affiliate collateral and hiring/interview media | PDFs, logos, posters, referral card, interview template/video | Preserve as marketing asset archive |
| `PurePulse-main` | Earlier static site with portal/contact integration | 10 commits, worker scripts, portal links | Preserve as deployment/history reference |

## Production finding

`purepulse.one` currently routes through Cloudflare tunnel `purepulse-r510` to `localhost:3014`. The response is a Vite bundle from `/home/matt/services/portfolio-projects/purepulse`, not the original `/var/www/purepulse` repository snapshot. `/var/www/purepulse/index.html` hashes identically to `PurePulse/index.html`. Existing tunnel and unrelated services are in scope for inspection only and must not be changed without approval.

## Recovery sequence

1. Establish a reproducible canonical Next.js build on this recovery branch.
2. Recover the original visual system, pricing, contract language, portfolio assets, and login entry points in the public route.
3. Verify Supabase migrations/RLS and add missing tenant-safe domain primitives before enabling sensitive workflows.
4. Add explicit health, readiness, structured logging, backups, and staging deployment documentation.
5. Run build, unit, route, accessibility, and browser smoke tests against an isolated demo workspace.
6. Deploy only to an isolated staging hostname/service after approval. Production cutover remains an explicit approval gate.

## Safety gates

No real payroll, payouts, tax filing, production data migration, destructive cleanup, or production cutover is authorized during recovery. Stripe remains test-mode until independently verified. Sensitive documents require server-side authorization, tenant scoping, audit events, and retention policy.
