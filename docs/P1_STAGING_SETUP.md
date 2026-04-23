# P1 — Staging Environment Setup (Manual Steps)

CLI-automated attempts failed because the project token lacks permission to create new Railway environments (likely a plan restriction). These steps are **manual, one-time** work by the repo owner.

Once complete, the `staging` branch will automatically deploy to staging on every push, giving you a safe testing surface before anything reaches `main` / production.

> **Branching strategy**: `main` = production, `staging` = staging, `feature/*` = work in progress.
> No `develop` branch. Keeps things simple for a small team.

---

## Step 1 — Create Railway `staging` environment

1. Open Railway dashboard → Project "CCB Mart"
2. Top-right environment selector → **New Environment** → name it `staging`
3. When asked "Duplicate from existing?" → **Yes, duplicate from `production`**
   - This copies the `ccbmart`, Postgres, and Redis services with the same config
4. After creation, the staging environment will have its own isolated DB and Redis

## Step 2 — Point staging service at `staging` branch

1. In the `staging` environment → open the `ccbmart` service
2. **Settings** → **Source** → change **Production Branch** from `main` to `staging`
3. Save → Railway will auto-build the current `staging` HEAD

## Step 3 — Generate staging domain

1. `ccbmart` service (in staging) → **Settings** → **Networking**
2. **Generate Domain** → copy URL (will look like `ccbmart-staging-production.up.railway.app`)
3. Optionally: **Custom Domain** → `staging-api.ccb.x-wise.io` (if you control DNS)

## Step 4 — Seed staging Postgres

```bash
# From repo root, using staging public URL (Railway Settings → Postgres → Connect → Public):
cd backend
DATABASE_URL="postgresql://postgres:<PASSWORD>@<PROXY_HOST>:<PORT>/railway" \
  PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="staging seed" \
  npx prisma migrate reset --force
```

This drops staging DB and re-runs migrations + seed. Safe because staging has zero real users.

## Step 5 — Configure Vercel for `staging` branch

1. Vercel dashboard → `ccbmart` project → **Settings** → **Git**
2. **Production Branch**: keep as `main`
3. Under **Ignored Build Step** / **Preview Deployments**: ensure **All branches** is enabled
   - This makes pushes to `staging` create a preview deployment at `ccbmart-git-staging-*.vercel.app`
4. Optional: **Settings → Domains** → add `staging.ccb.x-wise.io` → assign to `staging` branch

## Step 6 — Create GitHub secrets

Go to `github.com/melvic2082dev/ccbmart/settings/secrets/actions`, add:

| Secret name | Value | Source |
|---|---|---|
| `RAILWAY_TOKEN_STAGING` | Project token scoped to staging env | Railway → Account → Tokens → Create → select staging |
| `RAILWAY_TOKEN_PROD` | Project token scoped to production env | Railway → Account → Tokens → Create → select production |
| `VERCEL_TOKEN` | Vercel personal access token | vercel.com/account/tokens |
| `VERCEL_ORG_ID` | `team_XI7AfqWjJO8nlyPgE7BQR9Ju` | Already known from prior audit |
| `VERCEL_PROJECT_ID` | `prj_xwOMlTGbeG7W0DCCqqrciRf4IJZn` | Already known |

And these repository **variables** (`settings/variables/actions`):

| Variable name | Example value |
|---|---|
| `STAGING_API_URL` | `https://staging-api.ccb.x-wise.io` (or Railway-generated URL) |
| `STAGING_FE_URL` | `https://ccbmart-git-staging-nguyen-quang-minhs-projects-36488a85.vercel.app` |

## Step 7 — Verify auto-deploy

```bash
# On your laptop:
git checkout staging
git pull origin staging

# Trigger deploy via empty commit
git commit --allow-empty -m "chore: verify staging auto-deploy"
git push origin staging
```

Check:
- GitHub Actions → **Deploy** workflow runs, resolves `target=staging`
- Railway staging service starts a new build
- Vercel creates a preview deploy at `ccbmart-git-staging-*.vercel.app`
- Smoke test: `curl $STAGING_API_URL/api/ping` → `{"ok":true}`

---

## Branch protection (recommended)

Settings → Branches → Add rule for `main`:
- Require pull request before merging (1 approval)
- Require status checks: `CI / test`, `CI / build`, `CI / lint`
- Require branches to be up to date
- Do not allow bypass

For `staging` (lighter):
- Require status checks: `CI / test`, `CI / build`

Result: no one (including you accidentally) can push directly to `main`. All production deploys go through PR from `staging` → `main`.

---

## Day-to-day workflow

```
feature/my-change
      ↓ PR (runs CI)
   staging  ─────────────→ auto-deploys to staging env (Railway + Vercel)
      ↓ PR when QA passes (runs CI)
     main   ─────────────→ manual trigger: Actions → Deploy → target=production
```

Rollback:
- Staging breaks: push revert commit to `staging`, or reset `staging` to last good commit
- Production breaks: Railway dashboard → Deployments → pick last healthy → "Redeploy"
  (Or: push revert to `main`, manually trigger Deploy workflow)
