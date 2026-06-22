/**
 * Cluster 8 — Notifications & Alerts (roadmap 8.2)
 * Primary types + legacy enum values for existing documents.
 */
const NOTIFICATION_TYPES = {
  MATCH_FOUND: 'match_found',
  GAME_STARTED: 'game_started',
  YOUR_TURN: 'your_turn',
  GAME_ENDED: 'game_ended',
  WALLET_UPDATE: 'wallet_update',
  ACHIEVEMENT: 'achievement',
  BONUS: 'bonus',
  SYSTEM_ALERT: 'system_alert',
  // Legacy / extended
  OPPONENT_JOINED: 'opponent_joined',
  WALLET_CREDITED: 'wallet_credited',
  DAILY_REWARD: 'daily_reward',
  TOURNAMENT_STARTED: 'tournament_started',
  GAME_INVITATION: 'game_invitation',
  SYSTEM_MESSAGE: 'system_message',
};

const NOTIFICATION_LIST_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
};

const TTL_DAYS = 30;

const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.MATCH_FOUND]: ({ opponentName } = {}) => ({
    title: 'Match found',
    body: opponentName
      ? `You are matched against ${opponentName}.`
      : 'An opponent has been matched. Your game is ready.',
  }),
  [NOTIFICATION_TYPES.GAME_STARTED]: () => ({
    title: 'Game started',
    body: 'Your Ludo match has started. Good luck!',
  }),
  [NOTIFICATION_TYPES.YOUR_TURN]: () => ({
    title: 'Your turn',
    body: 'It is your turn to roll or move.',
  }),
  [NOTIFICATION_TYPES.GAME_ENDED]: ({ isWinner } = {}) => {
    const won = isWinner === true || isWinner === 'true';
    return {
      title: won ? 'Victory' : 'Game ended',
      body: won ? 'Congratulations, you won the game.' : 'The game has finished. See results in the app.',
    };
  },
  [NOTIFICATION_TYPES.WALLET_UPDATE]: ({ direction, amount, reason } = {}) => {
    const r = reason ? ` (${reason})` : '';
    if (direction === 'credit') {
      return {
        title: 'Wallet update',
        body: `+${amount} coins${r}`,
      };
    }
    return {
      title: 'Wallet update',
      body: `-${amount} coins${r}`,
    };
  },
  [NOTIFICATION_TYPES.ACHIEVEMENT]: ({ title, body } = {}) => ({
    title: title || 'Achievement',
    body: body || 'You reached a new milestone.',
  }),
  [NOTIFICATION_TYPES.BONUS]: () => ({
    title: 'Bonus',
    body: 'You have a new reward or bonus available.',
  }),
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: ({ title, body } = {}) => ({
    title: title || 'System notice',
    body: body || 'There is an update for you.',
  }),
};

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_LIST_DEFAULTS,
  NOTIFICATION_TEMPLATES,
  TTL_DAYS,
};
