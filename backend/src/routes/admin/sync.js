const express = require('express');
const { addSyncJob, getSyncHistory } = require('../../queues/syncQueue');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();

router.post('/sync', asyncHandler(async (req, res) => {
  const result = await addSyncJob('batch-sync', { dateRange: req.body?.dateRange || 'last-7-days' });
  res.json({ message: 'Sync job initiated', ...result });
}));

router.get('/sync-history', asyncHandler(async (req, res) => {
  const history = await getSyncHistory();
  res.json(history);
}));

module.exports = router;
