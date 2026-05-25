#!/usr/bin/env bash
# Nightly backup of the SmartFix SQLite store (machine parameters + shift logs).
#
# Uses `sqlite3 .backup` rather than `cp` so the backup is consistent even if
# a write is in flight (cp on a WAL-mode database can capture a torn state).
# Keeps the last 14 backups; older ones are pruned automatically.
#
# ── Usage ───────────────────────────────────────────────────────────────────
#
#   ./scripts/backup_sqlite.sh                            # uses defaults
#   STORE_PATH=/path/to/smartfix.db BACKUP_DIR=/backups ./scripts/backup_sqlite.sh
#
# ── Install as a cron job ──────────────────────────────────────────────────
#
#   crontab -e
#   # 02:30 every day
#   30 2 * * * /opt/smartfix/scripts/backup_sqlite.sh >> /var/log/smartfix-backup.log 2>&1
#
# ── Inside the docker-compose deploy ───────────────────────────────────────
#
# Run the script *inside* the backend container so the SQLite tooling and the
# database file are in the same filesystem:
#
#   docker compose exec backend ./scripts/backup_sqlite.sh
#
# Bind-mount a host path into the backend service at /backups (or override
# BACKUP_DIR) so the backups land on the host filesystem, not inside the
# container's writable layer.

set -euo pipefail

STORE_PATH="${STORE_PATH:-./smartfix.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP="${KEEP:-14}"

if [[ ! -f "$STORE_PATH" ]]; then
    echo "[backup_sqlite] no database at $STORE_PATH — nothing to back up" >&2
    exit 0
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "[backup_sqlite] sqlite3 CLI not installed; aborting" >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"

# Timestamped filename; sorts lexicographically.
ts="$(date -u +%Y%m%dT%H%M%SZ)"
dest="$BACKUP_DIR/smartfix-${ts}.db"

# .backup is the atomic, WAL-safe way to copy a live SQLite database. The
# alternative `VACUUM INTO` works too but rewrites the database, which costs
# time on larger files. .backup streams pages and is fast.
sqlite3 "$STORE_PATH" ".backup '$dest'"

# Cheap integrity check — catches catastrophic corruption immediately. Output
# is one line: "ok" on success, error text otherwise.
if ! sqlite3 "$dest" "PRAGMA integrity_check;" | grep -q '^ok$'; then
    echo "[backup_sqlite] integrity_check FAILED for $dest" >&2
    rm -f "$dest"
    exit 2
fi

echo "[backup_sqlite] wrote $dest ($(du -h "$dest" | cut -f1))"

# Prune. -t = newest first, tail starts after the first $KEEP.
ls -1t "$BACKUP_DIR"/smartfix-*.db 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
    rm -f "$old"
    echo "[backup_sqlite] pruned $old"
done
