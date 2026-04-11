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
    password: Joi.string().min(3).max(100).required(),
  }),

  reassignCtv: Joi.object({
    newParentId: Joi.number().integer().allow(null).required(),
  }),

  changeRank: Joi.object({
    newRank: Joi.string().valid('CTV', 'PP', 'TP', 'GDV', 'GDKD').required(),
    reason: Joi.string().max(500).optional(),
  }),

  updateCommission: Joi.object({
    selfSalePct: Joi.number().min(0).max(1).optional(),
    f1Pct: Joi.number().min(0).max(1).optional(),
    f2Pct: Joi.number().min(0).max(1).optional(),
    f3Pct: Joi.number().min(0).max(1).optional(),
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
};

module.exports = { validate, schemas };
