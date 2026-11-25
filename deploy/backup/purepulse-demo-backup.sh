#!/usr/bin/env bash
set -euo pipefail

STACK_DIR=/home/matt/PurePulse-Recovery/deploy/supabase-demo
BACKUP_DIR=/home/matt/PurePulse-Recovery/backups/purepulse-demo
mkdir -p "$BACKUP_DIR"
password=$(sed -n 's/^POSTGRES_PASSWORD=//p' "$STACK_DIR/.env")
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
export PGPASSWORD="$password"
docker exec -e PGPASSWORD="$PGPASSWORD" supabase-db pg_dump -U postgres -d postgres --format=custom > "$BACKUP_DIR/purepulse-demo-$timestamp.dump"
unset PGPASSWORD password
chmod 600 "$BACKUP_DIR/purepulse-demo-$timestamp.dump"
printf 'Created %s\n' "$BACKUP_DIR/purepulse-demo-$timestamp.dump"
