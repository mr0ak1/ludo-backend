const gameEvents = require('./gameEvents');
const {
  SOCKET_EVENTS_SERVER_TO_CLIENT: SERVER_EVENTS,
} = require('../constants/socket.constants');
const notificationService = require('../services/notificationService');
const userRepository = require('../repositories/userRepository');
const logger = require('./logger');

let registered = false;

function toIdString(ref) {
  if (ref == null) return null;
  if (typeof ref === 'string') return ref;
  if (ref._id) return ref._id.toString();
  return ref.toString();
}

/**
 * Subscribe to game domain events and raise in-app + push notifications (Cluster 8).
 * Idempotent.
 */
function registerNotificationGameListeners() {
  if (registered) {
    return;
  }
  registered = true;

  gameEvents.on(SERVER_EVENTS.TURN_CHANGED, async (payload) => {
    try {
      const { gameId, currentTurn, game } = payload;
      if (!game?.players?.length || currentTurn == null) return;

      const next = game.players[currentTurn];
      if (!next) return;

      const nextUserId = toIdString(next.userId);
      if (!nextUserId) return;

      const user = await userRepository.findById(nextUserId);
      if (!user || user.isBot) return;

      await notificationService.notifyYourTurn(nextUserId, { gameId });
    } catch (e) {
      logger.error('Notification listener TURN_CHANGED:', e.message);
    }
  });

  gameEvents.on(SERVER_EVENTS.GAME_ENDED, async (payload) => {
    try {
      const { gameId, results, game } = payload;
      if (!game?.players?.length) return;

      const winnerId = results?.winner ? toIdString(results.winner) : null;
      const surrenderedBy = results?.surrenderedBy ? toIdString(results.surrenderedBy) : null;

      for (const p of game.players) {
        const uid = toIdString(p.userId);
        if (!uid) continue;
        const user = await userRepository.findById(uid);
        if (!user || user.isBot) continue;

        let isWinner = !!(winnerId && uid === winnerId);
        if (!isWinner && surrenderedBy) {
          isWinner = uid !== surrenderedBy;
        }

        await notificationService.notifyGameEnded(uid, { gameId, isWinner });
      }
    } catch (e) {
      logger.error('Notification listener GAME_ENDED:', e.message);
    }
  });
}

module.exports = { registerNotificationGameListeners };
