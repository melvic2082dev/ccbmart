const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  submitKyc,
  getKycStatus,
  verifyKyc,
  listPendingKyc,
} = require('../services/kycService');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

// POST /api/kyc/submit — CTV uploads KYC documents
router.post('/kyc/submit', authorize('ctv'), validate(schemas.kycSubmit), async (req, res) => {
  try {
    const { idNumber, idFrontImage, idBackImage, deviceId } = req.body;
    // V13.3: deviceId từ client, IP từ request
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket?.remoteAddress
      || req.ip
      || 'unknown';
    const result = await submitKyc(req.user.id, {
      idNumber,
      idFrontImage,
      idBackImage,
      deviceId: deviceId || req.headers['x-device-id'] || 'unknown',
      ipAddress,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/kyc/status — CTV checks own KYC status
router.get('/kyc/status', authorize('ctv'), async (req, res) => {
  try {
    const status = await getKycStatus(req.user.id);
    res.json(status);
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/kyc/pending — Admin lists pending KYC
router.get('/admin/kyc/pending', authorize('admin'), async (req, res) => {
  try {
    const list = await listPendingKyc();
    res.json(list);
  } catch (err) {
    console.error("[route]", err); res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/kyc/verify/:userId — Admin verifies or rejects
router.post('/admin/kyc/verify/:userId', authorize('admin'), validate(schemas.kycVerify), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { approved, reason } = req.body;
    const result = await verifyKyc(userId, { approved, reason });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
