const Joi = require('joi');

// Coin amount validation - must be positive integer
const coinAmountSchema = Joi.number()
  .integer()
  .positive()
  .required()
  .messages({
    'number.positive': 'Amount must be positive',
    'number.integer': 'Amount must be an integer',
    'any.required': 'Amount is required',
  });

// Optional coin amount (allows zero)
const optionalCoinAmountSchema = Joi.number()
  .integer()
  .positive()
  .optional()
  .messages({
    'number.positive': 'Amount must be positive',
    'number.integer': 'Amount must be an integer',
  });

// Reason text validation
const reasonSchema = Joi.string()
  .trim()
  .min(5)
  .max(500)
  .required()
  .messages({
    'string.min': 'Reason must be at least 5 characters',
    'string.max': 'Reason must not exceed 500 characters',
    'any.required': 'Reason is required',
  });

// Transaction type enum
const TRANSACTION_TYPES = [
  'game_entry',
  'game_reward',
  'game_refund',
  'admin_add',
  'admin_deduct',
  'sign_up_bonus',
  'referral_bonus',
  'daily_bonus',
  'withdrawal',
  'deposit',
];

const transactionTypeSchema = Joi.string()
  .valid(...TRANSACTION_TYPES)
  .optional()
  .messages({
    'any.only': `Transaction type must be one of: ${TRANSACTION_TYPES.join(', ')}`,
  });

/**
 * Validate get wallet request
 * @param {Object} data - Request data
 * @returns {Object} Validation result
 */
const validateGetWallet = (data) => {
  const schema = Joi.object({});
  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate get transaction history request
 * @param {Object} data - Request query parameters
 * @returns {Object} Validation result
 */
const validateGetTransactionHistory = (data) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    type: transactionTypeSchema,
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    minAmount: optionalCoinAmountSchema,
    maxAmount: optionalCoinAmountSchema,
  }).messages({
    'date.base': 'Date must be valid',
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate add coins request (admin only)
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateAddCoins = (data) => {
  const schema = Joi.object({
    userId: Joi.string()
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'User ID must be a valid MongoDB ObjectId',
        'any.required': 'User ID is required',
      }),
    amount: coinAmountSchema,
    reason: reasonSchema,
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate deduct coins request (admin only)
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateDeductCoins = (data) => {
  const schema = Joi.object({
    userId: Joi.string()
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'User ID must be a valid MongoDB ObjectId',
        'any.required': 'User ID is required',
      }),
    amount: coinAmountSchema,
    reason: reasonSchema,
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate freeze wallet request (admin only)
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateFreezeWallet = (data) => {
  const schema = Joi.object({
    userId: Joi.string()
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'User ID must be a valid MongoDB ObjectId',
        'any.required': 'User ID is required',
      }),
    reason: reasonSchema,
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate unfreeze wallet request (admin only)
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateUnfreezeWallet = (data) => {
  const schema = Joi.object({
    userId: Joi.string()
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'User ID must be a valid MongoDB ObjectId',
        'any.required': 'User ID is required',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Format validation errors
 * @param {Object} error - Joi validation error
 * @returns {Object} Formatted errors
 */
const formatValidationErrors = (error) => {
  const errors = {};
  if (error.details) {
    error.details.forEach(detail => {
      const field = detail.path.join('.');
      errors[field] = detail.message;
    });
  }
  return errors;
};

module.exports = {
  validateGetWallet,
  validateGetTransactionHistory,
  validateAddCoins,
  validateDeductCoins,
  validateFreezeWallet,
  validateUnfreezeWallet,
  formatValidationErrors,
  // Exports schemas for reuse
  coinAmountSchema,
  optionalCoinAmountSchema,
  reasonSchema,
  transactionTypeSchema,
  TRANSACTION_TYPES,
};
