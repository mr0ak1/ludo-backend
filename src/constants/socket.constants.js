// Socket Event Names - Client to Server
const SOCKET_EVENTS_CLIENT_TO_SERVER = {
  JOIN_GAME: 'join_game',
  ROLL_DICE: 'roll_dice',
  MOVE_TOKEN: 'move_token',
  SKIP_TURN: 'skip_turn',
  CHAT_MESSAGE: 'chat_message',
  LEAVE_GAME: 'leave_game',
  RECONNECT_GAME: 'reconnect_game',
  MATCHMAKING_JOIN: 'matchmaking_join',
  MATCHMAKING_LEAVE: 'matchmaking_leave',
};

// Socket Event Names - Server to Client
const SOCKET_EVENTS_SERVER_TO_CLIENT = {
  GAME_JOINED: 'game_joined',
  DICE_ROLLED: 'dice_rolled',
  TOKEN_MOVED: 'token_moved',
  TURN_CHANGED: 'turn_changed',
  CHAT_RECEIVED: 'chat_received',
  GAME_ENDED: 'game_ended',
  PLAYER_DISCONNECTED: 'player_disconnected',
  PLAYER_RECONNECTED: 'player_reconnected',
  MATCH_FOUND: 'match_found',
  WALLET_UPDATED: 'wallet_updated',
  ERROR_EVENT: 'error_event',
  GAME_STATE_SYNC: 'game_state_sync',
};

// Socket Namespaces
const SOCKET_NAMESPACES = {
  GAME: '/game',
  CHAT: '/chat',
  BOT: '/bot',
  MATCHMAKING: '/matchmaking',
};

// Socket Timeout Values (milliseconds)
const SOCKET_TIMEOUTS = {
  RECONNECT_TIMEOUT: 30000, // 30 seconds
  MOVE_TIMEOUT: 20000, // 20 seconds
  RESPONSE_TIMEOUT: 10000, // 10 seconds
};

// Socket Error Messages
const SOCKET_ERRORS = {
  INVALID_GAME_ID: 'Invalid game ID',
  GAME_NOT_FOUND: 'Game not found',
  NOT_YOUR_TURN: 'It is not your turn',
  INVALID_MOVE: 'Invalid move',
  GAME_ALREADY_ENDED: 'Game has already ended',
  PLAYER_NOT_FOUND: 'Player not found',
  AUTHENTICATION_FAILED: 'Authentication failed',
};

module.exports = {
  SOCKET_EVENTS_CLIENT_TO_SERVER,
  SOCKET_EVENTS_SERVER_TO_CLIENT,
  SOCKET_NAMESPACES,
  SOCKET_TIMEOUTS,
  SOCKET_ERRORS,
};
