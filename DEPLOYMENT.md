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

## Isolated Supabase demonstration stack

The official Supabase `self-hosted/v0.8.5` Docker snapshot is staged at
`/home/matt/PurePulse-Recovery/deploy/supabase-demo`. It uses persistent local
bind mounts, localhost-only API gateway `18000`, Postgres `15433`, and pooler
ports `15432`/`16543`. The stack is separate from all existing containers.
The repository migrations plus compatibility migrations `014b`, `031b`, and
`039` have been applied to its empty database. Its generated `.env` is not in
Git; keep it mode `0600`.

The recovered briefing video is served from the backend at
`/media/videoplayback.mp4`, preserving the original `PurePulseMarketing` asset
from commit `1718dc8`. It returns `Content-Type: video/mp4`, `Accept-Ranges`,
and HTTP 206 byte-range responses.

The exact login ingress addition is in
`deploy/cloudflare/login-purepulse-route.yml`. Apply it only to the existing
`purepulse-r510` config after installing `purepulse-admin.service`; do not
modify the public-site route or other tunnel entries.

## Demonstration database backups

`deploy/backup/purepulse-demo-backup.sh` creates mode-0600 custom-format dumps
under `/home/matt/PurePulse-Recovery/backups/purepulse-demo`. Install the
provided service and timer as root after verifying the path and Docker access:

```sh
sudo install -m 0750 -o matt -g matt deploy/backup/purepulse-demo-backup.sh /usr/local/sbin/purepulse-demo-backup.sh
sudo install -m 0644 deploy/systemd/purepulse-demo-backup.service /etc/systemd/system/
sudo install -m 0644 deploy/systemd/purepulse-demo-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now purepulse-demo-backup.timer
sudo systemctl start purepulse-demo-backup.service
```

Restore only into the isolated stack after stopping its application and taking
another backup: `docker exec -i supabase-db pg_restore -U postgres -d postgres
--clean --if-exists < backup.dump`. Never run that command against another
application or historical production database.
