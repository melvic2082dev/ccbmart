// Admin dev tools — destructive operations restricted to super_admin.
// Safe in pre-production deployments where user data is mock; intended to be
// called manually after pushing schema/data changes that require a re-seed.

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { authorize } = require('../../middleware/auth');
const { SUPER_ADMIN } = require('../../lib/permissions');

const router = express.Router();

const SUPER_ONLY = authorize(SUPER_ADMIN);
const BACKEND_ROOT = path.resolve(__dirname, '..', '..', '..');
const STATE_FILE = path.join(os.tmpdir(), 'ccbmart-dev-seed-state.json');

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return null; }
}

function writeState(s) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s));
}

// POST /admin/dev/reset-and-seed — kicks off `prisma migrate reset --force` in
// a detached child so the HTTP response returns immediately (Railway's proxy
// times out > 5 min). Status is tracked in a temp file; poll GET /admin/dev/seed-status.
router.post('/dev/reset-and-seed', SUPER_ONLY, asyncHandler(async (req, res) => {
  const existing = readState();
  if (existing && existing.status === 'running') {
    return res.status(409).json({ error: 'A seed run is already in progress', startedAt: existing.startedAt });
  }
  const logPath = path.join(os.tmpdir(), `ccbmart-dev-seed-${Date.now()}.log`);
  const out = fs.openSync(logPath, 'w');
  const child = spawn('npx', ['prisma', 'migrate', 'reset', '--force'], {
    cwd: BACKEND_ROOT,
    env: { ...process.env, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'admin-endpoint-reset' },
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  const startedAt = new Date().toISOString();
  writeState({ status: 'running', pid: child.pid, startedAt, logPath });
  child.on('exit', (code) => {
    writeState({
      status: code === 0 ? 'success' : 'failed',
      pid: child.pid,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: code,
      logPath,
    });
  });
  res.status(202).json({ ok: true, started: true, pid: child.pid, startedAt, statusEndpoint: '/admin/dev/seed-status' });
}));

// GET /admin/dev/seed-status — poll status of last reset-and-seed run
router.get('/dev/seed-status', SUPER_ONLY, asyncHandler(async (_req, res) => {
  const s = readState();
  if (!s) return res.json({ status: 'never_run' });
  let logTail = '';
  try {
    if (s.logPath && fs.existsSync(s.logPath)) {
      const buf = fs.readFileSync(s.logPath, 'utf8');
      logTail = buf.split('\n').slice(-30).join('\n');
    }
  } catch {}
  res.json({ ...s, logTail });
}));

module.exports = router;
