/**
 * Bot Chat Service
 * Handles bot sending quick chat messages in quick/random games
 */

const { CHAT_MESSAGES, CHAT_TYPE } = require('../constants/chat.constants');
const gameEvents = require('../utils/gameEvents');
const logger = require('../utils/logger');

class BotChatService {
  /**
   * Send random quick message from bot in cash/tournament games
   * @param {Object} game - Game object
   * @param {Number} botPlayerIndex - Bot player index
   * @param {Object} io - Socket.io instance for broadcasting
   */
  async sendBotQuickMessage(game, botPlayerIndex, io) {
    try {
      const botPlayer = game.players[botPlayerIndex];
      if (!botPlayer || !botPlayer.isBot) {
        return;
      }

      // Only send messages in quick games (cash/tournament), not practice
      if (game.gameType === 'practice') {
        return;
      }

      // Random delay between 2-5 seconds to simulate thinking
      const delay = Math.random() * 3000 + 2000;
      
      setTimeout(() => {
        // Only send if game is still ongoing
        if (game.status !== 'ongoing' && game.status !== 'active') {
          return;
        }

        // Select random message from predefined list
        const message = this._getRandomMessage();
        
        // Emit chat event via gameEvents
        gameEvents.emit('CHAT_SENT', {
          gameId: game._id,
          playerId: botPlayer.userId,
          playerName: botPlayer.playerName,
          message,
          messageType: CHAT_TYPE.QUICK_MESSAGE,
          isBot: true,
          timestamp: new Date(),
        });

        logger.info(`Bot ${botPlayer.playerName} sent message: "${message}" in game ${game._id}`);
      }, delay);
    } catch (error) {
      logger.error('Error in botChatService.sendBotQuickMessage:', error);
    }
  }

  /**
   * Send bot response to winning/losing
   * @param {Object} game - Game object
   * @param {Number} botPlayerIndex - Bot player index
   * @param {String} context - 'win' or 'lose'
   */
  async sendBotReactionMessage(game, botPlayerIndex, context) {
    try {
      const botPlayer = game.players[botPlayerIndex];
      if (!botPlayer || !botPlayer.isBot) {
        return;
      }

      if (game.gameType === 'practice') {
        return;
      }

      const reactionMessages = {
        win: ['I am winning 😎', 'Too easy!', 'Well Played!'],
        lose: ['Oh no!', 'Play fast!', 'Next time!'],
      };

      const messages = reactionMessages[context] || ['Well Played!'];
      const message = messages[Math.floor(Math.random() * messages.length)];

      gameEvents.emit('CHAT_SENT', {
        gameId: game._id,
        playerId: botPlayer.userId,
        playerName: botPlayer.playerName,
        message,
        messageType: CHAT_TYPE.QUICK_MESSAGE,
        isBot: true,
        timestamp: new Date(),
      });

      logger.info(`Bot ${botPlayer.playerName} sent reaction: "${message}" in game ${game._id}`);
    } catch (error) {
      logger.error('Error in botChatService.sendBotReactionMessage:', error);
    }
  }

  /**
   * Get random predefined message
   * @private
   */
  _getRandomMessage() {
    return CHAT_MESSAGES[Math.floor(Math.random() * CHAT_MESSAGES.length)];
  }
}

module.exports = new BotChatService();
