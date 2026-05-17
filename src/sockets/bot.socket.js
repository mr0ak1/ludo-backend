/**
 * Bot Socket Events Handler
 * Handles bot-related real-time events (bot moves, bot messages)
 */

const gameRepository = require('../repositories/gameRepository');
const botService = require('../services/botService');
const botChatService = require('../services/botChatService');
const gameEvents = require('../utils/gameEvents');
const logger = require('../utils/logger');
const { SOCKET_ERRORS } = require('../constants/socket.constants');

const botSocket = (socket, io) => {
  /**
   * Handle bot auto-join to cash/tournament games
   * Bot joins automatically and sends occasional chat messages
   */
  socket.on('bot_auto_join', async (data) => {
    try {
      const { gameId } = data;

      const game = await gameRepository.findById(gameId);
      if (!game) {
        socket.emit('bot_error', {
          message: SOCKET_ERRORS.INVALID_GAME_ID,
        });
        return;
      }

      // Find bot player in game
      const botPlayer = game.players?.find((p) => p.isBot);
      if (!botPlayer) {
        return;
      }

      // Join socket room for game
      socket.join(`game:${gameId}`);

      // Emit match found event
      io.to(`game:${gameId}`).emit('match_found', {
        gameId,
        botName: botPlayer.playerName,
        botDifficulty: botPlayer.botDifficulty || 'medium',
      });

      logger.info(`Bot ${botPlayer.playerName} joined game ${gameId}`);
    } catch (error) {
      logger.error('Error in bot_auto_join handler:', error);
      socket.emit('bot_error', {
        message: 'Failed to auto-join bot',
      });
    }
  });

  /**
   * Handle bot move request
   * Bot processes and sends move event to game
   */
  socket.on('bot_move_request', async (data) => {
    try {
      const { gameId, botPlayerIndex, diceValue } = data;

      const game = await gameRepository.findById(gameId);
      if (!game) {
        socket.emit('bot_error', {
          message: SOCKET_ERRORS.INVALID_GAME_ID,
        });
        return;
      }

      const botPlayer = game.players[botPlayerIndex];
      if (!botPlayer || !botPlayer.isBot) {
        socket.emit('bot_error', {
          message: 'Invalid bot player',
        });
        return;
      }

      // Get valid moves for bot
      const validMoves = botService.getValidMoves(botPlayer, diceValue);
      if (validMoves.length === 0) {
        socket.emit('bot_move_ready', {
          gameId,
          botPlayerIndex,
          action: 'skip',
          selectedMove: null,
          delay: botService.getThinkingDelay(botPlayer.botDifficulty || 'medium'),
        });
        return;
      }

      // Get bot decision based on difficulty
      const selectedMove = botService.decideMove(
        game,
        botPlayerIndex,
        validMoves,
        diceValue
      );

      socket.emit('bot_move_ready', {
        gameId,
        botPlayerIndex,
        action: 'move',
        selectedMove,
        delay: botService.getThinkingDelay(botPlayer.botDifficulty || 'medium'),
      });

      // Occasionally send quick chat message (30% chance)
      if (Math.random() < 0.3 && game.gameType !== 'practice') {
        botChatService.sendBotQuickMessage(game, botPlayerIndex, io);
      }

      logger.info(`Bot ${botPlayer.playerName} decided move in game ${gameId}`);
    } catch (error) {
      logger.error('Error in bot_move_request handler:', error);
      socket.emit('bot_error', {
        message: 'Failed to process bot move',
      });
    }
  });

  /**
   * Listen for game events and trigger bot actions
   */
  gameEvents.on('TURN_STARTED', async (eventData) => {
    try {
      const { gameId, playerIndex } = eventData;
      const game = await gameRepository.findById(gameId);

      if (!game) return;

      const currentPlayer = game.players[playerIndex];
      if (currentPlayer && currentPlayer.isBot && game.gameType !== 'practice') {
        // Trigger bot to send occasional chat messages
        if (Math.random() < 0.25) {
          botChatService.sendBotQuickMessage(game, playerIndex, io);
        }
      }
    } catch (error) {
      logger.error('Error in TURN_STARTED event handler:', error);
    }
  });

  /**
   * Listen for game end and bot reaction
   */
  gameEvents.on('GAME_ENDED', async (eventData) => {
    try {
      const { gameId, winnerId } = eventData;
      const game = await gameRepository.findById(gameId);

      if (!game) return;

      // Check if bot won or lost
      game.players.forEach((player, index) => {
        if (player.isBot && game.gameType !== 'practice') {
          const context = player.userId === winnerId ? 'win' : 'lose';
          botChatService.sendBotReactionMessage(game, index, context);
        }
      });
    } catch (error) {
      logger.error('Error in GAME_ENDED event handler:', error);
    }
  });
};

module.exports = botSocket;
