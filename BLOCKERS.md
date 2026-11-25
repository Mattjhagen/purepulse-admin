# Blockers

- Staging hostname and isolated Cloudflare ingress are not yet confirmed.
- Supabase production backup/restore access has not been exercised; do not run migrations against production until a verified backup exists.
- npm cache is read-only in the current sandbox; use a task-local cache under `/tmp` for clean dependency installation.
- External credentials for Stripe, Resend, Google Calendar, Anthropic, and official social APIs are not verified. Implement/setup-test boundaries remain available.
- Production cutover requires explicit approval.
- `login.purepulse.one` currently resolves to a disabled Vercel deployment (HTTP 402 `DEPLOYMENT_DISABLED`); it is not routed through the R510 tunnel.
- The historical Supabase project hostnames currently fail DNS resolution from the R510, so authenticated database workflows cannot be validated or migrated safely.
- No authorized `.env.production` or Supabase service credentials are present locally; do not create substitute credentials or run migrations.
- Administrator access is required to install `purepulse-admin.service` and update the single login hostname route while preserving all other Cloudflare routes.
