// Complete Ludo Rules Engine Constants
const LUDO_RULES = {
  // Token Unlock Rule
  TOKEN_UNLOCK: {
    REQUIRES_DICE_VALUE: 6,
    DESCRIPTION: 'Token can only leave home when dice value is 6',
  },

  // Consecutive 6 Rule
  CONSECUTIVE_6: {
    FIRST_6_BONUS_TURN: true,
    SECOND_6_BONUS_TURN: true,
    THIRD_6_CANCEL_TURN: true,
    DESCRIPTION: '1st and 2nd 6 gives extra turn; 3rd cancels entire turn',
  },

  // Kill Rule
  KILL: {
    ENABLED: true,
    SEND_TOKEN_HOME: true,
    KILLER_BONUS_TURN: true,
    CANNOT_KILL_IN_SAFE_ZONE: true,
    DESCRIPTION: 'Landing on opponent token sends it home + bonus turn',
  },

  // Safe Zones
  SAFE_ZONES: {
    POSITIONS: [1, 9, 14, 22, 27, 35, 40, 48],
    CANNOT_BE_KILLED: true,
    DESCRIPTION: 'Cannot be killed at safe zones',
  },

  // Home Entry Rule
  HOME_ENTRY: {
    REQUIRES_EXACT_DICE: true,
    DESCRIPTION: 'Exact dice value required to enter home',
  },

  // Winner Detection
  WINNER: {
    ALL_TOKENS_HOME: 4,
    DESCRIPTION: 'Player wins when all 4 tokens reach home',
  },

  // Turn Timeout
  TURN_TIMEOUT: {
    ENABLED: true,
    TIMEOUT_SECONDS: 20,
    AUTO_SKIP_TURN: true,
    DESCRIPTION: 'Auto skip turn if inactive for 20 seconds',
  },
};

// Game Phase Rules
const GAME_PHASES = {
  INITIALIZATION: 'initialization',
  PLAYER_1_TURN: 'player_1_turn',
  PLAYER_2_TURN: 'player_2_turn',
  GAME_COMPLETION: 'game_completion',
};

// Move Validation Rules
const MOVE_VALIDATION = {
  CHECK_TURN: true,
  CHECK_VALID_TOKEN: true,
  CHECK_SAFE_ZONE: true,
  CHECK_DICE_VALUE: true,
  CHECK_WINNER_LOGIC: true,
  CHECK_KILL_LOGIC: true,
  CHECK_HOME_ENTRY: true,
};

module.exports = {
  LUDO_RULES,
  GAME_PHASES,
  MOVE_VALIDATION,
};
