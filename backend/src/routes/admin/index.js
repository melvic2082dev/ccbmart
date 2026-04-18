const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const dashboardRouter = require('./dashboard');
const ctvRouter = require('./ctv');
const commissionRouter = require('./commission');
const promotionRouter = require('./promotion');
const teamRouter = require('./team');
const feesRouter = require('./fees');
const syncRouter = require('./sync');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.use('/', dashboardRouter);
router.use('/', ctvRouter);
router.use('/', commissionRouter);
router.use('/', promotionRouter);
router.use('/', teamRouter);
router.use('/', feesRouter);
router.use('/', syncRouter);

module.exports = router;
