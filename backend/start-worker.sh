#!/bin/sh
# Worker service entry — runs migrations then BullMQ worker process.
# Deploy as a SEPARATE Railway service (not the web one) to avoid double-scheduling jobs.
# See backend/src/worker.js header for cutover instructions.

set -e
echo "[WORKER-STARTUP] $(date -u) running migrate"
npx prisma migrate deploy || echo "[WORKER-STARTUP] migrate failed, continuing"
echo "[WORKER-STARTUP] $(date -u) launching node (worker)"
exec node src/worker.js
