/**
 * Socket Events Index
 * Central place to register all socket events
 */

module.exports = {
  // Client to Server Events
  CLIENT_TO_SERVER: {
    JOIN_GAME: 'join_game',
    ROLL_DICE: 'roll_dice',
    MOVE_TOKEN: 'move_token',
    SKIP_TURN: 'skip_turn',
    CHAT_MESSAGE: 'chat_message',
    LEAVE_GAME: 'leave_game',
    RECONNECT_GAME: 'reconnect_game',
  },

  // Server to Client Events
  SERVER_TO_CLIENT: {
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
  },
};
