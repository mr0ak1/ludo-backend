// Bot Difficulty Levels
const BOT_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

// Bot Move Strategies - Priority Order
const BOT_STRATEGIES = {
  EASY: {
    // Random moves, basic logic
    RANDOM_MOVE: 0.8,
    AVOID_DANGER: 0.2,
  },
  MEDIUM: {
    // Balanced strategy
    KILL_OPPONENT: 0.3,
    PROTECT_OWN_TOKEN: 0.3,
    ADVANCE_HOME: 0.4,
  },
  HARD: {
    // Advanced strategy
    KILL_OPPONENT: 0.4,
    BLOCK_OPPONENT: 0.2,
    ADVANCE_HOME: 0.3,
    PROTECT_TOKEN: 0.1,
  },
};

// Bot Decision Making Rules
const BOT_RULES = {
  PRIORITIZE_KILL: true,
  PRIORITIZE_HOME_ENTRY: true,
  AVOID_DANGER_ZONES: true,
  CALCULATE_LOOKAHEAD_MOVES: true,
};

// Bot Thinking Time (milliseconds)
const BOT_THINKING_TIME = {
  EASY: 1000, // 1 second
  MEDIUM: 1500, // 1.5 seconds
  HARD: 2000, // 2 seconds
};

// Bot Move Analysis
const BOT_MOVE_ANALYSIS = {
  CONSIDER_FUTURE_MOVES: 3, // Look ahead 3 moves
  EVALUATE_RISK: true,
  CALCULATE_WINNING_PROBABILITY: true,
};

module.exports = {
  BOT_DIFFICULTY,
  BOT_STRATEGIES,
  BOT_RULES,
  BOT_THINKING_TIME,
  BOT_MOVE_ANALYSIS,
};
