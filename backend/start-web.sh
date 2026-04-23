#!/bin/sh
# Web service entry — runs migrations then Express server.
# Currently identical to start.sh (legacy name kept for Railway compatibility).
# When the worker is split out (P4), server.js will skip job scheduling based on
# WORKER_ROLE env var.

set -e
echo "[WEB-STARTUP] $(date -u) running migrate"
npx prisma migrate deploy || echo "[WEB-STARTUP] migrate failed, continuing"
echo "[WEB-STARTUP] $(date -u) launching node (web)"
exec node src/server.js
