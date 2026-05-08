const {
  BOARD_POSITIONS,
  HOME_POSITIONS,
  SAFE_ZONES,
  HOME_ENTRY_POSITION,
  PLAYER_STARTING_ZONES,
} = require('../constants/game.constants');

/**
 * Calculate new token position after moving
 */
const calculateNewPosition = (currentPosition, diceValue) => {
  if (currentPosition === -1) {
    // Token is at home
    return -1;
  }

  if (currentPosition === 0) {
    // Token is in starting zone
    return diceValue - 1; // Position 0-5 on board
  }

  let newPosition = currentPosition + diceValue;

  if (newPosition > BOARD_POSITIONS + HOME_POSITIONS - 1) {
    // Beyond home
    return -1;
  }

  return newPosition;
};

/**
 * Check if position is a safe zone
 */
const isSafeZone = (position) => {
  return SAFE_ZONES.includes(position);
};

/**
 * Check if token is in home
 */
const isInHome = (position) => {
  return position === -1;
};

/**
 * Check if token is in home stretch
 */
const isInHomeStretch = (position) => {
  return position >= BOARD_POSITIONS && position <= BOARD_POSITIONS + HOME_POSITIONS - 1;
};

/**
 * Calculate distance from current position to home
 */
const getDistanceToHome = (currentPosition) => {
  if (currentPosition === -1) return 0; // Already home
  if (currentPosition === 0) return BOARD_POSITIONS + HOME_POSITIONS; // Starting zone
  return BOARD_POSITIONS + HOME_POSITIONS - currentPosition;
};

/**
 * Check if token can enter home with dice value
 */
const canEnterHome = (currentPosition, diceValue) => {
  if (currentPosition === -1) return false; // Already home

  const newPosition = calculateNewPosition(currentPosition, diceValue);
  const maxHomePosition = BOARD_POSITIONS + HOME_POSITIONS - 1;

  return newPosition === maxHomePosition || newPosition === -1;
};

/**
 * Get player starting zone position
 */
const getPlayerStartingZone = (playerColor) => {
  return PLAYER_STARTING_ZONES[playerColor.toLowerCase()] || 0;
};

module.exports = {
  calculateNewPosition,
  isSafeZone,
  isInHome,
  isInHomeStretch,
  getDistanceToHome,
  canEnterHome,
  getPlayerStartingZone,
};
