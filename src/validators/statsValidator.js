const Joi = require('joi');
const {
  MATCH_HISTORY_MAX_LIMIT,
} = require('../constants/stats.constants');

const mongoId = Joi.string().hex().length(24).required().messages({
  'string.length': 'Invalid id format',
  'any.required': 'Id is required',
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
