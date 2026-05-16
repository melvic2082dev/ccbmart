# CCB Mart — Specs Directory

Specs for next major workstreams. Each doc is implementation-ready: schema, migration, file lists, acceptance criteria, rollback.

| # | File | Topic | Effort | Status |
|---|---|---|---|---|
| 01 | [01_PRODUCT_M0.md](./01_PRODUCT_M0.md) | Product Variant + Supplier + Inventory Batch; wire to Transaction flow | 8–12 days | Draft |
| 02 | [02_CRM_LIGHTWEIGHT.md](./02_CRM_LIGHTWEIGHT.md) | Lead + Activity model; CTV dashboard surface; follow-up notifications | 6–9 days | Draft |
| 03 | [03_HARDENING_PLAN.md](./03_HARDENING_PLAN.md) | 6-week pre-launch hardening based on CTO_AUDIT_REPORT.md | 24–30 days | Draft |

## Recommended execution order

1. **Spec 03 first** (hardening) — blocks real users. Run for 6 weeks.
2. **Spec 01 + 02 in parallel after launch** — both independent of each other; pick whichever has more business urgency.
   - If catalog diversity is the bottleneck → Spec 01 first
   - If CTV conversion is the bottleneck → Spec 02 first
3. Combine learnings into M1 specs (pricing rules, bundles, full CRM) after 1–3 months live data.

## Conventions

- All specs include: problem → schema → migration (forward + rollback) → impact analysis → file list → phasing → acceptance criteria → risk matrix.
- Effort estimates assume solo developer (Willy) with Claude pairing.
- Feature flag pattern: every breaking change behind env flag, staging soak ≥ 3 days before prod cutover.
- Migrations go in `backend/prisma/migrations/<date>_<name>/migration.sql` with sibling `rollback_*.sql` next to it.

## Update log

- 2026-05-15 — Specs 01/02/03 drafted by Claude per Willy Minh request.
