# Deployment

## Current host

The R510 runs Ubuntu 24.04 with Nginx, Cloudflare Tunnel, Docker, and multiple unrelated production services. PurePulse currently has tunnel ingress for `purepulse.one` to localhost:3014. Do not reuse another application's port or edit existing tunnel entries during staging.

## Staging shape

Run the canonical Next.js server on a dedicated localhost port, behind a dedicated Nginx loopback server block and an isolated Cloudflare hostname such as `staging.purepulse.one`. Use a dedicated systemd unit with `Restart=always`, `After=network-online.target`, a non-root user, environment file permissions `0600`, and `/api/health` plus `/api/ready` checks.

## Release checklist

1. Backup database and document storage; verify the backup can be read.
2. Apply Supabase migrations only after review; never drop production data.
3. Build and run tests in the canonical branch.
4. Start staging and verify health, auth, RLS, forms, affiliate flows, and mobile rendering.
5. Observe logs and disk usage through one full restart.
6. Obtain explicit approval before changing production tunnel ingress or cutover.
