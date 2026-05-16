/**
 * Sentry initialization — scaffold for Spec 03 Tuần 1 Day 1-2.
 *
 * Active only when SENTRY_DSN env is set. Safe to require in dev (no-op).
 * Add `SENTRY_DSN=https://...@...ingest.sentry.io/...` to .env once a
 * Sentry project is created.
 *
 * Note: @sentry/node is NOT yet in package.json. To activate, run:
 *   npm i @sentry/node
 * Then set SENTRY_DSN env.
 */

let Sentry = null;

function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.log('[Sentry] No SENTRY_DSN — skipping init (dev mode).');
    return null;
  }
  try {
    // eslint-disable-next-line global-require
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || 'v3.1',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_RATE || '0.1'),
      // Filter low-value noise
      beforeSend(event, hint) {
        const err = hint?.originalException;
        if (err && err.code === 'P2002') return null; // unique-violation; expected business case
        return event;
      },
    });
    console.log('[Sentry] Initialized.');
    return Sentry;
  } catch (e) {
    console.warn('[Sentry] Init failed (likely @sentry/node not installed):', e.message);
    return null;
  }
}

function captureException(err, context = {}) {
  if (Sentry) Sentry.captureException(err, { extra: context });
}

function captureMessage(msg, level = 'info') {
  if (Sentry) Sentry.captureMessage(msg, level);
}

module.exports = { initSentry, captureException, captureMessage };
