const { DICE_MIN, DICE_MAX } = require('../constants/game.constants');

/**
 * Roll a secure random dice value (1-6)
 * Using crypto for better randomness
 */
const rollDice = () => {
  const crypto = require('crypto');
  const randomBuffer = crypto.randomBytes(1);
  const randomValue = randomBuffer[0] % (DICE_MAX - DICE_MIN + 1) + DICE_MIN;
  return randomValue;
};

/**
 * Roll multiple dice
 */
const rollMultipleDice = (count = 1) => {
  return Array.from({ length: count }, () => rollDice());
};

/**
 * Validate dice value
 */
const isValidDiceValue = (value) => {
  return value >= DICE_MIN && value <= DICE_MAX && Number.isInteger(value);
};

module.exports = {
  rollDice,
  rollMultipleDice,
  isValidDiceValue,
};
