# Spec 03 — Pre-Launch Hardening Plan (4–6 weeks)

**Status:** Draft for execution
**Author:** Claude (per Willy Minh request)
**Date:** 2026-05-15
**Based on:** `CTO_AUDIT_REPORT.md` (2026-04-23) + `TECH_DEBT_AUDIT.md` (2026-04-18)
**Estimated total effort:** 24–30 dev days = **5–6 weeks solo**
**Output:** Production-grade enough to onboard first 100 real paying users

---

## 1. Bối cảnh

CTO audit kết luận: hệ thống **functionally ready** nhưng **NOT production-grade**. Có 3 items CRITICAL phải fix trước khi mở cho user trả tiền:

1. JWT cookie hardening (XSS protection) — P2 đã làm 1 phần (memory `project_arch.md` ghi P2 = "Migrated from localStorage Bearer token to HttpOnly cookie JWT"). **Cần verify còn dấu vết localStorage không.**
2. Test coverage cho money-path services (commission, breakaway, tax, training fee, soft salary) — hiện = 0%
3. Staging environment — đã có branch `staging` + Railway staging service (per memory) nhưng cần kiểm tra deploy protection + CORS

Plus 4 items HIGH (30-day roadmap) và 2 ops items: credential rotation, runbook.

---

## 2. Sprint plan 6 tuần

### Tuần 1 — Foundation: testing + observability skeleton (5 days)

| Day | Task | Files | Acceptance |
|---|---|---|---|
| 1 | Set up Jest config + coverage thresholds + GH Actions gate | `backend/jest.config.ts` (verify), `.github/workflows/ci.yml` (add coverage step + fail if <70% on `services/`) | CI fail nếu coverage drop |
| 1 | Install + configure Sentry (backend) | `backend/package.json`, `backend/src/server.js` (Sentry init), `backend/.env.example` (DSN) | Throw test error trong /health → thấy trên Sentry dashboard |
| 2 | Install Sentry frontend | `frontend/package.json`, `frontend/src/app/layout.tsx`, env var | Throw test error → thấy trên Sentry, có source map |
| 2 | Structured logging upgrade | `backend/src/services/logger.js` (Winston → JSON format with traceId from req context) | Logs ship lên Sentry log breadcrumbs |
| 3-5 | Write tests for `commission.js` — all 5 rank scenarios (CTV/PP/TP/GDV/GDKD) × self/F1/F2/F3 = 20 cases | `backend/__tests__/services/commission.test.js` (new), coverage ≥ 85% | Tests pass; mutation testing: change one rate, see test fail |

**Week 1 deliverable:** CI có test gate, Sentry capturing prod errors, commission engine fully tested.

---

### Tuần 2 — Money-path test coverage rest (5 days)

| Day | Task | Files |
|---|---|---|
| 1 | Tests cho `breakaway.js`: 2-phase fee calc (L1=3%, L2=2%, L3=1%), parent reassignment, breakaway expiry | `backend/__tests__/services/breakaway.test.js` |
| 2 | Tests cho `trainingFee.js`: K-factor min 0.7, fee tiers M0-M5, invoice generation | `backend/__tests__/services/trainingFee.test.js` |
| 3 | Tests cho `taxEngine.js`: monthly tax calc, deductions, status transitions | `backend/__tests__/services/taxEngine.test.js` |
| 4 | Tests cho `membership.js`: deposit 30% reserve, referral cap 2M VND/month, tier upgrade | `backend/__tests__/services/membership.test.js` |
| 5 | Tests cho `soft-salary.js`: hard cap 5% channel revenue, carry-forward | `backend/__tests__/services/soft-salary.test.js` + integration test `__tests__/integration/sale-to-commission.test.js` (create tx → wait worker → assert commission row + soft salary delta) |

**Week 2 deliverable:** `services/` coverage ≥ 70% line, ≥ 60% branch. Integration test asserts end-to-end money flow.

---

### Tuần 3 — Auth + staging + cred rotation (5 days)

