// Default Wallet Configuration
const DEFAULT_COINS = 500; // Default coins for new user

// Transaction Types
const TRANSACTION_TYPE = {
  DEBIT: 'debit',
  CREDIT: 'credit',
  REWARD: 'reward',
  REFUND: 'refund',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
};

// Transaction Reasons
const TRANSACTION_REASON = {
  GAME_BET: 'game_bet',
  GAME_WIN: 'game_win',
  GAME_LOSS: 'game_loss',
  DAILY_REWARD: 'daily_reward',
  REFERRAL_BONUS: 'referral_bonus',
  ADMIN_CREDIT: 'admin_credit',
  ADMIN_DEBIT: 'admin_debit',
  REFUND: 'refund',
  SIGNUP_BONUS: 'signup_bonus',
};

// Wallet States
const WALLET_STATUS = {
  ACTIVE: 'active',
  LOCKED: 'locked',
  FROZEN: 'frozen',
};

// Bet Amounts (Allowed bet values)
const ALLOWED_BET_AMOUNTS = [50, 100, 200, 500, 1000];

// Minimum Requirements
const WALLET_LIMITS = {
  MIN_BET: 50,
  MAX_BET: 10000,
  MIN_WITHDRAWAL: 100,
  MAX_WITHDRAWAL: 100000,
  MIN_BALANCE: 0,
};

module.exports = {
  DEFAULT_COINS,
  TRANSACTION_TYPE,
  TRANSACTION_REASON,
  WALLET_STATUS,
  ALLOWED_BET_AMOUNTS,
  WALLET_LIMITS,
};
