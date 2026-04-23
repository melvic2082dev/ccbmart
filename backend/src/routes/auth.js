const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { loginLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../middleware/validate');
const { logAudit } = require('../middleware/auditLog');
const { authenticate: authMw } = require('../middleware/auth');

const router = express.Router();
const prisma = require('../lib/prisma');

router.post('/login', loginLimiter, validate(schemas.login), async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logAudit({
        action: 'LOGIN_FAILED',
        targetType: 'User',
        ipAddress: ip,
        userAgent,
        status: 'FAILURE',
        metadata: { email, reason: 'user_not_found' },
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logAudit({
        userId: user.id,
        action: 'LOGIN_FAILED',
        targetType: 'User',
        targetId: user.id,
        ipAddress: ip,
        userAgent,
        status: 'FAILURE',
        metadata: { email, reason: 'bad_password' },
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, rank: user.rank, name: user.name },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    logAudit({
      userId: user.id,
      action: 'LOGIN',
      targetType: 'User',
      targetId: user.id,
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      metadata: { role: user.role, rank: user.rank },
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        rank: user.rank,
        name: user.name,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers.authorization;
  const rawToken = cookieToken
    || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

  let userId = null;
  if (rawToken) {
    try {
      const decoded = jwt.verify(rawToken, config.jwt.secret);
      userId = decoded.id;
    } catch { /* ignore */ }
  }
  if (userId) {
    logAudit({
      userId,
      action: 'LOGOUT',
      targetType: 'User',
      targetId: userId,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
      status: 'SUCCESS',
    });
  }
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ success: true });
});

router.get('/me', authMw, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, role: true, rank: true, name: true, phone: true, isActive: true },
    });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Account inactive or not found' });
    const { isActive, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
