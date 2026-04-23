# P2 — httpOnly Cookie Auth Design

Blueprint for migrating JWT from `localStorage` to httpOnly cookies. Reviewed before code is written in P2.

## Why

Current (V13.4.0):
- 7-day JWT in `localStorage`
- Any XSS (malicious npm dep, unsafe `dangerouslySetInnerHTML`, compromised third-party script) = attacker reads token = admin session hijacked
- This is the #1 security risk for the app per CTO audit §3.2

Target:
- Access token (15 min) in httpOnly cookie — inaccessible to JS
- Refresh token (7 days) in httpOnly cookie — rotated on each use
- CSRF via double-submit cookie pattern
- XSS can no longer exfiltrate the session

## Token lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ Login                                                        │
│   POST /api/auth/login { email, pass }                       │
│   ← Set-Cookie: access=<JWT-15min>; HttpOnly; Secure; SameSite=Lax │
│   ← Set-Cookie: refresh=<JWT-7day>; HttpOnly; Secure; SameSite=Lax │
│   ← Set-Cookie: csrf=<random32>; Secure; SameSite=Lax         │
│   ← body: { user: {...} }   // no token here                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Authenticated request                                        │
│   GET /api/admin/dashboard                                   │
│     Cookie: access=<JWT>; csrf=<random>                      │
│     X-CSRF-Token: <random>    // only for POST/PUT/DELETE/PATCH │
│   Server checks: access valid + csrf cookie == csrf header   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Access expired (401)                                         │
│   Client calls POST /api/auth/refresh                        │
│     Cookie: refresh=<JWT>                                    │
│   ← Set-Cookie: access=<NEW-15min>                           │
│   ← Set-Cookie: refresh=<NEW-7day>   // rotated               │
│   Client retries original request                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Logout                                                       │
│   POST /api/auth/logout                                      │
│     Cookie: access, refresh                                  │
│   Server: delete refresh token from DB (revoke)              │
│   ← Set-Cookie: access=; Max-Age=0                           │
│   ← Set-Cookie: refresh=; Max-Age=0                          │
│   ← Set-Cookie: csrf=; Max-Age=0                             │
└─────────────────────────────────────────────────────────────┘
```

## CSRF — double-submit cookie

- Server generates `csrf` token (32 bytes random), sets as cookie (NOT httpOnly — must be JS-readable)
- For every mutation request (POST/PUT/DELETE/PATCH), client reads `csrf` cookie and sends as `X-CSRF-Token` header
- Server compares cookie value vs header value → must match
- Because attacker cannot read cookies cross-origin, forging the header is impossible
- Read-only GET requests don't need CSRF check (browsers don't send custom headers cross-origin)

## Refresh token storage (new table)

```prisma
model RefreshToken {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  tokenHash String   @unique @map("token_hash")  // SHA256 of the actual token
  issuedAt  DateTime @default(now()) @map("issued_at")
  expiresAt DateTime @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  replacedBy Int?    @map("replaced_by")  // rotation chain
  userAgent String?  @map("user_agent")
  ip        String?

  user User @relation(fields: [userId], references: [id])

  @@map("refresh_tokens")
  @@index([userId, revokedAt])
  @@index([expiresAt])
}
```

- Token itself is signed JWT (stateless verify) + stored hash (for revocation check)
- On rotation: old token marked revoked, new token chain via `replacedBy`
- Detect token theft: if someone uses a revoked token → revoke entire user session chain (all tokens for that user)
- Cleanup job: delete rows where `expiresAt < NOW() - 30 days`

## Breaking changes for frontend

| Current | New |
|---|---|
| `localStorage.setItem('token', data.token)` | Nothing — cookies are set automatically by browser |
| `fetch(url, { headers: { Authorization: 'Bearer ' + token } })` | `fetch(url, { credentials: 'include', headers: { 'X-CSRF-Token': readCookie('csrf') } })` |
| `localStorage.getItem('token')` for checking login | `GET /api/auth/me` → 200 if logged in, 401 if not |
| Manual logout: clear localStorage | `POST /api/auth/logout` |
| SSE: `?token=` query param | Already migrated to ticket in V13.4 ✓ |

## Migration phasing (safest approach)

**Phase 2A — coexistence period (1 day):**
- Backend supports BOTH cookie auth AND `Authorization: Bearer` header
- Login endpoint returns cookie AND token in body (temporary)
- Deploy → no user impact (old frontend still works)

**Phase 2B — frontend migration (2 days):**
- Create `lib/auth-client.ts` — fetch wrapper that handles cookies + CSRF + auto-refresh
- Create `hooks/useAuth.ts` — React hook for auth state
- Migrate every `fetch(API + url, ...)` call to use the new client
- Replace `localStorage.getItem('token')` calls with `useAuth()` hook
- Remove `localStorage.setItem` after successful login
- Deploy → new frontend uses cookies; backend accepts both
- Verify on staging: test login/logout/refresh/CSRF rejection

**Phase 2C — deprecate Bearer (1 day, after 48h soak):**
- Remove `Authorization` header support from backend
- Remove `token` from login response body
- Deploy → any client still holding an old token gets 401 → re-login

**Rollback plan:**
- Phase 2A: risk-free, backward compat
- Phase 2B: if frontend breaks → Vercel rollback 1 click
- Phase 2C: if issues → re-enable Bearer path (branches kept for 2 weeks)

## Files to create / modify (P2 deliverables)

### Backend
- `backend/src/middleware/auth.js` — update to read from cookie first, header fallback (2A)
- `backend/src/middleware/csrf.js` — new double-submit middleware
- `backend/src/middleware/cookies.js` — helpers `setAuthCookies`, `clearAuthCookies`
- `backend/src/routes/auth.js` — add `POST /refresh`, `POST /logout`, update `/login`
- `backend/src/services/refreshToken.js` — issue/verify/rotate/revoke
- `backend/prisma/schema.prisma` — add `RefreshToken` model (Int ID, matches existing convention)
- `backend/src/jobs/refreshTokenCleanup.js` — daily cron to prune expired
- Package dependency: `cookie-parser` (~30KB)

### Frontend
- `frontend/src/lib/auth-client.ts` — fetch wrapper with credentials + CSRF + 401 retry
- `frontend/src/hooks/useAuth.ts` — `{ user, login, logout, isLoading, isAuthenticated }`
- `frontend/src/middleware.ts` — edge auth check (optional, nice UX for redirect)
- Replace `api.ts` `fetchAPI()` to use auth-client
- Update `login/page.tsx` to call new login flow + redirect on success
- Remove `localStorage.getItem('token')` from `DashboardLayout.tsx`, `Sidebar.tsx`, `useSSE.ts`

## Open questions for implementation

1. **Session fixation on role switch** — if admin uses "impersonate user" feature (do we have one?), we need to invalidate the old session. Assumed: no impersonation feature for now.

2. **Cross-subdomain cookies** — `api.ccb.x-wise.io` vs `ccb.x-wise.io`. Options:
   - (a) Set cookie `Domain=.x-wise.io` so both subdomains share it. Works but broader scope.
   - (b) Set cookie on `api.ccb.x-wise.io` only, frontend calls same-site via the Next rewrite. **Recommended** — tighter isolation.
   - Will implement (b).

3. **Mobile app?** — None today. If added later, keep the Bearer path alive for native apps (cookies don't work in React Native WebView easily).

4. **"Remember me" toggle** — skip for now. Refresh = 7 days by default, no long-lived option.

5. **Concurrent sessions** — allow multiple refresh tokens per user (one per device). Logout only kills current session unless user clicks "Logout from all devices" → nukes all refresh tokens for user.

## Non-goals for P2

- SSO / OAuth providers — backlog
- 2FA / MFA — backlog  
- Device fingerprinting for anomaly detection — future (§4.2 observability)
- Geo-based login blocking — future

---

**Sign-off required from product owner before P2 implementation starts.**

Key decisions to confirm:
- [ ] 15-minute access + 7-day refresh OK? (vs e.g. 1h + 30-day)
- [ ] Logout-from-all-devices feature needed in P2 or defer?
- [ ] Cross-subdomain cookies (option a) or tight API-only (option b)? → **Recommended: b**
- [ ] Accept 2-week window supporting both auth methods during migration?

Once signed off, P2 implementation ~5 working days on staging, then phased rollout.
