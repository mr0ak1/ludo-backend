const Joi = require('joi');
const { GAME_MODE_LIMITS, GAME_STATUS: GAME_STATUS_VALUES, GAME_TYPE } = require('../constants/game.constants');

/**
 * Game type enum
 */
const GAME_TYPES = {
  PRACTICE: GAME_TYPE.PRACTICE,
  CASH: GAME_TYPE.CASH,
};

/**
 * Game status enum
 */
const GAME_STATUS = {
  PENDING: GAME_STATUS_VALUES.PENDING,
  ACTIVE: GAME_STATUS_VALUES.ACTIVE,
  PAUSED: GAME_STATUS_VALUES.PAUSED,
  COMPLETED: GAME_STATUS_VALUES.COMPLETED,
  CANCELLED: GAME_STATUS_VALUES.CANCELLED,
  RECONNECTING: GAME_STATUS_VALUES.RECONNECTING,
  SURRENDERED: GAME_STATUS_VALUES.SURRENDERED,
};

/**
 * Validate create practice game request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateCreatePracticeGame = (data) => {
  const schema = Joi.object({
    maxPlayers: Joi.number()
      .integer()
      .min(2)
      .max(GAME_MODE_LIMITS.PRACTICE)
      .optional()
      .default(GAME_MODE_LIMITS.PRACTICE)
      .messages({
        'number.min': 'Minimum 2 players required',
        'number.max': `Maximum ${GAME_MODE_LIMITS.PRACTICE} players allowed`,
      }),
    preferredColor: Joi.string().valid('red', 'green', 'yellow', 'blue').optional().default('red'),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate create cash game request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateCreateCashGame = (data) => {
  const schema = Joi.object({
    entryFee: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.positive': 'Entry fee must be positive',
        'any.required': 'Entry fee is required',
      }),
    maxPlayers: Joi.number()
      .integer()
      .min(2)
      .max(GAME_MODE_LIMITS.CASH)
      .optional()
      .default(GAME_MODE_LIMITS.CASH)
      .messages({
        'number.min': 'Minimum 2 players required',
        'number.max': `Maximum ${GAME_MODE_LIMITS.CASH} players allowed`,
      }),
    preferredColor: Joi.string().valid('red', 'green', 'yellow', 'blue').optional().default('red'),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate join game request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateJoinGame = (data) => {
  const schema = Joi.object({
    gameId: Joi.string()
      .min(16)
      .max(24)
      .hex()
      .required()
      .messages({
        'string.min': 'Game ID must be a valid identifier',
        'string.max': 'Game ID must be a valid identifier',
        'any.required': 'Game ID is required',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate get game details request
 * @param {Object} data - Request params
 * @returns {Object} Validation result
 */
const validateGetGameDetails = (data) => {
  const schema = Joi.object({
    gameId: Joi.string()
      .min(16)
      .max(24)
      .hex()
      .required()
      .messages({
        'string.min': 'Game ID must be a valid identifier',
        'string.max': 'Game ID must be a valid identifier',
        'any.required': 'Game ID is required',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate roll dice request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateRollDice = (data) => {
  const schema = Joi.object({
    gameId: Joi.string()
      .min(16)
      .max(24)
      .hex()
      .required(),
    turnVersion: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'any.required': 'turnVersion is required for state synchronization',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate move token request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateMoveToken = (data) => {
  const schema = Joi.object({
    gameId: Joi.string()
      .min(16)
      .max(24)
      .hex()
      .required(),
    tokenIndex: Joi.number()
      .integer()
      .min(0)
      .max(3)
      .required(),
    turnVersion: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'any.required': 'turnVersion is required for state synchronization',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate skip turn request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateSkipTurn = (data) => {
  const schema = Joi.object({
    gameId: Joi.string()
      .min(16)
      .max(24)
      .hex()
      .required(),
    turnVersion: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'any.required': 'turnVersion is required for state synchronization',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate surrender game request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateSurrenderGame = (data) => {
  const schema = Joi.object({
    gameId: Joi.string()
      .min(16)
      .max(24)
      .hex()
      .required()
      .messages({
        'string.min': 'Game ID must be a valid identifier',
        'string.max': 'Game ID must be a valid identifier',
        'any.required': 'Game ID is required',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate end game request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateEndGame = (data) => {
  const schema = Joi.object({
    gameId: Joi.string()
      .min(16)
      .max(24)
      .hex()
      .required()
      .messages({
        'string.min': 'Game ID must be a valid identifier',
        'string.max': 'Game ID must be a valid identifier',
        'any.required': 'Game ID is required',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate reconnect request
 * @param {Object} data - Request body
 * @returns {Object} Validation result
 */
const validateReconnect = (data) => {
  const schema = Joi.object({
    gameId: Joi.string()
      .min(16)
      .max(24)
      .hex()
      .required()
      .messages({
        'string.min': 'Game ID must be a valid identifier',
        'string.max': 'Game ID must be a valid identifier',
        'any.required': 'Game ID is required',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate restore game state request
 * @param {Object} data - Request params
 * @returns {Object} Validation result
 */
const validateRestoreGameState = (data) => {
  const schema = Joi.object({
    gameId: Joi.string()
      .min(16)
      .max(24)
      .hex()
      .required()
      .messages({
        'string.min': 'Game ID must be a valid identifier',
        'string.max': 'Game ID must be a valid identifier',
        'any.required': 'Game ID is required',
      }),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate get game history request
 * @param {Object} data - Request query
 * @returns {Object} Validation result
 */
const validateGetGameHistory = (data) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(50).optional().default(20),
    status: Joi.string()
      .valid('completed', 'surrendered', 'all')
      .optional()
      .default('all'),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validate get waiting games request
 * @param {Object} data - Request query
 * @returns {Object} Validation result
 */
const validateGetWaitingGames = (data) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(50).optional().default(20),
    gameType: Joi.string()
      .valid('practice', 'cash', 'all')
      .optional()
      .default('all'),
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
  // Validation functions
  validateCreatePracticeGame,
  validateCreateCashGame,
  validateJoinGame,
  validateGetGameDetails,
  validateRollDice,
  validateMoveToken,
  validateSkipTurn,
  validateSurrenderGame,
  validateEndGame,
  validateReconnect,
  validateRestoreGameState,
  validateGetGameHistory,
  validateGetWaitingGames,
  formatValidationErrors,
  // Enums
  GAME_TYPES,
  GAME_STATUS,
};
