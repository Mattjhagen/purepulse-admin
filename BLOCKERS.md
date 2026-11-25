# Blockers

- Staging hostname and isolated Cloudflare ingress are not yet confirmed.
- Supabase production backup/restore access has not been exercised; do not run migrations against production until a verified backup exists.
- npm cache is read-only in the current sandbox; use a task-local cache under `/tmp` for clean dependency installation.
- External credentials for Stripe, Resend, Google Calendar, Anthropic, and official social APIs are not verified. Implement/setup-test boundaries remain available.
- Production cutover requires explicit approval.
