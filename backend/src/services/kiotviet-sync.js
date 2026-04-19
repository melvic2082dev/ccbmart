const prisma = require('../lib/prisma');

async function simulateSync() {
  const syncLog = await prisma.syncLog.create({
    data: {
      source: 'kiotviet',
      recordsSynced: Math.floor(Math.random() * 50) + 10,
      status: 'success',
    },
  });
  return syncLog;
}

async function getSyncHistory(limit = 20) {
  return prisma.syncLog.findMany({
    orderBy: { syncedAt: 'desc' },
    take: limit,
  });
}

module.exports = { simulateSync, getSyncHistory };
