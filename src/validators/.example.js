/**
 * Validator Stubs
 * Request validation schemas using Joi
 */

const joi = require('joi');

// TODO: Create validation schemas for each endpoint
// Example structure:

const authValidators = {
  verifyFirebaseToken: joi.object({
    firebaseToken: joi.string().required(),
  }),

  updateProfile: joi.object({
    name: joi.string().optional(),
    email: joi.string().email().optional(),
  }),
};

const walletValidators = {
  addCoins: joi.object({
    userId: joi.string().required(),
    amount: joi.number().positive().required(),
    reason: joi.string().required(),
  }),

  deductCoins: joi.object({
    userId: joi.string().required(),
    amount: joi.number().positive().required(),
    reason: joi.string().required(),
  }),
};

const gameValidators = {
  createGame: joi.object({
    gameType: joi.string().valid('practice', 'cash').required(),
    betAmount: joi.number().optional(),
  }),

  rollDice: joi.object({
    gameId: joi.string().required(),
  }),

  moveToken: joi.object({
    gameId: joi.string().required(),
    tokenId: joi.string().required(),
    steps: joi.number().required(),
  }),
};

module.exports = {
  authValidators,
  walletValidators,
  gameValidators,
};
