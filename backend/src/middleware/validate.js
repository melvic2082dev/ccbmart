const Joi = require('joi');

/**
 * Create a validation middleware from a Joi schema
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });

    if (error) {
      const details = error.details.map(d => d.message);
      return res.status(400).json({ error: 'Validation failed', details });
    }

    // Replace with validated values
    if (source === 'body') req.body = value;
    else if (source === 'query') req.query = value;
    else req.params = value;

    next();
  };
}

// Validation schemas
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(100).required(),
  }),

  reassignCtv: Joi.object({
    newParentId: Joi.number().integer().allow(null).required(),
    reason: Joi.string().max(500).optional(),
  }),

  changeRank: Joi.object({
    newRank: Joi.string().valid('CTV', 'PP', 'TP', 'GDV', 'GDKD').required(),
    reason: Joi.string().max(500).optional(),
    // v3.4: optionally apply salary config in the same call so admin can
    // "đề bạt trước, lương sau" without a follow-up request.
    fixedSalaryEnabled: Joi.boolean().optional(),
    fixedSalaryStartDate: Joi.string().isoDate().allow(null, '').optional(),
  }),

  salaryConfig: Joi.object({
    fixedSalaryEnabled: Joi.boolean().required(),
    fixedSalaryStartDate: Joi.string().isoDate().allow(null, '').optional(),
    reason: Joi.string().max(500).optional(),
  }),

  updateCommission: Joi.object({
    selfSalePct: Joi.number().min(0).max(1).optional(),
    directPct: Joi.number().min(0).max(1).optional(),
    indirect2Pct: Joi.number().min(0).max(1).optional(),
    indirect3Pct: Joi.number().min(0).max(1).optional(),
    fixedSalary: Joi.number().min(0).optional(),
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  reportQuery: Joi.object({
    period: Joi.string().valid('monthly', 'quarterly').default('monthly'),
    months: Joi.number().integer().min(1).max(24).default(6),
    format: Joi.string().valid('json', 'excel', 'pdf').default('json'),
  }),

  syncRequest: Joi.object({
    dateRange: Joi.string().valid('last-7-days', 'last-30-days', 'last-90-days').default('last-7-days'),
  }),

  webhookOrder: Joi.object({
    id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    customerId: Joi.number().integer().optional(),
    agencyId: Joi.number().integer().optional(),
    ctvId: Joi.number().integer().optional(),
    channel: Joi.string().valid('ctv', 'agency', 'showroom').optional(),
    totalAmount: Joi.number().min(0).required(),
    cogsAmount: Joi.number().min(0).optional(),
    paymentMethod: Joi.string().optional(),
  }),

  memberRegister: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(100).pattern(/^(?=.*[A-Z])(?=.*\d).+$/).required()
      .messages({ 'string.pattern.base': 'Password must contain at least 1 uppercase letter and 1 number' }),
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().min(9).max(15).required(),
    depositAmount: Joi.number().min(0).default(0),
    referralCode: Joi.string().pattern(/^CCB_[A-Z0-9]{6}$/).optional(),
  }),

  createCtv: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(100).required(),
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().min(9).max(15).required(),
    parentId: Joi.number().integer().allow(null).optional(),
    rank: Joi.string().valid('CTV', 'PP', 'TP', 'GDV', 'GDKD').default('CTV').optional(),
  }),

  memberDeposit: Joi.object({
    amount: Joi.number().min(10000).required(),
    method: Joi.string().valid('bank_transfer', 'cash').default('bank_transfer'),
  }),

  // Phase 3: Security hardening — new validation schemas

  confirmNotes: Joi.object({
    notes: Joi.string().max(500).allow('').optional(),
  }),

  rejectReason: Joi.object({
    reason: Joi.string().min(1).max(500).required(),
  }),

  reconciliationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    paymentMethod: Joi.string().optional(),
    status: Joi.string().valid('PENDING', 'CONFIRMED', 'REJECTED').optional(),
    channel: Joi.string().valid('ctv', 'agency', 'showroom').optional(),
  }),

  businessHouseholdRenew: Joi.object({
    kind: Joi.string().valid('dealer', 'training').required(),
    termMonths: Joi.number().integer().min(1).max(60).default(12),
  }),

  businessHouseholdUpdateBank: Joi.object({
    bankName: Joi.string().max(100).required(),
    bankAccountNo: Joi.string().max(50).required(),
    bankAccountHolder: Joi.string().max(100).required(),
  }),

  businessHouseholdAction: Joi.object({
    userId: Joi.number().integer().required(),
    action: Joi.string().valid('create', 'suspend', 'terminate', 'activate').required(),
    businessName: Joi.string().max(200).optional(),
    taxCode: Joi.string().max(20).optional(),
    businessLicense: Joi.string().max(100).optional(),
  }),

  trainingLogQuery: Joi.object({
    status: Joi.string().valid('PENDING', 'VERIFIED', 'REJECTED').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),

  trainingLogVerify: Joi.object({
    action: Joi.string().valid('verify', 'reject').required(),
  }),

  trainingLogCreate: Joi.object({
    traineeId: Joi.number().integer().required(),
    sessionDate: Joi.string().isoDate().required(),
    durationMinutes: Joi.number().integer().min(1).max(480).required(),
    content: Joi.string().min(5).max(2000).required(),
  }),

  trainingLogConfirm: Joi.object({
    otp: Joi.string().length(6).optional(),
  }),

  feeConfigUpdate: Joi.object({
    minCombo: Joi.number().min(0).optional(),
    maxCombo: Joi.number().allow(null).min(0).optional(),
    feeAmount: Joi.number().min(0).optional(),
    description: Joi.string().max(200).optional(),
    isActive: Joi.boolean().optional(),
  }),

  kycSubmit: Joi.object({
    idNumber: Joi.string().min(9).max(12).required(),
    idFrontImage: Joi.string().required(),
    idBackImage: Joi.string().required(),
    deviceId: Joi.string().max(100).optional(),
  }),

  kycVerify: Joi.object({
    approved: Joi.boolean().required(),
    reason: Joi.string().max(500).optional(),
  }),

  taxQuery: Joi.object({
    month: Joi.string().pattern(/^\d{4}-\d{2}$/).optional(),
    status: Joi.string().valid('PENDING', 'PAID').optional(),
  }),

  taxProcess: Joi.object({
    month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  }),

  memberRedeemCode: Joi.object({
    code: Joi.string().min(1).max(50).required(),
  }),

  invoicesQuery: Joi.object({
    status: Joi.string().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),

  invoiceProcessMonthly: Joi.object({
    month: Joi.number().integer().min(1).max(12).optional(),
    year: Joi.number().integer().min(2020).max(2100).optional(),
  }),

  monthlyReportQuery: Joi.object({
    month: Joi.string().pattern(/^\d{4}-\d{2}$/).optional(),
  }),

  contractTerminate: Joi.object({
    reason: Joi.string().max(500).optional(),
  }),

  awardTitle: Joi.object({
    userId: Joi.number().integer().required(),
    title: Joi.string().valid('EXPERT_LEADER', 'SENIOR_EXPERT', 'STRATEGIC_ADVISOR').required(),
  }),

  adminSync: Joi.object({
    dateRange: Joi.string().valid('last-7-days', 'last-30-days', 'last-90-days').optional(),
  }),

  monthQuery: Joi.object({
    month: Joi.string().pattern(/^\d{4}-\d{2}$/).optional(),
  }),
};

module.exports = { validate, schemas };
