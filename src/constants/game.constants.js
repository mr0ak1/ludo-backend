// Game Board Configuration
const BOARD_POSITIONS = 52; // Total positions on the board
const HOME_POSITIONS = 6; // Positions in home stretch
const TOTAL_TOKENS_PER_PLAYER = 4;

// Safe Zones - Cannot be killed
const SAFE_ZONES = [1, 9, 14, 22, 27, 35, 40, 48];

// Home Entry Positions
const HOME_ENTRY_POSITION = 52;

// Dice Rules
const DICE_MIN = 1;
const DICE_MAX = 6;
const UNLOCK_DICE_VALUE = 6;

// Consecutive 6 Rules
const CONSECUTIVE_6_TURNS = 3;
const BONUS_TURN_ON_6 = true;
const CANCEL_TURN_ON_THIRD_6 = true;

// Game States
const GAME_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RECONNECTING: 'reconnecting',
};

// Game Types
const GAME_TYPE = {
  PRACTICE: 'practice',
  CASH: 'cash',
  TOURNAMENT: 'tournament',
};

// Token Colors
const TOKEN_COLORS = {
  RED: 'red',
  GREEN: 'green',
  YELLOW: 'yellow',
  BLUE: 'blue',
};

// Player Positions (Starting home zones)
const PLAYER_STARTING_ZONES = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Game Rules
const RULES = {
  MAX_PLAYERS: 2,
  MIN_PLAYERS: 2,
  TURN_TIMEOUT_MS: 20000, // 20 seconds
  MOVE_VALIDATION_STRICT: true,
  ALLOW_KILL_IN_SAFE_ZONE: false,
  REQUIRE_EXACT_DICE_FOR_HOME: true,
};

// Winner Detection
const WINNER_CONDITION = {
  ALL_TOKENS_HOME: 4,
  FIRST_TO_REACH_HOME: 1,
};

// Board Layout (internal structure)
const BOARD_LAYOUT = {
  MAIN_PATH: 52,
  HOME_STRETCH: 6,
  STARTING_POSITIONS: 4,
};

module.exports = {
  BOARD_POSITIONS,
  HOME_POSITIONS,
  TOTAL_TOKENS_PER_PLAYER,
  SAFE_ZONES,
  HOME_ENTRY_POSITION,
  DICE_MIN,
  DICE_MAX,
  UNLOCK_DICE_VALUE,
  CONSECUTIVE_6_TURNS,
  BONUS_TURN_ON_6,
  CANCEL_TURN_ON_THIRD_6,
  GAME_STATUS,
  GAME_TYPE,
  TOKEN_COLORS,
  PLAYER_STARTING_ZONES,
  RULES,
  WINNER_CONDITION,
  BOARD_LAYOUT,
};
