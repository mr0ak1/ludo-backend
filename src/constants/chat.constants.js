// Predefined quick messages (still allowed alongside free text)
const CHAT_MESSAGES = [
  'Well Played!',
  'Oh no!',
  'I am winning 😎',
  'Play fast!',
  'Too slow!',
  'Loser!',
];

const CHAT_LIMITS = {
  MAX_MESSAGE_LENGTH: 200,
  MIN_MESSAGE_LENGTH: 1,
  /** Max messages per user per game within the window */
  RATE_LIMIT_MAX_MESSAGES: 5,
  RATE_LIMIT_WINDOW_MS: 10_000,
};

const CHAT_TYPE = {
  QUICK_MESSAGE: 'quick_message',
  TEXT_MESSAGE: 'text_message',
  SYSTEM_MESSAGE: 'system_message',
  ERROR_MESSAGE: 'error_message',
};

/** Basic profanity filter — substring match on word boundaries where possible */
const PROFANITY_WORDS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'damn',
  'slut',
  'whore',
  'nigger',
  'fag',
  'cunt',
  'chutiya',
  'madarchod',
  'behenchod',
  'bsdk',
  'lund',
  'randi',
];

const URL_SUBSTRINGS_BLOCKED = ['http://', 'https://', 'www.'];

module.exports = {
  CHAT_MESSAGES,
  CHAT_LIMITS,
  CHAT_TYPE,
  PROFANITY_WORDS,
  URL_SUBSTRINGS_BLOCKED,
};
