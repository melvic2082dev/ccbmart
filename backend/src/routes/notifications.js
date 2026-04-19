const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getUserNotifications, markAsRead, markAllAsRead } = require('../services/notification');

const router = express.Router();

router.use(authenticate);

// Get notifications for current user
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const result = await getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
    });
    res.json(result);
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// Mark single notification as read
router.post('/:id/read', async (req, res) => {
  try {
    await markAsRead(parseInt(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// Mark all as read
router.post('/read-all', async (req, res) => {
  try {
    await markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
