const Joi = require('joi');
const { BOT_LEVELS } = require('../constants/bot.constants');

/**
 * Validate create bot game request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateCreateBotGame = (data) => {
  const schema = Joi.object({
    difficulty: Joi.string()
      .valid(...BOT_LEVELS)
      .optional()
      .default('medium')
      .messages({
        'string.only': `Bot difficulty must be one of: ${BOT_LEVELS.join(', ')}`,
      }),
    entryFee: Joi.number()
      .integer()
      .min(0)
      .max(10000)
      .optional()
      .default(0)
      .messages({
        'number.min': 'Entry fee cannot be negative',
        'number.max': 'Entry fee cannot exceed 10000 coins',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Format validation errors into readable format
 * @param {Object} error - Joi validation error
 * @returns {Array} Array of error messages
 */
const formatValidationErrors = (error) => {
  if (!error.details) {
    return [{ message: 'Validation failed' }];
  }

  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
  }));
};

module.exports = {
  validateCreateBotGame,
  formatValidationErrors,
};
