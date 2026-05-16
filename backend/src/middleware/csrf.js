/**
 * CSRF protection — double-submit cookie pattern.
 * Spec: docs/specs/03_HARDENING_PLAN.md §3 Tuần 3 Day 2.
 *
 * Active only when ENABLE_CSRF=true. Default off during v3.1 dev phase
 * until JWT cookie migration (P2) is fully verified across the frontend.
 *
 * How it works:
 * 1. On any GET, if request lacks ccsrf cookie, set one with a random token.
 * 2. On mutation methods (POST/PUT/PATCH/DELETE) require `X-CSRF-Token` header
 *    to match the `ccsrf` cookie value.
 * 3. Webhook routes are exempt (they're signed separately).
 *
 * The frontend reads document.cookie['ccsrf'] and echoes it back in the header.
 * Because cookies are same-origin only, a cross-site attacker can't read it.
 */

const crypto = require('crypto');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const COOKIE_NAME = 'ccsrf';
const HEADER_NAME = 'x-csrf-token';

// Paths exempt from CSRF (must use their own auth: HMAC for webhooks)
const EXEMPT_PATHS = [
  /^\/api\/auth\/login$/,        // login itself can't have csrf yet
  /^\/webhook\//,                // payment provider webhooks
  /^\/api\/health/,
  /^\/api\/ping/,
];

function isExempt(req) {
  return EXEMPT_PATHS.some((re) => re.test(req.path));
}

function parseCookies(header = '') {
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function csrfMiddleware(req, res, next) {
  if (process.env.ENABLE_CSRF !== 'true') return next();
  if (isExempt(req)) return next();

  const cookies = parseCookies(req.headers.cookie || '');
  let token = cookies[COOKIE_NAME];

  // Issue token on safe methods if missing
  if (!MUTATING_METHODS.has(req.method)) {
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      res.setHeader(
        'Set-Cookie',
        `${COOKIE_NAME}=${token}; Path=/; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 7}`,
      );
    }
    return next();
  }

  // Enforce on mutations
  const headerToken = req.headers[HEADER_NAME];
  if (!token || !headerToken || token !== headerToken) {
    return res.status(403).json({ error: 'CSRF token missing or invalid' });
  }
  return next();
}

module.exports = { csrfMiddleware, COOKIE_NAME, HEADER_NAME };
