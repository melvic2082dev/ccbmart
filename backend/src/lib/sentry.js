// Sentry scaffolding — no-op unless SENTRY_DSN is set AND @sentry/node is installed.
// Install: npm i @sentry/node @sentry/profiling-node
// Configure: set SENTRY_DSN env var in Railway.

let Sentry = null;

function initSentry() {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  try {
    Sentry = require('@sentry/node');
    const { nodeProfilingIntegration } = safeRequire('@sentry/profiling-node') || {};
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: nodeProfilingIntegration ? [nodeProfilingIntegration()] : [],
      tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE || 0.1),
      profilesSampleRate: Number(process.env.SENTRY_PROFILES_RATE || 0.1),
      release: process.env.RAILWAY_DEPLOYMENT_ID || process.env.GIT_COMMIT_SHA,
    });
    console.log('[Sentry] initialized');
  } catch (err) {
    console.warn('[Sentry] package not installed, skipping:', err.message);
    Sentry = null;
  }
}

function safeRequire(name) {
  try { return require(name); } catch { return null; }
}

function captureException(err, context) {
  if (!Sentry) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

function captureMessage(msg, level = 'info') {
  if (!Sentry) return;
  Sentry.captureMessage(msg, level);
}

module.exports = { initSentry, captureException, captureMessage, get Sentry() { return Sentry; } };
