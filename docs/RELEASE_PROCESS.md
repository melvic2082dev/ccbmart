# CCB Mart — Release Process

**Last updated:** 2026-05-15
**Status:** v3.x (pre-launch dev phase)

This is the release-and-promotion playbook. Once first real users come on, follow it strictly.

---

## Current phase (v3.x dev) — direct-to-main allowed

While no real users exist, `git push origin main` is acceptable for speed. Each release:

1. Implement on local main, verify backend + frontend HMR happy
2. Run local tests: `cd backend && npx jest`
3. `git push origin main` — triggers Vercel + Railway auto-deploy
4. Verify both prod URLs:
   - `curl -I https://api.ccb.x-wise.io/api/ping` → 200
   - `curl -I https://ccb.x-wise.io` → 200
5. Tag the release: `git tag -a vX.Y -m "Release notes" && git push origin vX.Y`

**This shortcut ends once user #1 signs up.** From then on use §2.

---

## Post-launch phase (v4.x onward) — staging gate required

Branch flow:
```
feature/foo  ─┐
              ├─→ PR ─→ Vercel preview deploy ─→ review ─┐
fix/bar      ─┘                                          │
                                                         ▼
                                                       merge to `staging` branch
                                                         │
                                                         ▼
                                     Railway staging service auto-deploys
                                     staging-ccb.x-wise.io
                                                         │
                                                         ▼
                                           QA / soak ≥ 24h
                                                         │
                                                         ▼
                                          PR `staging → main`
                                                         │
                                                         ▼
                                            Vercel + Railway prod deploy
                                                         │
                                                         ▼
                                                  tag vX.Y
```

### Rules
- **Never** push directly to `main` once users exist
- All PRs must pass: lint + typecheck + unit tests + preview deploy green
- Money-path service changes (`backend/src/services/commission*`, `breakaway*`, `tax*`, `training*`, `membership*`, `soft-salary*`) require ≥ 1 review approval
- Migrations require dry-run on staging first; rollback SQL must accompany every migration
- Feature flags (env var pattern `USE_*_FLOW=true`) for any breaking behavior change; default off; flip after soak

---

## Tagging convention

| Tag pattern | Meaning | Examples |
|---|---|---|
| `vMAJOR.MINOR` | Production release | `v3.0`, `v3.1`, `v4.0` |
| `vX.Y-rc.N` | Release candidate (deployed to staging, not prod) | `v4.0-rc.1` |
| `vX.Y-hotfix.N` | Emergency patch on production | `v3.1-hotfix.1` |

Tag message format:
```
Release vX.Y — <one-line summary>

Includes:
- <feature 1>
- <feature 2>

Migrations: <yes/no>; feature flags: <list or none>
```

---

## Pre-release checklist (post-launch)

Before tagging vX.Y and promoting to prod:

- [ ] All PRs in this release merged to `staging`
- [ ] CI green on `staging` for 24h
- [ ] Sentry shows no new error patterns in last 24h
- [ ] Database migrations tested on staging (forward + rollback)
- [ ] If migration applied: dry-run rollback SQL on a copy
- [ ] Release notes written in `docs/RELEASES.md`
- [ ] Feature flags documented (which env vars to flip post-deploy)
- [ ] Rollback plan documented (which previous tag to revert to)

---

## Rollback procedure

### Code-only regression
1. `git revert <bad-merge-sha>` on `main`
2. `git push origin main` — auto-deploys revert
3. Tag the revert: `git tag -a vX.Y-rollback.1 -m "Reason"`

### Code + migration regression
1. First: `git revert` on main → push (un-deploys bad code)
2. Then: SSH into staging, run the matching `rollback.sql` for the bad migration
3. Then: rotate Vercel/Railway to use previous good build
4. Document in `docs/HARDENING_LOG.md` what happened

### Catastrophic (data corruption)
- Restore Postgres from Railway daily snapshot (up to 24h data loss)
- Restore filesystem from latest B2 backup
- All affected users get an apology + status update via Zalo OA

---

## Hotfix procedure

Production-critical bug found:

1. `git checkout main && git pull`
2. `git checkout -b hotfix/<short-name>`
3. Fix + test locally
4. `git push origin hotfix/<short-name>` → Vercel preview
5. Manual verify the preview
6. PR `hotfix → main` with at least async approval (Slack/email OK)
7. After merge, tag: `git tag -a vX.Y-hotfix.N -m "Hotfix: <description>"`
8. Cherry-pick into `staging` to keep branches in sync:
   `git checkout staging && git cherry-pick <hotfix-sha> && git push`

Goal: hotfix to prod in < 30 min from confirmation of bug.

---

## Release schedule (target post-launch)

- **Patch releases (vX.Y.Z)**: weekly, Tuesdays
- **Minor releases (vX.Y)**: monthly, last Tuesday
- **Major releases (vX.0)**: quarterly or as needed

Pre-launch (v3.x): on-demand, no fixed cadence.

---

## Communication

- Internal: commit messages + tag annotations
- External (users): for any user-visible change, draft a Zalo OA broadcast or in-app banner
- Status page (TODO): once we have one, post planned maintenance windows ≥ 24h ahead
