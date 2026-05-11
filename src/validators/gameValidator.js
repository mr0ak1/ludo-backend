const Joi = require('joi');

/**
 * Game type enum
 */
const GAME_TYPES = {
  PRACTICE: 'practice',
  CASH: 'cash',
};

/**
 * Game status enum
 */
const GAME_STATUS = {
  WAITING: 'waiting',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  SURRENDERED: 'surrendered',
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
      .max(4)
      .optional()
      .default(4)
      .messages({
        'number.min': 'Minimum 2 players required',
        'number.max': 'Maximum 4 players allowed',
      }),
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
      .max(4)
      .optional()
      .default(4)
      .messages({
        'number.min': 'Minimum 2 players required',
        'number.max': 'Maximum 4 players allowed',
      }),
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
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'Game ID must be a valid MongoDB ObjectId',
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
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'Game ID must be a valid MongoDB ObjectId',
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
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'Game ID must be a valid MongoDB ObjectId',
        'any.required': 'Game ID is required',
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
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'Game ID must be a valid MongoDB ObjectId',
        'any.required': 'Game ID is required',
      }),
    tokenIndex: Joi.number()
      .integer()
      .min(0)
      .max(3)
      .required()
      .messages({
        'number.min': 'Token index must be 0-3',
        'number.max': 'Token index must be 0-3',
        'any.required': 'Token index is required',
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
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'Game ID must be a valid MongoDB ObjectId',
        'any.required': 'Game ID is required',
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
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'Game ID must be a valid MongoDB ObjectId',
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
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'Game ID must be a valid MongoDB ObjectId',
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
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'Game ID must be a valid MongoDB ObjectId',
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
      .length(24)
      .hex()
      .required()
      .messages({
        'string.length': 'Game ID must be a valid MongoDB ObjectId',
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
