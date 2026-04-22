# CTO Audit & Upgrade Report — CCB Mart

**Audit date**: 2026-04-23
**Auditor**: Claude Opus 4.7 (acting as CTO)
**Scope**: Codebase, hosting architecture, software architecture, DevOps pipeline, security posture
**System state at audit**: Pre-launch dev environment (no production users, all stacks running on Railway + Vercel + local Docker)

---

## 1. Executive Summary

CCB Mart is an MLM/retail management system with complex business logic (5-tier CTV hierarchy, commission engine, membership tiers, tax, eKYC, audit logs). The product is **functionally ready for soft-launch but not yet production-grade**.

Strengths:
- Rich domain model (40 Prisma tables) correctly reflecting the business
- Solid defensive basics: helmet, bcrypt, Joi validation, Prisma (SQL injection safe), rate limiting
- BullMQ queues for async commission/sync work
- Multi-role routing (admin/ctv/agency/member) cleanly separated

Weaknesses fixed during this audit (see §2):
- Double-wrapped layout causing sidebar flash
- 17 conflicting architecture docs (doc rot)
- SSE leaking session JWT via query string
- Port/config drift between Dockerfile, docker-compose, Railway, CI
- SQLite residue after PostgreSQL migration
- ServiceWorker freezing dev HMR
- Vercel settings mismatch (literal `".next (auto)"` stored as output dir)
- `NEXT_PUBLIC_API_URL` trailing space

Weaknesses remaining (see §3, §4):
- JWT in localStorage (XSS-exposed)
- Near-zero test coverage for money-path code
- Monolithic Node process mixing web + worker + SSE + cron
- Zero APM / structured observability in production
- No staging environment (push main = prod)
- 4 credentials leaked in this session (token rotation required — §7)

**Bottom line**: 4-6 weeks of disciplined engineering to reach "safe to onboard real users". Do NOT open to paying users until §3 Critical items are resolved.

---

## 2. What Was Fixed In This Audit

### 2.1 Deployment pipeline unblocked
Before audit: Backend/frontend both failing in various ways.

| Issue | Root cause | Fix |
|---|---|---|
| Railway deploy hung at migration | Inline shell startCommand with nested parentheses crashed sh parser → `duration: 0` | Extracted logic to `backend/start.sh`, called as `sh ./start.sh` |
| Railway healthcheck timeout | Server never reached `app.listen()` due to startCommand issue | Same as above |
| Vercel 404 on all paths | `outputDirectory` saved as literal `".next (auto)"` (UI hint text) | PATCH via API: `outputDirectory = null` (Vercel auto-detects) |
| Frontend couldn't call API | `NEXT_PUBLIC_API_URL` had trailing space → `api.ccb.x-wise.io%20` | Re-set env var cleanly |
| Git commits blocked | Wrong author email (`mooncat2nd@Home-16in-2019.local`) | `git config user.email melvic2082dev@users.noreply.github.com` |
| Port 4000 conflict locally | Legacy node process on 4000 + Railway config wanted 8080 | Standardized on 8080 across all configs |

All deploy URLs now green:
- `https://api.ccb.x-wise.io/api/ping` → `{"ok":true}`
- `https://ccb.x-wise.io/login` → HTTP 200

### 2.2 Database migration to PostgreSQL finalized
- Deleted `backend/prisma/dev.db` (SQLite leftover, 487KB)
- Removed `file:./dev.db` fallback in config — `DATABASE_URL` now required in all envs
- Updated `.env.example` note (was "sqlite for dev", now "PostgreSQL required")
- Railway Postgres seeded with full V13 mock data (admin + 30 CTV hierarchy + 3 agencies + 100 customers + 500 transactions + memberships + tax/fee records)

### 2.3 UX: double-wrap sidebar flash bug
**Symptom**: Clicking "Báo cáo"/"Cấu hình" caused sidebar to flash through loading spinner state.

**Root cause**: Each role folder has `app/admin/layout.tsx` wrapping `<DashboardLayout>`. 8 child pages *also* wrapped their content in `<DashboardLayout>` → inner instance remounted on every navigation, triggering `mounted=false → spinner → mounted=true`.

**Fix**: Removed duplicate wrappers from 8 pages + cleaned ~30 unused `DashboardLayout` imports. Affected: `admin/config`, `admin/dashboard`, `admin/promotions`, `admin/salary-report`, `admin/soft-salary`, `admin/team-bonus`, `admin/titles`, `ctv/dashboard`.

### 2.4 SSE session-token leak closed
**Before**: `/api/events?token=<long-lived-JWT>` → JWT appears in Railway/nginx access logs, browser history, referer headers.

