const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const config = require('../config');
const { loginLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../middleware/validate');
const { logAudit } = require('../middleware/auditLog');

const router = express.Router();
const prisma = new PrismaClient();

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

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        rank: user.rank,
        name: user.name,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  let userId = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], config.jwt.secret);
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
  res.json({ success: true });
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, rank: true, name: true, phone: true },
    });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
