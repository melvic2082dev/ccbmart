# CCB Mart — On-Call Runbook

**Last updated:** 2026-05-15
**Owner:** Willy Minh (solo) — backup contact TBD
**Hours:** Best-effort, no formal SLA pre-launch

This runbook covers the top 7 incident classes for CCB Mart production. Use these as cookbook recipes. Update with new incidents post-launch.

---

## 1. Backend offline / 5xx flood

**Symptom:** `https://api.ccb.x-wise.io/api/ping` returns non-200, or many 5xx in Sentry.

**Quick triage:**
1. Open Railway dashboard → ccbmart service → check status badge
2. If Failed: read latest deploy logs (Deployments tab → latest build)
3. If status=running but timing out: check CPU/memory metrics in same panel

**Common root causes:**
- DB connection saturated → see §3
- OOM → see §4
- Bad code deploy → rollback (§7)
- Railway region issue → check https://status.railway.com

**Restore steps:**
- If recent deploy: `railway redeploy --service ccbmart` (without `--from-source`) reverts to last known image
- If image is bad too: rollback to specific deployment via dashboard (Deployments → "..." → Redeploy)
- Worst case: `railway redeploy --service ccbmart --from-source --yes` to rebuild from main branch

---

## 2. Frontend offline / 404 / build broken

**Symptom:** `https://ccb.x-wise.io` 404 or stuck on loading.

**Quick triage:**
1. Vercel dashboard → ccbmart project → latest deployment status
2. If "Error" badge: check build log (Source/Function logs tab)
3. Common: TypeScript error blocking build, missing env var, broken import

**Restore:**
- Vercel: Production tab → previous deployment → "Promote to Production" (instant rollback)
- Fix on staging branch first, then merge

---

## 3. Database (Postgres) issues

**Symptom:**
- "FATAL: too many connections" in backend logs
- Slow queries (p95 > 2s)
- Migration deadlock

**Quick checks:**
```sql
-- via railway connect Postgres
SELECT count(*) FROM pg_stat_activity;     -- connection count
SELECT query, state, query_start FROM pg_stat_activity
  WHERE state != 'idle' ORDER BY query_start;
```

**Fixes:**
- Idle connections > 50 → restart backend (`railway redeploy --service ccbmart`)
- Long-running queries → kill via `SELECT pg_cancel_backend(pid)`
- Deadlock during migration: `prisma migrate resolve --rolled-back <name>` then re-apply
- If DB itself unhealthy: Railway snapshots → restore previous snapshot (Postgres service → Backups tab)

---

## 4. Redis offline / cache fallback

**Symptom:** Logs show "No REDIS_HOST configured, using in-memory cache" or BullMQ jobs queueing locally.

**Impact:** App still works (in-memory fallback) but:
- Cache shared across instances broken → some routes slower
- Sync queue runs synchronously → some requests slower
- Commission recalc runs in-line → admin actions block

**Fix:**
- Railway dashboard → Redis service → status check + restart if Offline
- If running but unreachable from ccbmart: check `REDIS_HOST` env var on ccbmart service

---

## 5. Payment webhook spike / failures

**Symptom:** Many `/webhook/momo/ipn` or `/webhook/zalopay/callback` 4xx/5xx in logs.

**Triage:**
- Check Sentry for signature verification failures (would suggest cred rotation needed or attack)
- Compare with actual deposit count: `SELECT COUNT(*) FROM deposit_history WHERE created_at > now()-interval '1 hour'`

**Action:**
- If signature failures: rotate `MOMO_SECRET_KEY` / `ZALOPAY_KEY2` (provider dashboard)
- If 5xx: check logs, fix code, ship
- Manual reconciliation: admin → /admin/reconciliation page → match bank deposits to records

---

## 6. SSL / TLS cert issues on api.ccb.x-wise.io

**Symptom:** Browser shows "certificate invalid", curl returns SSL error.

**Common cause:** Service offline → Railway falls back to `*.up.railway.app` wildcard cert that doesn't match the custom domain.

