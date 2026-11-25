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

## Original public-site deployment artifact

An exact byte-for-byte copy of the confirmed `d2b3ed8` static site is staged at
`/home/matt/PurePulse-Recovery/deploy/purepulse-original` on the R510. It is
outside `/tmp` and excludes Git metadata. The matching unit file is
`deploy/systemd/purepulse-original.service`; it binds localhost:3014 so the
existing `purepulse.one` tunnel route can be switched without changing DNS or
unrelated tunnel routes. Installation requires host administrator access:

```sh
sudo install -o root -g root -m 0644 deploy/systemd/purepulse-original.service /etc/systemd/system/purepulse-original.service
sudo systemctl daemon-reload
sudo systemctl enable --now purepulse-original.service
curl -fsS http://127.0.0.1:3014/
```

Before starting it, stop only the current PurePulse listener on 3014 and retain
its source for rollback. Do not stop an unrelated service. The active
Cloudflare tunnel currently routes `purepulse.one` and `www.purepulse.one` to
localhost:3014; unrelated hostname routes must remain unchanged.

## Backend service artifact

`deploy/systemd/purepulse-admin.service` defines the recovered Next.js backend
on the currently unused localhost port 3041. It requires an administrator-owned
`/home/matt/PurePulse-Recovery/purepulse-admin/.env.production` with authorized
Supabase and application secrets; no environment file is committed. Install
only after the environment has been populated and checked:

```sh
sudo install -o root -g root -m 0644 deploy/systemd/purepulse-admin.service /etc/systemd/system/purepulse-admin.service
sudo systemctl daemon-reload
sudo systemctl enable --now purepulse-admin.service
curl -fsS http://127.0.0.1:3041/login
```

The current `login.purepulse.one` DNS points to a disabled Vercel deployment,
not the R510 tunnel. DNS or tunnel ingress must be changed separately after
the backend is healthy; the existing `purepulse-r510` routes must be preserved.
