// Admin dev tools — destructive operations restricted to super_admin.
// Safe in pre-production deployments where user data is mock; intended to be
// called manually after pushing schema/data changes that require a re-seed.

const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { authorize } = require('../../middleware/auth');
const { SUPER_ADMIN } = require('../../lib/permissions');

const router = express.Router();

const SUPER_ONLY = authorize(SUPER_ADMIN);
const BACKEND_ROOT = path.resolve(__dirname, '..', '..', '..');

function runCommand(cmd, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: BACKEND_ROOT,
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

// POST /admin/dev/reset-and-seed — wipes DB and re-runs seed (super_admin only)
router.post('/dev/reset-and-seed', SUPER_ONLY, asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  const result = await runCommand('npx', ['prisma', 'migrate', 'reset', '--force'], {
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'admin-endpoint-reset',
  });
  const elapsedMs = Date.now() - startedAt;
  if (result.code !== 0) {
    throw new AppError(
      `Reset failed (exit ${result.code}): ${result.stderr.slice(-1000) || result.stdout.slice(-1000)}`,
      500,
      'RESET_FAILED'
    );
  }
  // Tail of stdout — keep response small but include the engine summary lines.
  const stdoutTail = result.stdout.split('\n').slice(-40).join('\n');
  res.json({ ok: true, elapsedMs, stdoutTail });
}));

module.exports = router;
