// Predefined Chat Messages - NO CUSTOM MESSAGES (prevents abuse)
const CHAT_MESSAGES = [
  'Well Played!',
  'Oh no!',
  'I am winning 😎',
  'Play fast!',
  'Too slow!',
  'Loser!',
];

// Chat Limits
const CHAT_LIMITS = {
  MAX_MESSAGE_LENGTH: 100,
  MIN_MESSAGE_LENGTH: 1,
  RATE_LIMIT_PER_SECOND: 1, // 1 message per 2 seconds
  RATE_LIMIT_WINDOW_MS: 2000,
};

// Chat Types
const CHAT_TYPE = {
  QUICK_MESSAGE: 'quick_message',
  SYSTEM_MESSAGE: 'system_message',
  ERROR_MESSAGE: 'error_message',
};

module.exports = {
  CHAT_MESSAGES,
  CHAT_LIMITS,
  CHAT_TYPE,
};