**Triage:**
```bash
echo | openssl s_client -servername api.ccb.x-wise.io -connect api.ccb.x-wise.io:443 2>/dev/null | \
  openssl x509 -noout -subject -issuer
```
If `subject=CN=*.up.railway.app` instead of `subject=CN=api.ccb.x-wise.io`, the service is offline.

**Fix:**
- Get the ccbmart service back online (see §1) — cert auto-restores
- If genuinely a cert issue: Railway dashboard → ccbmart → Networking → Custom Domains → verify `api.ccb.x-wise.io` listed + status = Active

---

## 7. Bad deploy — instant rollback

### Vercel (frontend)
1. Vercel dashboard → Deployments → find last green prod deploy
2. Click "..." → "Promote to Production"
3. Verify https://ccb.x-wise.io works
4. Fix the bug on a feature branch, re-deploy

### Railway (backend)
1. Railway dashboard → ccbmart service → Deployments tab
2. Find last successful deploy (older one with Green badge)
3. "..." → "Redeploy" (uses the old image, no rebuild)
4. Verify https://api.ccb.x-wise.io/api/ping

### Git history (if needed)
```bash
git log --oneline -10                 # find good SHA
git revert <bad-sha>                   # creates revert commit
git push origin main
# Wait for CI; if green, Vercel + Railway auto-deploy revert
```

---

## 8. Suspected security incident

**Indicators:** Unusual admin activity, password reset flood, audit log shows suspicious actions.

**Immediate actions (don't wait for analysis):**
1. **Revoke all JWT tokens**: rotate `JWT_SECRET` env var on Railway → redeploy → all users logged out instantly
2. **Pause admin write access**: env var `MAINTENANCE_MODE=true` (TODO: implement; for now manually disable suspected accounts)
3. **Lock suspicious accounts**: admin → /admin/users → set `isActive=false`
4. **Dump audit logs**: `pg_dump -t audit_logs > forensics-$(date +%F).sql`
5. **Preserve evidence**: don't delete logs; save them

**Then investigate:**
- `SELECT * FROM audit_logs WHERE created_at > now()-interval '24 hours' AND status='FAILURE'`
- Check IP addresses, user agents for anomalies
- Cross-check with Sentry breadcrumbs

---

## 9. Daily morning check (5 min routine)

Open in order:
1. Sentry dashboard — any new errors in last 24h?
2. Railway metrics — Postgres CPU < 50%? Redis memory < 80%?
3. Vercel deployments — last prod deploy green?
4. `curl -I https://api.ccb.x-wise.io/api/ping` → 200?
5. `curl -I https://ccb.x-wise.io` → 200?
6. Audit log scan: `SELECT count(*) FROM audit_logs WHERE created_at > now()-interval '24 hours' AND status='FAILURE'` — < 50?

If all green, take a coffee. If anything red, follow the relevant section.

---

## 10. Useful one-liners

```bash
# Tail backend logs (Railway CLI must be authed)
railway logs --service ccbmart

# Recent transactions (last hour)
psql "$DATABASE_URL" -c "SELECT id, channel, total_amount, status, created_at FROM transactions WHERE created_at > now()-interval '1 hour' ORDER BY id DESC LIMIT 20;"

# Top error patterns last 24h (Sentry CLI)
sentry-cli events list --org ccbmart --project ccbmart-backend --since 24h

# Lead funnel snapshot
psql "$DATABASE_URL" -c "SELECT stage, COUNT(*) FROM leads GROUP BY stage ORDER BY 2 DESC;"

# Active inventory batches
psql "$DATABASE_URL" -c "SELECT status, COUNT(*), SUM(qty_available) FROM inventory_batches GROUP BY status;"
```

---

## 11. Escalation

- **Vercel issues:** https://vercel.com/help or Discord
- **Railway issues:** https://help.railway.com or status page
- **Postgres data corruption:** restore from Railway daily snapshot (max 1 day data loss)
- **Critical bug code fix needed urgently:** ping willy.nguyenqm@gmail.com directly

Update this runbook after every incident with: what happened, what we tried, what worked.
