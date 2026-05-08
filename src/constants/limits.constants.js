// Rate Limiting
const RATE_LIMITS = {
  GLOBAL: {
    WINDOW_MS: 900000, // 15 minutes
    MAX_REQUESTS: 100,
  },
  API: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 30,
  },
  CHAT: {
    WINDOW_MS: 2000, // 2 seconds
    MAX_MESSAGES: 1,
  },
  AUTH: {
    WINDOW_MS: 900000, // 15 minutes
    MAX_ATTEMPTS: 5,
  },
};

// Queue Timeouts
const QUEUE_TIMEOUTS = {
  MATCHMAKING_TIMEOUT_MS: 10000, // 10 seconds
  BOT_FALLBACK_TIMEOUT_MS: 10000, // 10 seconds
  PLAYER_SEARCH_TIMEOUT_MS: 30000, // 30 seconds
};

// Game Timeouts
const GAME_TIMEOUTS = {
  TURN_TIMEOUT_MS: 20000, // 20 seconds
  GAME_INACTIVE_TIMEOUT_MS: 300000, // 5 minutes
  DISCONNECT_TIMEOUT_MS: 30000, // 30 seconds
  RECONNECT_GRACE_PERIOD_MS: 30000, // 30 seconds
};

// Transaction Limits
const TRANSACTION_LIMITS = {
  MIN_BET_AMOUNT: 50,
  MAX_BET_AMOUNT: 10000,
  MIN_TRANSACTION: 1,
  MAX_TRANSACTION: 100000,
  DAILY_TRANSACTION_LIMIT: 1000000, // 1 million
};

// Wallet Limits
const WALLET_LIMITS = {
  MIN_BALANCE: 0,
  MAX_BALANCE: 1000000, // 1 million coins
  LOCK_DURATION_MS: 5000, // 5 seconds for transaction locking
};

// Session Timeouts
const SESSION_TIMEOUTS = {
  JWT_EXPIRY: '7d',
  REFRESH_TOKEN_EXPIRY: '30d',
  SESSION_TIMEOUT_MS: 86400000, // 24 hours
};

// Connection Limits
const CONNECTION_LIMITS = {
  MAX_CONCURRENT_GAMES: 1,
  MAX_CONCURRENT_ROOMS: 5,
  MAX_RECONNECT_ATTEMPTS: 5,
};

module.exports = {
  RATE_LIMITS,
  QUEUE_TIMEOUTS,
  GAME_TIMEOUTS,
  TRANSACTION_LIMITS,
  WALLET_LIMITS,
  SESSION_TIMEOUTS,
  CONNECTION_LIMITS,
};
