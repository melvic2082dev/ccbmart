#!/bin/sh
set -e
echo "[STARTUP] $(date -u) running migrate"
npx prisma migrate deploy || echo "[STARTUP] migrate failed, continuing"
echo "[STARTUP] $(date -u) launching node"
exec node src/server.js
