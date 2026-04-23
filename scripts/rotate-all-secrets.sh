#!/bin/bash
# CCB Mart — Pre-launch credential rotation runbook.
# RUN THIS ONLY on launch day (after final QA, before opening signups).
# Anything output here is sensitive — do NOT commit or paste in chat.

set -e

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  CCB Mart Pre-Launch Credential Rotation"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "WARNING: This script prints new secrets to stdout."
echo "         Do NOT redirect to a file or paste anywhere public."
echo ""
read -p "Continue? (type 'yes'): " confirm
[ "$confirm" != "yes" ] && { echo "Aborted."; exit 1; }

echo ""
echo "──────────────────────────────────────────────"
echo "Step 1: Generate fresh JWT + refresh secrets"
echo "──────────────────────────────────────────────"
NEW_JWT=$(openssl rand -base64 48)
NEW_REFRESH=$(openssl rand -base64 48)
NEW_CSRF=$(openssl rand -base64 32)
echo ""
echo "Set these in Railway → ccbmart service → Variables:"
echo "  JWT_SECRET=$NEW_JWT"
echo "  JWT_REFRESH_SECRET=$NEW_REFRESH"
echo "  CSRF_SECRET=$NEW_CSRF"
echo ""
read -p "Press enter when Railway vars are updated..."

echo ""
echo "──────────────────────────────────────────────"
echo "Step 2: Rotate PostgreSQL password"
echo "──────────────────────────────────────────────"
echo "  1. Railway → Postgres service → Variables"
echo "  2. Regenerate POSTGRES_PASSWORD"
echo "  3. Railway auto-updates DATABASE_URL reference"
echo "  4. Trigger ccbmart service redeploy"
echo ""
read -p "Press enter when postgres password is rotated..."

echo ""
echo "──────────────────────────────────────────────"
echo "Step 3: Revoke old API tokens"
echo "──────────────────────────────────────────────"
echo "  Railway: https://railway.app/account/tokens"
echo "           → revoke tokens starting with '51fc05d1-'"
echo "  Vercel:  https://vercel.com/account/tokens"
echo "           → delete tokens starting with 'vcp_3Cie'"
echo ""
read -p "Press enter when old tokens are revoked..."

echo ""
echo "──────────────────────────────────────────────"
echo "Step 4: Generate new automation tokens"
echo "──────────────────────────────────────────────"
echo "  Railway: Account → Tokens → 'ccbmart-gh-actions'"
echo "  Vercel:  Account → Tokens → 'ccbmart-gh-actions'"
echo ""
echo "  Then in GitHub → repo Settings → Secrets:"
echo "    RAILWAY_TOKEN_PROD = <new Railway token>"
echo "    VERCEL_TOKEN       = <new Vercel token>"
echo "    VERCEL_ORG_ID      = team_XI7AfqWjJO8nlyPgE7BQR9Ju"
echo "    VERCEL_PROJECT_ID  = prj_xwOMlTGbeG7W0DCCqqrciRf4IJZn"
echo ""
read -p "Press enter when GitHub secrets are set..."

echo ""
echo "──────────────────────────────────────────────"
echo "Step 5: Verify production"
echo "──────────────────────────────────────────────"
echo "  Running smoke tests..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.ccb.x-wise.io/api/ping || echo "fail")
FE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://ccb.x-wise.io/ || echo "fail")
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://ccb.x-wise.io/login || echo "fail")

echo "  api/ping        → $API_STATUS (expected 200)"
echo "  frontend /      → $FE_STATUS (expected 200)"
echo "  frontend /login → $LOGIN_STATUS (expected 200)"

if [ "$API_STATUS" = "200" ] && [ "$FE_STATUS" = "200" ] && [ "$LOGIN_STATUS" = "200" ]; then
  echo ""
  echo "  ✓ All green. Rotation complete."
else
  echo ""
  echo "  ✗ One or more endpoints failed. Investigate before launch."
  exit 1
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  Rotation complete. Proceed with launch."
echo "══════════════════════════════════════════════════════════════"
