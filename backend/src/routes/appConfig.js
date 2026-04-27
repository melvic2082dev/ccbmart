// Public-ish app config — values the frontend needs to render correctly
// without hard-coding (currently just COMBO_PRICE so UI doesn't drift from
// what the backend actually charges).
//
// Admin-managed pricing tables live at /api/admin/config (admin-only).

const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', (req, res) => {
  res.json({
    comboPrice: parseInt(process.env.COMBO_PRICE || '2000000', 10),
  });
});

module.exports = router;