| Day | Task | Files / Action |
|---|---|---|
| 1 | **Audit JWT cookie migration completeness** — find any remaining `localStorage.getItem('token')` / `localStorage.setItem('token', ...)` in frontend. Memory note says P2 migration done; verify với `git grep`. Fix nếu còn. | `frontend/src/**/*.ts*` grep |
| 1 | Verify `httpOnly + Secure + SameSite=Lax` flags set đúng trên Set-Cookie header (curl test) | `backend/src/routes/auth.js` |
| 2 | Add **CSRF token** (double-submit pattern) cho mutation endpoints | `backend/src/middleware/csrf.js` (new), `backend/src/server.js`, `frontend/src/lib/api.ts` (read cookie + send X-CSRF-Token header) |
| 2 | Add short-lived access (15min) + refresh (7d) token rotation | `backend/src/services/auth.js` + new `/auth/refresh` endpoint |
| 3 | **Staging environment full setup verification:**<br>- Vercel: disable Deployment Protection cho preview/staging (per memory pending action #1)<br>- Railway staging service: set `ALLOWED_ORIGINS=https://staging-ccb.x-wise.io` (per memory pending action #2)<br>- Branch flow document: `feature/*` → PR → preview → merge `staging` → soak → PR to `main` → prod | Dashboards + `docs/RELEASE_PROCESS.md` (new) |
| 4 | **Rotate all leaked credentials** (CTO audit §7):<br>- Railway API token (begins `51fc05d1-`)<br>- Vercel API token (begins `vcp_3Cie`)<br>- Railway Postgres password<br>- `JWT_SECRET` (`openssl rand -base64 48`) | Dashboards |
| 5 | Apply `writeLimiter` (60/min) to all admin mutation endpoints | `backend/src/routes/admin.js`, `admin*.js`, `config.js` |
| 5 | Apply `loginLimiter` to `/api/auth/login` (per tech-debt §8) | `backend/src/server.js` or `routes/auth.js` |

**Week 3 deliverable:** Auth hardened, staging cleanly separated from prod, all credentials rotated, rate limits applied to all mutation endpoints.

---

### Tuần 4 — Worker split + observability + ops (5 days)

| Day | Task | Files / Action |
|---|---|---|
| 1-2 | **Web/worker process split** (CTO §4.1, memory says P4 done — verify):<br>- `backend/src/worker.js` standalone (no HTTP) — memory P4 says exists<br>- Toggle via `WORKER_PROCESS=separate` env<br>- `npm run start:worker` / `start:web` exist<br>- Railway: add second service for worker, share DB+Redis<br>- Cron schedulers move to worker only | `backend/src/worker.js`, `backend/package.json`, Railway dashboard |
| 3 | **Uptime monitoring:** Better Stack or Uptime Kuma → ping `/api/ping` every 60s, alert via Telegram/Slack | External setup + `docs/RUNBOOK.md` |
| 3 | **Dashboard for SLIs:** Sentry Performance or Grafana Cloud free tier — p50/p95/p99 response time, error rate, queue depth | External setup + screenshots in runbook |
| 4 | **Database backup automation:** Railway has snapshots; add scheduled `pg_dump` to S3 (or Backblaze B2 free 10GB) daily | `backend/src/jobs/backupJob.js` + S3 creds in env |
| 5 | **Runbook v1**: on-call playbook for top incidents (DB down, Redis down, Vercel build broken, Railway service offline, payment webhook spike, high error rate, suspected security incident) | `docs/RUNBOOK.md` (new) |

**Week 4 deliverable:** Worker isolated, prod monitored 24/7, backups running, runbook ready.

---

### Tuần 5 — Polish: validation gaps + N+1 + bundle (5 days)

| Day | Task | Files / Action |
|---|---|---|
| 1-2 | **Validation coverage:** apply Joi `validate` middleware to all routes that don't have it (per tech-debt §7). Audit `admin.js`, `ctv.js`, `agency.js` route by route. | `backend/src/middleware/validate.js` (extend schemas), each route file |
| 3 | **N+1 query fixes** (tech-debt §6): use `include` instead of in-loop queries. Top targets: admin dashboard aggregations, CTV hierarchy tree, monthly report. Tool: `prisma:query` log to find queries > 50ms or > 100 per request. | `backend/src/routes/admin.js`, `reports.js`, services that query in loops |
| 4 | **Webhook signature verification** for Momo + ZaloPay (tech-debt §9). Currently Momo not verified, ZaloPay returns success placeholder. | `backend/src/services/payment.js`, `backend/src/server.js` webhook handlers |
| 5 | **Bundle optimization** (CTO §4.4): dynamic import recharts, route-group split by role | `frontend/src/components/Charts/*`, `next.config.ts` |
| 5 | **Lighthouse CI** add to GitHub Actions — block merge if LCP > 2.5s on `/` and `/login` | `.github/workflows/ci.yml` + `lighthouserc.json` |

**Week 5 deliverable:** No unvalidated routes, no N+1 hotspots, signed webhooks only, smaller bundle.

---

### Tuần 6 — Pre-launch checklist + soak + load test (5 days)

| Day | Task | Files / Action |
|---|---|---|
| 1 | **Load test** with k6 or Artillery: 100 concurrent CTV submitting transactions for 5 minutes. Target: p95 < 500ms, 0 errors. | `tests/load/transaction_burst.js` (new) |
| 2 | **Soft launch dry run** on staging: 10 internal users tạo lead/transaction/deposit qua flow đầy đủ trong 1 ngày. Log mọi friction. | Manual + Sentry monitoring |
| 3 | **Fix top 5 issues** found in dry run | Per finding |
| 4 | **Security review:** OWASP Top 10 checklist (XSS, SQL injection, auth, CSRF, file upload, deserialization, sensitive data exposure, broken access control, security misconfig, vulnerable deps) | `docs/SECURITY_REVIEW.md` |
| 4 | `npm audit` clean (no high/critical) on both backend + frontend | `package.json` |
| 5 | **Final pre-launch checklist sign-off** (see §3) | Manual review |

**Week 6 deliverable:** System load-tested, dry-run passed, security review clean, ready to open registration.

---

## 3. Pre-launch checklist (gate to open paying users)

### Tech
- [ ] All test suites green; backend `services/` coverage ≥ 70%
- [ ] Sentry capturing errors from prod (verified with intentional test error)
- [ ] Uptime monitor pinging prod /api/ping, alert routing tested
- [ ] Database backup ran successfully today; restore drill tested
- [ ] No `localStorage.getItem('token')` or similar in frontend code
- [ ] Set-Cookie has `HttpOnly; Secure; SameSite=Lax`
- [ ] CSRF token enforced on mutation endpoints
- [ ] Login rate limit active (5/15min per IP)
- [ ] writeLimiter on all admin mutations (60/min)
- [ ] All routes have Joi validation
- [ ] Momo + ZaloPay webhook signatures verified
- [ ] `npm audit` no high/critical
- [ ] Lighthouse LCP < 2.5s for `/` and `/login`

### Ops
- [ ] All leaked credentials rotated (Railway API, Vercel API, Postgres pw, JWT_SECRET)
- [ ] Production env vars live in dashboards, not in repo
- [ ] Staging environment separated from prod (different DB, different Redis)
- [ ] Release process documented (`docs/RELEASE_PROCESS.md`)
- [ ] Runbook covers top 7 incidents (`docs/RUNBOOK.md`)
- [ ] On-call contact list defined (even if solo: Willy + 1 backup contact)
- [ ] Status page or comms channel ready (e.g. ZaloOA or Telegram channel for users)

### Business / Legal
- [ ] Privacy policy + terms of service live and linked from footer
- [ ] eKYC capture flow tested end-to-end with real ID
- [ ] Payment reconciliation process documented (who confirms manual bank deposits, SLA?)
- [ ] Withdraw / payout process documented
- [ ] Customer support channel live (hotline, Zalo, email)

---

## 4. Risk matrix

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Test writing blows past 2 weeks | Med | Med | If at end of W2 coverage <50%, defer non-money services (kycService, notification) to post-launch |
| Sentry / monitoring vendor lock-in / cost surprise | Low | Low | Free tier limits documented; can swap to Grafana Cloud (also free tier) without code change if structured logging |
| Web/worker split breaks queue jobs | Med | High | Roll out behind `WORKER_PROCESS=separate` flag; staging soak 3 days before prod cutover |
| Cred rotation locks out CI / scripts | Med | High | Rotate one at a time, verify CI still passes after each |
| Vercel/Railway downtime during launch | Low | High | Status page ready; uptime alerts route to phone; runbook has rollback steps |
| Hidden N+1 in route not yet audited explodes under load | Med | Med | Load test (W6) will surface; Prisma `query` logs in staging for 1 week pre-launch to catch slow queries |
| eKYC face/ID rejection rate high → user complaint flood | Med | Med | Manual review queue + clear error messages; have admin on standby first 48h post-launch |

---

## 5. Out of scope (defer post-launch)

These are valid but not gating:
- Migrate Next.js 16 → 15 (CTO §5.3) — only do if Next 16 causes ongoing pain
- Monorepo shared types (CTO §5.4) — nice-to-have, do when first DTO mismatch causes bug
- E2E Playwright suite (CTO §6) — manual smoke is acceptable for first 100 users
- OpenAPI spec autogen (CTO §6) — only worth it if 3rd-party integration needed
- Accessibility audit WCAG 2.1 AA (CTO §6) — should-do but not gate
- Schema modularization (CTO §5.1) — only worth refactor at 60+ models; currently 51
- PgBouncer (CTO §5.2) — defer until connection pool actually saturates (monitor; alert at >70%)

These can be slotted into Q3/Q4 after first 100 users live and feedback is real.

---

## 6. Track-as-we-go log

After execution, create `docs/HARDENING_LOG.md` updated daily:
```
## 2026-05-XX (Day N)
- Done: ...
- Blocked: ...
- Decisions made: ...
- Test coverage delta: services X% → Y%
```

Helps stakeholders see progress without status meetings; helps Claude/future you understand WHY some decisions made.

---

## 7. Definition of "ready to launch"

System is ready when:
1. Pre-launch checklist 100% green
2. Soft launch dry run on staging completed with no P0/P1 issues
3. Load test passed (100 concurrent CTV, p95 < 500ms, 0 errors)
4. Runbook reviewed by Willy + at least 1 person who could pick up on-call in a pinch
5. Rollback plan documented (revert to previous Vercel deployment + Railway redeploy previous image — both already easy via dashboard, document the exact steps)
6. First 10 users are pre-vetted internal/friendly users (not random public)

---

## 8. Post-launch first 30 days

After opening to first real users:
- Daily morning check: Sentry dashboard, uptime stats, queue depth, money path errors
- Weekly: review N+1 candidates from Prisma slow query log, fix top 3
- Weekly: review LOST leads with reason='price' — pricing signals
- 30-day: retro on what surprised you; update runbook with new incident types

If first 30 days clean → graduate from "hardening mode" to "feature mode" (start Product M0 + CRM M0 implementation).

---

## 9. Estimated cost (cash, monthly post-launch)

| Item | Cost | Notes |
|---|---|---|
| Vercel Hobby/Pro | $0–$20 | Hobby free first; Pro if traffic + team |
| Railway Hobby (current) | $5–$10 | Per usage; could grow to $20–30 with full prod traffic |
| Sentry free tier | $0 | 5K errors/month, sufficient pre-100-users |
| Better Stack / Uptime Kuma | $0–$24 | Free tier 10 monitors; paid for SMS alerts |
| Backup storage (B2) | $0–$1 | 10GB free, then ~$0.005/GB/month |
| Cloudflare (DNS) | $0 | Free; recommend for DDoS protection later |
| **Total month 1–3** | **~$5–$50/mo** | Negligible vs business value |

After 100+ users: re-evaluate tier upgrades based on actual usage.
