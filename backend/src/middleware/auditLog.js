const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SENSITIVE_FIELDS = new Set([
  'passwordHash',
  'password',
  'token',
  'bankAccount',
  'bankAccountNo',
  'idNumber',
  'idFrontImage',
  'idBackImage',
  'kycIpAddress',
  'otpCode',
]);

function sanitize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(k)) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      out[k] = sanitize(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function safeStringify(obj) {
  try {
    const s = JSON.stringify(sanitize(obj));
    return s && s.length > 4000 ? s.slice(0, 4000) + '...[truncated]' : s;
  } catch {
    return null;
  }
}

async function logAudit(data) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId ?? null,
        action: data.action,
        targetType: data.targetType ?? null,
        targetId: data.targetId ?? null,
        oldValue: data.oldValue ? (typeof data.oldValue === 'string' ? data.oldValue : safeStringify(data.oldValue)) : null,
        newValue: data.newValue ? (typeof data.newValue === 'string' ? data.newValue : safeStringify(data.newValue)) : null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        status: data.status || 'SUCCESS',
        metadata: data.metadata ? (typeof data.metadata === 'string' ? data.metadata : safeStringify(data.metadata)) : null,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write log:', err.message);
  }
}

function auditLog(action, targetType) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const reqBody = req.body;
    const start = Date.now();

    let finished = false;
    const captureAndLog = (body) => {
      if (finished) return;
      finished = true;
      const status = res.statusCode >= 400 ? 'FAILURE' : 'SUCCESS';
      const targetId = req.params?.id ? parseInt(req.params.id, 10) : null;

      logAudit({
        userId: req.user?.id || null,
        action,
        targetType: targetType || null,
        targetId: Number.isFinite(targetId) ? targetId : null,
        newValue: reqBody,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
        status,
        metadata: {
          method: req.method,
          path: req.originalUrl,
          durationMs: Date.now() - start,
          ...(status === 'FAILURE' && body && typeof body === 'object' ? { error: body.error } : {}),
        },
      });
    };

    res.json = (body) => {
      captureAndLog(body);
      return originalJson(body);
    };
    res.send = (body) => {
      captureAndLog(body);
      return originalSend(body);
    };
    next();
  };
}

module.exports = { auditLog, logAudit, sanitize };
