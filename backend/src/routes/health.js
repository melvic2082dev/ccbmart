const router = require('express').Router();
const prisma = require('../lib/prisma');
const { getRedisClient } = require('../services/cache');

router.get('/', async (req, res) => {
  const checks = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (err) {
    checks.database = { status: 'error', error: err.message };
  }

  try {
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.ping();
      checks.redis = { status: 'ok' };
    } else {
      checks.redis = { status: 'disabled' };
    }
  } catch (err) {
    checks.redis = { status: 'error', error: err.message };
  }

  const mem = process.memoryUsage();
  const allOk = Object.values(checks).every(c => ['ok', 'disabled'].includes(c.status));

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
    },
    checks,
  });
});

module.exports = router;
