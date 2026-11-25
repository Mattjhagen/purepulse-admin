# Blockers

- The new build requires the existing `purepulse-admin.service` restart before the Origin fix is live. This environment cannot run `sudo` because of its no-new-privileges restriction; run the documented restart command manually.

- Final public login cutover remains pending: `login.purepulse.one` still returns disabled Vercel HTTP 402. The validated Cloudflare route artifact is ready, but DNS/ingress activation was intentionally not performed.

- Staging hostname and isolated Cloudflare ingress are not yet confirmed.
- Supabase production backup/restore access has not been exercised; do not run migrations against production until a verified backup exists.
- npm cache is read-only in the current sandbox; use a task-local cache under `/tmp` for clean dependency installation.
- External credentials for Stripe, Resend, Google Calendar, Anthropic, and official social APIs are not verified. Implement/setup-test boundaries remain available.
- Production cutover requires explicit approval.
- `login.purepulse.one` currently resolves to a disabled Vercel deployment (HTTP 402 `DEPLOYMENT_DISABLED`); it is not routed through the R510 tunnel.
- The historical Supabase project hostnames currently fail DNS resolution from the R510, so authenticated database workflows cannot be validated or migrated safely.
- No authorized `.env.production` or Supabase service credentials are present locally; do not create substitute credentials or run migrations.
- Administrator access is required to install `purepulse-admin.service` and update the single login hostname route while preserving all other Cloudflare routes.
- Resend is not configured because no authorized `RESEND_API_KEY` or verified sender-domain configuration is present. The app boundary is preserved with `RESEND_FROM_EMAIL=PurePulse <noreply@purepulse.one>` and delivery remains disabled until credentials are supplied.
- `login.purepulse.one` remains on the disabled Vercel route (HTTP 402). The local backend is healthy on `127.0.0.1:3041`, but the single Cloudflare ingress addition still requires the owner’s approved deployment step. No DNS or unrelated tunnel route was changed.
- The new Account Settings build is prepared but requires `sudo systemctl restart purepulse-admin.service` before it is served by the active unit. The restart command is intentionally provided for owner execution after reviewing the change; no service restart was performed in this phase.
