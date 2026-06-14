const Joi = require('joi');
const {
  MATCH_HISTORY_MAX_LIMIT,
} = require('../constants/stats.constants');

const mongoId = Joi.alternatives().try(
  Joi.number().integer().min(1),
  Joi.string().hex().length(16),
  Joi.string().hex().length(24)
).required().messages({
  'any.required': 'Id is required',
  'any.unknown': 'Invalid id format',
});

const validateMatchHistoryQuery = (query) =>
  Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(MATCH_HISTORY_MAX_LIMIT)
      .optional(),
    gameType: Joi.string().valid('practice', 'cash', 'tournament').optional(),
  }).validate(query, { abortEarly: false, stripUnknown: true });

const validatePlayerParams = (params) =>
  Joi.object({
    userId: mongoId,
  }).validate({ userId: params.userId }, { abortEarly: false, stripUnknown: true });

const formatValidationErrors = (error) =>
  error.details.map((d) => ({
    field: d.path.join('.'),
    message: d.message,
  }));

module.exports = {
  validateMatchHistoryQuery,
  validatePlayerParams,
  formatValidationErrors,
};