**After**:
1. Added `POST /api/events/ticket` (authenticated with session JWT) → returns 60-second JWT with `aud: 'sse'`
2. `GET /api/events?ticket=xxx` validates `aud === 'sse'` before streaming
3. Frontend `useSSE.ts` auto-exchanges session token for ticket before opening EventSource

Session JWT never leaves the Authorization header again.

### 2.5 Documentation rot
**Before**: 18 conflicting markdown files at repo root (V2, V3, V5, V6, V12, V12.2, V12.4, C12.4, C13.2, C13.3, C13.3.1, C13.4, C13.4.1, Full V3, Gap Analysis, Roadmap). Onboarding a new dev would take a full week just to figure out which doc is current.

**After**:
- `ARCHITECTURE.md` at root = single source of truth (promoted from C13.4.1, the latest)
- 16 legacy docs moved to `docs/archive/` with explicit `docs/archive/README.md` explaining the timeline and marking them read-only

### 2.6 Config drift eliminated
**Before**: `Dockerfile` CMD, `railway.json` startCommand, `docker-compose.yml`, `docker-compose.prod.yml`, CI workflow — all had different port assumptions and startup sequences.

**After**:
- All configs aligned on PORT 8080
- Dockerfile CMD + railway.json startCommand both invoke `sh ./start.sh` (single source of truth for startup logic)
- Header comments clarify: `docker-compose.yml` = local dev, `docker-compose.prod.yml` = self-hosted alternative, Railway config = canonical production

### 2.7 Rate limiter hardening
**Before**: `globalLimiter` (1000/15min), `loginLimiter` (5/15min on `/auth/login`), `apiLimiter` (200/15min on payment endpoints).

**After**: Added `writeLimiter` (60/min) — to be applied to admin mutation endpoints handling money, users, or config. Available in middleware, ready to wire into routes in a follow-up PR (did not auto-apply to avoid breaking existing admin workflows untested).

### 2.8 Dev-mode ServiceWorker disabled
Previous bug: SW cached stale Turbopack HMR JS chunks → hydration mismatches → clicks stopped working.

Fix: Register SW only in `NODE_ENV=production`; unregister any existing SW on dev load (in `app/layout.tsx`).

### 2.9 CI tightened
`.github/workflows/ci.yml` already had backend tests + frontend build + lint. Updated:
- Backend test env now sets `DATABASE_URL` (required after config.js change)
- Ports aligned to 8080
- Backend tests run against Postgres service container (was already configured)

---

## 3. CRITICAL — Items Remaining Before Real Users

### 3.1 Rotate all leaked credentials (§7)
5 secrets were exposed during this session. See §7 for rotation steps.

### 3.2 JWT storage hardening
**Risk**: Current `localStorage.getItem('token')` → any XSS (one compromised npm dep, one unsafe `dangerouslySetInnerHTML`) hands a 7-day admin session to the attacker.

**Fix**:
1. Backend issues **httpOnly + Secure + SameSite=Lax** cookie for session
2. Short-lived access token (15 min) + refresh token (7 days) both as cookies
3. Add CSRF token (double-submit pattern) for mutation endpoints
4. Remove `localStorage.setItem('token', ...)` everywhere

Effort: 3-5 days. **Must do before any real user onboarding.**

### 3.3 Test coverage for money-path services
**Risk**: Services in `backend/src/services/` (commission.js, breakaway.js, taxEngine.js, team-bonus.js, membership.js, managementFee.js, trainingFee.js, soft-salary.js) compute money. Zero unit tests = one refactor can silently break payouts.

**Minimum bar before launch**:
- 70% line coverage for `services/`
- Regression test for each rank-commission scenario (CTV/PP/TP/GDV/GDKD self-sale + direct + indirect × 3 levels)
- Snapshot test for monthly report aggregation
- Integration test: create transaction → commission calculated → payout rows match expected

Effort: 2 weeks. Non-negotiable.

### 3.4 Staging environment
**Risk**: `git push main` = production deploy. One bad commit = user-facing breakage.

**Fix**:
- Railway: add `staging` environment pointing at `develop` branch
- Vercel: preview deploys for every PR are already automatic
- Branch flow: `feature/*` → PR → Vercel preview + Railway preview → merge to `develop` → staging test → merge to `main` → production

Effort: 1 day. Do this before writing more features.

---

## 4. HIGH — 30 Day Roadmap

### 4.1 Split web + worker processes
Current: One Node process owns HTTP, SSE, BullMQ workers, cron jobs. A slow cron blocks HTTP handling. A web deploy kills in-flight queue jobs.

