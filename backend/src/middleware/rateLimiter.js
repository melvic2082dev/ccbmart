const rateLimit = require('express-rate-limit');

// Disable strict per-IP throttling in non-production so a single dev box
// (which often retries logins, hot-reloads, runs tests) doesn't lock itself
// out. Production keeps the real limits.
const isProd = process.env.NODE_ENV === 'production';

// Global rate limiter: 1000 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProd,
});

// Login rate limiter: 5 attempts per 15 minutes (prod) — relaxed in dev
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 200,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// API rate limiter: 200 requests per 15 minutes (for authenticated users)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'API rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Write-protection limiter: 60 mutations per minute per IP
// Applied to admin mutation endpoints that change money, users, or config.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Write rate limit exceeded, slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { globalLimiter, loginLimiter, apiLimiter, writeLimiter };
