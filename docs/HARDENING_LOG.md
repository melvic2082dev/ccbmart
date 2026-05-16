# Hardening Log

Daily progress tracker for Spec 03 (`docs/specs/03_HARDENING_PLAN.md`). Update as work is done. Helps future Claude/dev sessions understand WHY decisions were made without spelunking through commit history.

Format: `## YYYY-MM-DD (Day N)` then bullet sections: Done / Decisions / Blocked / Coverage delta.

---

## 2026-05-15 (Day 0 — kickoff with v3.1 release)

### Done
- Tagged `v3.0` baseline (pre-implementation): font bump + 3 spec docs
- Spec 01 (Product M0):
  - Schema: added `Supplier`, `ProductVariant`, `SupplierProduct`, `InventoryBatch` + extended `Product`, `TransactionItem`, `Customer`
  - Migration `20260515180000_p_v3_1_product_crm` applied to local Postgres
  - `inventory.js` service with FIFO allocation + batch restore on reject
  - `transaction.js` modified: `USE_VARIANT_FLOW=true` env flag toggles item-based pricing; legacy combo mode preserved bit-identical
  - `routes/products.js` mounted at `/api/admin` — CRUD for products/variants/suppliers/inventory
- Spec 02 (CRM Lightweight):
  - Schema: added `Lead`, `LeadActivity` + extended `Customer` (lifecycleStage, lastContactedAt, totalOrders)
  - `leadNotifier.js` for assigned / stage-changed / due-action / stale events
  - `leadFollowUpJob.js` cron: 15min due, 1h stale, daily auto-LOST after 30d
  - `routes/leads.js` mounted: CTV-facing (`/api/ctv/leads/*`) + admin (`/api/admin/leads`, `/api/admin/reports/conversion`)
- Spec 03 (Hardening) partial:
  - Wrote tests for `inventory.js` (12 tests) + `leadNotifier.js` (5 tests) — all green
  - `csrf.js` middleware scaffold (opt-in via `ENABLE_CSRF=true`)
  - `observability/sentry.js` scaffold (opt-in via `SENTRY_DSN`)
  - Confirmed Momo + ZaloPay signature verification already wired (TECH_DEBT §9 was outdated)
- Frontend scaffolds:
  - `/admin/products`, `/admin/suppliers`, `/admin/inventory`, `/admin/leads`, `/admin/reports/conversion`
  - `/ctv/leads`, `/ctv/leads/[id]`
- Docs: `RUNBOOK.md`, `RELEASE_PROCESS.md`, this `HARDENING_LOG.md`
- Seed: `prisma/seed-v3-1.js` adds 3 suppliers, 6 variants + batches, 30 leads (idempotent)

### Verified working
- Backend `/api/admin/products?limit=3` returns 15 total with variants embedded
- `/api/admin/suppliers` returns 3 with `_count.batches`
- `/api/admin/inventory` returns 6 batches
- `/api/admin/leads` returns 30 leads
- All 17 new unit tests pass

### Decisions made
- Variant flow opt-in via `USE_VARIANT_FLOW` rather than default-on: backward-compat with existing combo-only transactions until full UI flip
- CSRF middleware opt-in via `ENABLE_CSRF`: P2 cookie auth completeness not yet verified; once verified, flip on by default
- Sentry init code-only (no DSN): user must create Sentry project + set env var; once done, errors auto-flow
- Standalone `seed-v3-1.js` rather than rewriting main `seed.js`: keeps main idempotent + main seed can run without v3.1 tables (no FK panic)
- 30-day auto-LOST cron uses `lastContactedAt`, fallback `createdAt`: covers leads never contacted

### Blocked / deferred to next sessions
- Full money-path coverage (commission/breakaway/tax/training/membership/soft-salary) — only inventory + leadNotifier covered. Target: 70% per CTO audit §3.3. Estimated 1 week more.
- Sentry account creation + DSN — needs Willy
- CSRF + cookie auth full migration verification — needs full grep of `localStorage.getItem('token')` + Set-Cookie flag inspection
- Web/worker process split on Railway — needs dashboard config
- Credential rotation — needs Willy + Railway/Vercel/JWT_SECRET regen
- Bundle optimization (recharts dynamic import) — deferred
- Lighthouse CI in GH Actions — deferred
- N+1 fixes — deferred (will surface in production via slow-query log post-Sentry)
- ZaloPay full callback implementation — placeholder behavior preserved
- Real load test (k6 / Artillery) — needs prod-like env

### Coverage delta
- Before today: 0 tests on `backend/src/services/`
- After today: 17 tests across 2 services
- Estimated coverage: <5% (negligible at money path)

### v3.1 known limitations
- Variant flow not yet exposed in CTV UI sales form — they still create combo-fixed transactions
- Lead → Transaction conversion only creates Customer (not Transaction); CTV must navigate to sales create form separately
- No bulk import for products/variants/suppliers (admin must use API)
- Frontend uses `localStorage.getItem('token')` (per `api.ts`) — XSS exposure remains; full P2 cookie migration still incomplete
- Admin sidebar nav not yet updated with new pages — users access via direct URL

### Next session priorities
1. Money path tests (commission first — covers 80% of audit concern)
2. CSRF activation + JWT cookie verification
3. Admin sidebar nav updates
4. Variant flow in CTV sales create form (UI side)
