const Joi = require('joi');

/**
 * Validate join queue request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateJoinQueue = (data) => {
  const schema = Joi.object({
    gameType: Joi.string()
      .valid('practice', 'cash', 'tournament')
      .optional()
      .default('cash')
      .messages({
        'string.only': 'Game type must be one of: practice, cash, tournament',
      }),
    betAmount: Joi.number()
      .integer()
      .min(0)
      .max(10000)
      .optional()
      .default(0)
      .messages({
        'number.min': 'Bet amount cannot be negative',
        'number.max': 'Bet amount cannot exceed 10000 coins',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate leave queue request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateLeaveQueue = (data) => {
  const schema = Joi.object({
    reason: Joi.string()
      .max(200)
      .optional()
      .messages({
        'string.max': 'Reason cannot exceed 200 characters',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate set bot difficulty request (admin only)
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateSetBotDifficulty = (data) => {
  const schema = Joi.object({
    difficulty: Joi.string()
      .valid('easy', 'medium', 'hard')
      .required()
      .messages({
        'any.required': 'Difficulty is required',
        'string.only': 'Difficulty must be one of: easy, medium, hard',
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
  validateJoinQueue,
  validateLeaveQueue,
  validateSetBotDifficulty,
  formatValidationErrors,
};
