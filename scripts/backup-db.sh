#!/bin/bash
# Daily PostgreSQL backup
BACKUP_DIR="/backups/ccbmart"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/ccbmart_$TIMESTAMP.sql.gz"

if [ $? -eq 0 ]; then
  echo "[$(date -Iseconds)] Backup created: ccbmart_$TIMESTAMP.sql.gz"
else
  echo "[$(date -Iseconds)] ERROR: Backup failed" >&2
  exit 1
fi

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
echo "[$(date -Iseconds)] Cleanup complete (kept last 30 days)"