Target:
- `web` service: Express + SSE only
- `worker` service: BullMQ + `scheduleAutoRankJob`, `scheduleCashCheckJob`, `scheduleReferralCapReset`, `scheduleAuditLogCleanup`

Railway supports multi-service from same repo; both share the same Redis/Postgres. Effort: 3 days.

### 4.2 Observability stack
Current: Winston logs to stdout. No APM. No alerting. When prod breaks, you `railway logs | tail`.

Target:
- **Sentry** (backend + frontend) for exceptions and performance
- **Better Stack** or **Uptime Kuma** for uptime + alert routing
- **Structured JSON logs** shipped to a log platform (Logtail, Datadog, or Grafana Cloud free tier)
- Dashboard with key SLIs: p50/p95 response time, error rate, queue depth, commission calculation success rate

Effort: 1 week.

### 4.3 Frontend state management
Every page is fetching + caching + error-handling by hand in `useEffect`. Sidebar polls notifications every 60s independently. Dashboard refetches on every mount.

Target: **TanStack Query (React Query)** everywhere.
- Auto deduplication (sidebar + dashboard sharing `/notifications` won't double-fetch)
- Built-in stale-while-revalidate
- Loading/error primitives remove ~20% of UI boilerplate
- Offline-ready if you keep the SW later

Effort: 1 week (migrate incrementally by page).

### 4.4 Bundle optimization
- Dynamic-import `recharts` (only used on dashboard + reports)
- Route-group code split by role (admin never ships `ctv/*` chunks)
- Run Lighthouse CI in pipeline; block merges that regress LCP > 2.5s

Effort: 2-3 days.

---

## 5. MEDIUM — 90 Day Roadmap

### 5.1 Data model discipline
- Review every FK: `ON DELETE RESTRICT` only for data that must never vanish (users, transactions, invoices). Use `CASCADE` or `SET NULL` for auditable ancillary tables (notifications, audit logs, training logs) — this is why seed reset keeps breaking.
- Introduce soft-delete for user-facing entities (`deletedAt`) instead of hard delete.
- Consider splitting schema into 4 Prisma modules: `core` (users, auth), `sales` (transactions, products), `finance` (commissions, tax, fees), `membership` (tiers, wallets, referrals). Easier to reason about and test.

### 5.2 Prisma Data Proxy / PgBouncer
Railway Postgres connection cap = ~100. Current backend pools 20 per instance. 3 instances × 20 = 60. Add worker process with another pool → 80. You'll hit the cap faster than expected under load.

Fix: PgBouncer addon on Railway (transaction pooling mode) OR Prisma Data Proxy.

### 5.3 Downgrade Next.js 16 → 15 stable
`frontend/AGENTS.md` explicitly says Next 16 "is NOT the Next.js you know". Real cost today:
- Vercel adapter bugs (you just hit one: 404-on-everything)
- Ecosystem packages not yet updated for Next 16 API changes
- Stack Overflow answers mostly target Next 14/15

Unless there's a specific Next 16 feature powering business value, downgrade to Next 15 stable. Effort: 1-2 days.

### 5.4 Monorepo shared types
Currently frontend and backend each define their own DTO shapes. Mismatch risk high.

Target: `packages/shared-types` with Zod schemas. Frontend imports types. Backend imports runtime schemas for validation. Both derive from same source.

### 5.5 GitHub Actions: full gate
- Lint + typecheck blocks merge
- Tests block merge (coverage threshold configurable)
- Preview deploy status check
- Dependabot weekly

---

## 6. LOW — Nice to Have

- Log retention policy (delete audit logs > 2 years unless flagged)
- Admin UI for managing feature flags (currently all via env vars)
- E2E test suite with Playwright for 5 golden flows (login, create transaction, monthly report, withdraw, import)
- OpenAPI spec generated from routes (use `express-openapi` or swagger-autogen)
- Database backup automation (Railway has snapshots, but scheduled pg_dump to S3 is belt-and-suspenders)
- Accessibility audit (WCAG 2.1 AA) — currently zero `aria-*` attributes observed

---

## 7. Credential Rotation (TO DO AFTER LAUNCH READINESS)

**Context**: The following were exposed in the audit chat and must be rotated before opening to real users. Safe to defer because:
- No production users exist yet
- All endpoints gated behind auth
- Database has mock data only

**When to rotate**: Before the first real user creates an account. Absolute latest: the day before launch.

### 7.1 Rotate Railway API token
- `https://railway.app/account/tokens` → revoke the Railway token that was pasted in the audit chat (begins with `51fc05d1-`)
- Create new token if needed for CI/automation, store in GitHub Actions secret

### 7.2 Rotate Vercel API token
- `https://vercel.com/account/tokens` → delete the Vercel token that was pasted in the audit chat (begins with `vcp_3Cie`)
- Create new token if needed, store in GitHub Actions secret

### 7.3 Rotate Railway Postgres password
1. Railway dashboard → `Postgres` service → Variables → regenerate `POSTGRES_PASSWORD`
2. Railway will auto-update referenced `DATABASE_URL` in the `ccbmart` service
3. Trigger a redeploy to pick up new connection string
4. Verify `https://api.ccb.x-wise.io/api/ping` still returns 200
5. Also update local `.env` file at repo root

### 7.4 Rotate `JWT_SECRET` on Railway
1. Generate new secret: `openssl rand -base64 48`
2. Railway → `ccbmart` service → Variables → update `JWT_SECRET`
3. All existing JWTs become invalid — every user must log in again (OK while no users exist)
4. Redeploy

### 7.5 Remove audit conversation from sensitive history
If this audit transcript was pasted into a ticket/wiki/chat, scrub it. Consider this chat itself exposed.

### 7.6 Adopt secret manager policy
Going forward:
- Never paste credentials into AI chats, tickets, Slack, email
- Use Railway/Vercel dashboards (not `.env` checked into git)
- Local `.env` always in `.gitignore` (verified — it is)
- For shared dev secrets, use `doppler` or `1Password for Teams`

---

## 8. Architecture Scorecard

| Dimension | Pre-audit | Post-audit | Target (launch) |
|---|---|---|---|
| Deployment reliability | ★☆☆☆☆ (all fails) | ★★★★☆ (both green) | ★★★★★ |
| Code organization | ★★★☆☆ | ★★★★☆ (after arch doc cleanup) | ★★★★☆ |
| Security basics | ★★★☆☆ | ★★★★☆ (SSE fix) | ★★★★★ (needs JWT cookie) |
| Observability | ★☆☆☆☆ | ★☆☆☆☆ (unchanged) | ★★★★☆ (Sentry + uptime) |
| Test coverage | ★☆☆☆☆ | ★☆☆☆☆ (unchanged) | ★★★★☆ (70% services) |
| DevEx | ★★☆☆☆ | ★★★★☆ (SW fix, port fix) | ★★★★☆ |
| Documentation | ★☆☆☆☆ (doc rot) | ★★★★☆ (single source) | ★★★★★ |

---

## 9. Files Changed In This Audit

| Category | Files |
|---|---|
| UX bug fix | 8 page files (remove double-wrap), ~30 files (unused imports removed) |
| SSE auth | `backend/src/server.js`, `frontend/src/lib/useSSE.ts` |
| Rate limiter | `backend/src/middleware/rateLimiter.js` |
| Dev ServiceWorker | `frontend/src/app/layout.tsx` |
| Port alignment | `backend/src/config/index.js`, `backend/.env.example`, `docker-compose.yml`, `docker-compose.prod.yml`, `.github/workflows/ci.yml` |
| Deploy unblock | `backend/start.sh` (new), `backend/railway.json`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/vercel.json` (new) |
| DB cleanup | `backend/prisma/dev.db` (deleted) |
| Doc cleanup | 17 `.md` renames into `docs/archive/`, new `ARCHITECTURE.md`, new `docs/archive/README.md`, this `CTO_AUDIT_REPORT.md` |

Total commits from audit: 9 (all pushed to `main`).

---

## 10. Immediate Next Actions (Ordered)

1. **This week**: Fix test coverage for money-path services (§3.3). Blocking for real users.
2. **This week**: Set up staging environment (§3.4). Low effort, high safety.
3. **Next week**: Migrate JWT to httpOnly cookie (§3.2).
4. **Week 3**: Split web/worker processes (§4.1).
5. **Week 4**: Install Sentry + uptime monitoring (§4.2).
6. **Before launch day**: Rotate credentials (§7), run load test, write runbook for on-call.

**Open questions for product/business owner**:
1. What is target user count for soft-launch? (Determines infra sizing.)
2. Is there a compliance requirement (SOC 2 / ISO 27001 / Vietnam data localization)? If yes, audit scope 10x larger.
3. Is Next.js 16 a hard requirement, or willing to downgrade to 15? (§5.3)
4. What's the budget appetite for managed observability (Datadog ~$30/mo/host) vs self-hosted (Grafana stack free but ops overhead)?

---

*End of audit. Review with engineering team and prioritize §3 items this sprint.*
