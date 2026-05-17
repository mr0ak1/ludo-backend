const mongoose = require('mongoose');
const crypto = require('crypto');
const gameRepository = require('../repositories/gameRepository');
const userRepository = require('../repositories/userRepository');
const walletService = require('./walletService');
const matchHistoryRepository = require('../repositories/matchHistoryRepository');
const gameEvents = require('../utils/gameEvents');
const { selectRandomBots, createBotPlayerObject, ensureBotsExist } = require('../utils/botSelector');
const botService = require('./botService');
const notificationService = require('./notificationService');
const statsService = require('./statsService');
const {
  TOKEN_COLORS,
  RANK_POINTS_WIN,
  RANK_POINTS_LOSS,
} = require('../constants/stats.constants');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const { SOCKET_EVENTS_SERVER_TO_CLIENT: SERVER_EVENTS } = require('../constants/socket.constants');
const { GAME_RULES } = require('../constants/rules.constants');
const logger = require('../utils/logger');
const { withRedisLock } = require('../utils/redisLock');
const { gameQueue } = require('../queues/gameQueue');

// Game constants
const BOARD_SIZE = 52;
const HOME_POSITIONS = [1, 9, 14, 22, 27, 35, 40, 48]; // Safe zones
const HOME_ENTRY_START = 50;
const HOME_ENTRY_END = 56; // 50-56 for final home run
const MAX_DICE_VALUE = 6;
const TURN_TIMEOUT = 20000; // 20 seconds
const DISCONNECT_TIMEOUT = 30000; // 30 seconds

function toUserIdString(ref) {
  if (ref == null) return null;
  if (typeof ref === 'string') return ref;
  if (ref._id) return ref._id.toString();
  return ref.toString();
}

function scheduleNewGameNotifications(game) {
  setImmediate(async () => {
    try {
      for (const p of game.players) {
        const uid = toUserIdString(p.userId);
        if (!uid) continue;
        const u = await userRepository.findById(uid);
        if (u && !u.isBot) {
          await notificationService.notifyGameStarted(uid, { gameId: game._id });
        }
      }
      const first = game.players[game.currentTurn];
      if (!first) return;
      const fid = toUserIdString(first.userId);
      const fu = await userRepository.findById(fid);
      if (fu && !fu.isBot) {
        await notificationService.notifyYourTurn(fid, { gameId: game._id });
      }
    } catch (e) {
      logger.error('New game notification error:', e.message);
    }
  });
}

class GameService {
  /**
   * Create practice game with 3 bots
   * @param {String} userId - Creator user ID
   * @param {Number} maxPlayers - Maximum players (always 4 for practice)
   * @returns {Promise<Object>} Created game with bots
   */
  async createPracticeGame(userId, maxPlayers = 4) {
    try {
      // Ensure bots exist in database
      await ensureBotsExist();

      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      // Start with real player
      const players = [
        {
          userId,
          position: 0,
          tokens: [
            { position: -1, active: false },
            { position: -1, active: false },
            { position: -1, active: false },
            { position: -1, active: false },
          ],
          diceCount: 0,
          consecutiveSixes: 0,
          isHome: [false, false, false, false],
        },
      ];

      // Try to add 3 bots
      const bots = await selectRandomBots(3, 'easy');
      if (bots && bots.length > 0) {
        for (let i = 0; i < bots.length; i++) {
          players.push(createBotPlayerObject(bots[i], players.length));
        }
      }

      const gameData = {
        gameType: 'practice',
        status: 'active', // Start immediately with bots
        maxPlayers: Math.max(players.length, 4),
        players,
        currentTurn: 0,
        moves: [],
        startTime: new Date(),
        endTime: null,
        results: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const game = await gameRepository.create(gameData);
      logger.info(`Practice game created with ${players.length} players: ${game._id}`);
      
      // Trigger bot turn if first player is bot
      if (game.players.length > 0) {
        this._scheduleTurnTimeout(game._id.toString(), TURN_TIMEOUT / 1000)
          .then(() => {
            setImmediate(() => this._triggerBotTurn(game._id.toString()));
          })
          .catch(err => logger.error('Error starting initial turn timeout:', err));
      }

      scheduleNewGameNotifications(game);
      
      return game;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating practice game:', error);
      throw error;
    }
  }

  /**
   * Create cash game with entry fee (2-player: 1 real + 1 bot)
   * @param {String} userId - Creator user ID
   * @param {Number} entryFee - Entry fee amount
   * @param {Number} maxPlayers - Maximum players (always 2 for cash)
   * @param {String} botDifficulty - Bot difficulty level (easy, medium, hard) - default: medium
   * @returns {Promise<Object>} Created game with bot
   */
  async createCashGame(userId, entryFee, maxPlayers = 2, botDifficulty = 'medium') {
    try {
      // Ensure bots exist in database
      await ensureBotsExist();

      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      // Deduct entry fee from user's wallet
      await walletService.processGameEntry(userId, entryFee, null);

      // Start with real player
      const players = [
        {
          userId,
          position: 0,
          tokens: [
            { position: -1, active: false },
            { position: -1, active: false },
            { position: -1, active: false },
            { position: -1, active: false },
          ],
          diceCount: 0,
          consecutiveSixes: 0,
          isHome: [false, false, false, false],
        },
      ];

      // Try to add 1 bot with specified difficulty
      const bots = await selectRandomBots(1, botDifficulty);
      if (bots && bots.length > 0) {
        players.push(createBotPlayerObject(bots[0], 1));
      }

      const gameData = {
        gameType: 'cash',
        entryFee,
        status: 'active', // Start immediately with bot
        maxPlayers: Math.max(players.length, 2),
        players,
        currentTurn: 0,
        moves: [],
        startTime: new Date(),
        endTime: null,
        results: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const game = await gameRepository.create(gameData);
      logger.info(`Cash game created with ${players.length} players and entry fee ${entryFee}: ${game._id}`);
      
      // Trigger bot turn if first player is bot
      if (game.players.length > 0) {
        this._scheduleTurnTimeout(game._id.toString(), TURN_TIMEOUT / 1000)
          .then(() => {
            setImmediate(() => this._triggerBotTurn(game._id.toString()));
          })
          .catch(err => logger.error('Error starting initial turn timeout:', err));
      }

      scheduleNewGameNotifications(game);
      
      return game;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating cash game:', error);
      throw error;
    }
  }

  /**
   * Join existing game
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID joining
   * @returns {Promise<Object>} Updated game
   */
  async joinGame(gameId, userId) {
    try {
      const game = await gameRepository.findById(gameId);
      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      // Practice and cash games are auto-started with bots - can't join
      if (game.gameType === 'practice' || game.gameType === 'cash') {
        throw new ApiError(HTTP_STATUS.CONFLICT, `Cannot join ${game.gameType} games - they are auto-started`);
      }

      // Check if game is full or already started
      if (game.players.length >= game.maxPlayers) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Game is full');
      }

      if (game.status !== 'waiting') {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Game already started');
      }

      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      // Check if user already in game
      const alreadyInGame = game.players.some(p => toUserIdString(p.userId) === userId);
      if (alreadyInGame) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Already in this game');
      }

      if (game.gameType === 'cash') {
        await walletService.processGameEntry(userId, game.entryFee, gameId);
      }

      const playerData = {
        userId,
        position: game.players.length,
        tokens: [
          { position: -1, active: false },
          { position: -1, active: false },
          { position: -1, active: false },
          { position: -1, active: false },
        ],
        diceCount: 0,
        consecutiveSixes: 0,
        isHome: [false, false, false, false],
      };

      const updatedGame = await gameRepository.addPlayer(gameId, playerData);
      gameEvents.emit(SERVER_EVENTS.GAME_JOINED, {
        gameId,
        userId,
        game: this._formatGameResponse(updatedGame),
      });
      logger.info(`User ${userId} joined game ${gameId}`);
      return updatedGame;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error joining game:', error);
      throw error;
    }
  }

  /**
   * Get game details
   * @param {String} gameId - Game ID
   * @returns {Promise<Object>} Game details
   */
  async getGameDetails(gameId) {
    try {
      const game = await gameRepository.findById(gameId);
      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      const resolvedGame = await this._handleTurnTimeout(gameId, game);
      return this._formatGameResponse(resolvedGame);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting game details:', error);
      throw error;
    }
  }

  /**
   * Get active game for user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Active game
   */
  async getActiveGame(userId) {
    try {
      const game = await gameRepository.findActiveGameForUser(userId);
      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'No active game');
      }

      const resolvedGame = await this._handleTurnTimeout(game._id, game);
      return this._formatGameResponse(resolvedGame);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting active game:', error);
      throw error;
    }
  }


  /**
   * Roll dice
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Dice result
   */
  async rollDice(gameId, userId, turnVersion) {
    return await withRedisLock(gameId, async () => {
      try {
        let game = await gameRepository.findById(gameId);
        if (!game) {
          throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
        }

        if (game.currentTurnCount !== turnVersion) {
          throw new ApiError(HTTP_STATUS.CONFLICT, 'Stale game state. Please refresh.', {
            serverVersion: game.currentTurnCount,
            clientVersion: turnVersion
          });
        }

        game = await this._handleTurnTimeout(gameId, game);

        if (game.status !== 'active') {
          throw new ApiError(HTTP_STATUS.CONFLICT, 'Game is not active');
        }
 
        // Anti-cheat: verify user hasn't already rolled and is waiting to move
        if (game.diceValue > 0) {
          throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Dice already rolled. Please move your token.');
        }

        // Verify it's user's turn
        const currentPlayer = game.players[game.currentTurn];
        if (toUserIdString(currentPlayer.userId) !== userId) {
          throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Not your turn');
        }

        // Roll dice (1-6)
        const diceValue = this._getRiggedDiceValue(game, game.currentTurn, false);

        await gameRepository.update(gameId, { diceValue, turnStartedAt: new Date() });

        // Schedule timeout for the MOVE action (User has 20s to select token)
        await this._scheduleTurnTimeout(gameId, TURN_TIMEOUT / 1000);

        const moveData = {
          playerIndex: game.currentTurn,
          userId,
          action: 'roll_dice',
          diceValue,
          consecutiveSixes: currentPlayer.consecutiveSixes + (diceValue === 6 ? 1 : 0),
        };

        const refreshedGame = await gameRepository.addMove(gameId, moveData);
        const validMoves = this._getValidMoves(currentPlayer, diceValue);

        gameEvents.emit(SERVER_EVENTS.DICE_ROLLED, {
          gameId,
          userId,
          diceValue,
          playerIndex: game.currentTurn,
          consecutiveSixes: moveData.consecutiveSixes,
          validMoves,
        });

        gameEvents.emit(SERVER_EVENTS.GAME_STATE_SYNC, {
          gameId,
          game: this._formatGameResponse(refreshedGame),
        });

        logger.info(`Dice rolled in game ${gameId}: ${diceValue}`);

        if (validMoves.length === 0) {
          this._handleNoValidMovesAutoSkip(gameId, userId, refreshedGame.currentTurnCount);
        }

        return {
          gameId,
          diceValue,
          playerIndex: game.currentTurn,
          consecutiveSixes: moveData.consecutiveSixes,
          validMoves,
        };
      } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Error rolling dice:', error);
        throw error;
      }
    });
  }

  /**
   * Move token
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID
   * @param {Number} tokenIndex - Token index (0-3)
   * @returns {Promise<Object>} Updated game
   */
  async moveToken(gameId, userId, tokenIndex, turnVersion) {
    return await withRedisLock(gameId, async () => {
      try {
        let game = await gameRepository.findById(gameId);
        if (!game) {
          throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
        }

        if (game.currentTurnCount !== turnVersion) {
          throw new ApiError(HTTP_STATUS.CONFLICT, 'Stale game state. Please refresh.', {
            serverVersion: game.currentTurnCount,
            clientVersion: turnVersion
          });
        }

        game = await this._handleTurnTimeout(gameId, game);

        if (game.status !== 'active') {
          throw new ApiError(HTTP_STATUS.CONFLICT, 'Game is not active');
        }

        const playerIndex = game.currentTurn;
        const currentPlayer = game.players[playerIndex];

        // Verify it's user's turn
        if (toUserIdString(currentPlayer.userId) !== userId) {
          throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Not your turn');
        }

        // Validate token index
        if (tokenIndex < 0 || tokenIndex > 3) {
          throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid token index');
        }

        const diceValue = game.diceValue;
        if (!diceValue || diceValue < 1 || diceValue > 6) {
          throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'You must roll the dice first');
        }

        const validMoves = this._getValidMoves(currentPlayer, diceValue);
        const isValid = validMoves.includes(tokenIndex);
        if (!isValid) {
          throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid move for this token');
        }

        const token = currentPlayer.tokens[tokenIndex];
        const formattedGame = await this._applyMove(gameId, game, playerIndex, tokenIndex, diceValue, userId, false);

        return formattedGame;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Error moving token:', error);
        throw error;
      }
    });
  }

  /**
   * Skip turn
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated game
   */
  async skipTurn(gameId, userId, turnVersion) {
    return await withRedisLock(gameId, async () => {
      try {
        let game = await gameRepository.findById(gameId);
        if (!game) {
          throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
        }

        if (game.currentTurnCount !== turnVersion) {
          throw new ApiError(HTTP_STATUS.CONFLICT, 'Stale game state. Please refresh.', {
            serverVersion: game.currentTurnCount,
            clientVersion: turnVersion
          });
        }

        game = await this._handleTurnTimeout(gameId, game);

        const playerIndex = game.currentTurn;
        const currentPlayer = game.players[playerIndex];

        if (toUserIdString(currentPlayer.userId) !== userId) {
          throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Not your turn');
        }

        // Move to next player
        currentPlayer.consecutiveSixes = 0;
        await gameRepository.updatePlayerBoard(gameId, playerIndex, {
          tokens: currentPlayer.tokens,
          isHome: currentPlayer.isHome,
          consecutiveSixes: currentPlayer.consecutiveSixes,
        });
        const nextTurn = (playerIndex + 1) % game.players.length;
        await gameRepository.update(gameId, { diceValue: 0 });
        await gameRepository.updateCurrentTurn(gameId, nextTurn);

        const moveData = {
          playerIndex,
          userId,
          action: 'skip_turn',
          timestamp: new Date(),
        };

        const updatedGame = await gameRepository.addMove(gameId, moveData);
        const formattedGame = this._formatGameResponse(updatedGame);

        // Schedule turn timeout for the next player
        await this._scheduleTurnTimeout(gameId, TURN_TIMEOUT / 1000);

        // Trigger bot turn if next player is a bot
        this._triggerBotTurn(gameId).catch(err => logger.error('Bot recursion error:', err));

        gameEvents.emit(SERVER_EVENTS.TURN_CHANGED, {
          gameId,
          userId,
          currentTurn: nextTurn,
          action: 'skip_turn',
          game: formattedGame,
        });

        gameEvents.emit(SERVER_EVENTS.GAME_STATE_SYNC, {
          gameId,
          game: formattedGame,
        });

        return formattedGame;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Error skipping turn:', error);
        throw error;
      }
    });
  }

  /**
   * Surrender game
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated game
   */
  async surrenderGame(gameId, userId) {
    return await withRedisLock(gameId, async () => {
      try {
        const game = await gameRepository.findById(gameId);
        if (!game) {
          throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
        }

        const playerIndex = game.players.findIndex(
          p => toUserIdString(p.userId) === userId
        );

        if (playerIndex === -1) {
          throw new ApiError(HTTP_STATUS.FORBIDDEN, 'User not in this game');
        }

        // Update game status
        const results = {
          surrenderedBy: userId,
          status: 'surrendered',
        };

        const updatedGame = await gameRepository.surrenderGame(gameId, userId);

        // Refund entry fee for cash games
        if (game.gameType === 'cash') {
          try {
            await walletService.processGameReward(userId, game.entryFee, gameId);
          } catch (error) {
            logger.error('Error refunding surrender fee:', error);
          }
        }

        const formattedGame = this._formatGameResponse(updatedGame);
        gameEvents.emit(SERVER_EVENTS.GAME_ENDED, {
          gameId,
          userId,
          results,
          game: formattedGame,
        });
        logger.info(`User ${userId} surrendered game ${gameId}`);
        return formattedGame;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        logger.error('Error surrendering game:', error);
        throw error;
      }
    });
  }

  /**
   * Complete game and distribute rewards
   * @param {String} gameId - Game ID
   * @param {Object} results - Game results
   * @returns {Promise<Object>} Completed game
   */
  async completeGame(gameId, results, options = {}) {
    const isExternalSession = !!options.session;
    let session = options.session;
    let isStandalone = false;
    if (!isExternalSession) {
      try {
        session = await mongoose.startSession();
      } catch (err) {
        isStandalone = true;
      }
    }

    let formattedGame;

    const executeLogic = async (sess) => {
      const game = await gameRepository.findById(gameId);
      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      await gameRepository.completeGame(gameId, results, { session: sess });

      const winnerStr = toUserIdString(results.winner);
      const entryFee = game.entryFee || 0;
      const numPlayers = game.players.length;
      const totalPot = game.gameType === 'cash' ? entryFee * numPlayers : 0;
      const rewardAmount =
        game.gameType === 'cash' && winnerStr ? Math.floor(totalPot * 0.9) : 0;
      const startedAt = game.startTime || game.createdAt || new Date();
      const durationMs = Math.max(0, Date.now() - new Date(startedAt).getTime());
      const totalMoves = Array.isArray(game.moves) ? game.moves.length : 0;

      const playerIds = game.players.map((p) => toUserIdString(p.userId));
      const isBotMap = await userRepository.getIsBotMapByIds(playerIds);
      const n = game.players.length;
      const winIdx = game.players.findIndex((p) => toUserIdString(p.userId) === winnerStr);

      const participants = game.players.map((p, idx) => {
        const uid = toUserIdString(p.userId);
        const placement = winIdx >= 0 ? ((idx - winIdx + n) % n) + 1 : idx + 1;
        const isBot = !!(isBotMap[uid] && isBotMap[uid].isBot);
        const playerColor = TOKEN_COLORS[idx % TOKEN_COLORS.length];
        let coinsWon = 0;
        let coinsLost = 0;
        if (game.gameType === 'cash' && entryFee > 0) {
          if (placement === 1 && winnerStr) {
            coinsWon = rewardAmount;
            coinsLost = entryFee;
          } else {
            coinsWon = 0;
            coinsLost = entryFee;
          }
        }
        return {
          userId: new mongoose.Types.ObjectId(uid),
          isBot,
          playerColor,
          placement,
          coinsWon,
          coinsLost,
        };
      });

      try {
        await matchHistoryRepository.create({
          gameId: new mongoose.Types.ObjectId(gameId),
          gameType: game.gameType,
          betAmount: entryFee,
          duration: durationMs,
          totalMoves,
          participants,
          winnerId: winnerStr ? new mongoose.Types.ObjectId(winnerStr) : null,
          startedAt: new Date(startedAt),
          endedAt: new Date(),
        }, { session: sess });
      } catch (error) {
        logger.error('Error recording match history:', error);
      }

      // Distribute rewards for cash games
      if (game.gameType === 'cash' && results.winner) {
        try {
          await walletService.processGameReward(results.winner, rewardAmount, gameId, sess);
        } catch (error) {
          logger.error('Error distributing reward:', error);
        }
      }

      for (const player of game.players) {
        try {
          const uid = toUserIdString(player.userId);
          const isBot = !!(isBotMap[uid] && isBotMap[uid].isBot);
          if (isBot) continue;

          const isWinner = uid === winnerStr;
          const idx = game.players.indexOf(player);
          const placement = winIdx >= 0 ? ((idx - winIdx + n) % n) + 1 : idx + 1;
          const tokenColor = TOKEN_COLORS[idx % TOKEN_COLORS.length];

          let netCoinsWon = 0;
          let netCoinsLost = 0;
          if (game.gameType === 'cash' && entryFee > 0) {
            if (isWinner) {
              netCoinsWon = Math.max(0, rewardAmount - entryFee);
            } else {
              netCoinsLost = entryFee;
            }
          }

          await userRepository.updateGameStats(uid, {
            won: isWinner,
            netCoinsWon,
            netCoinsLost,
            tokenColor,
            rankPointsDelta: isWinner ? RANK_POINTS_WIN : RANK_POINTS_LOSS,
          }, { session: sess });
        } catch (error) {
          logger.error('Error updating user stats:', error);
        }
      }
      
      const updatedGame = await gameRepository.findById(gameId);
      formattedGame = this._formatGameResponse(updatedGame);
    };

    try {
      if (isExternalSession || isStandalone) {
        await executeLogic(session);
      } else {
        try {
          await session.withTransaction(async () => {
            await executeLogic(session);
          });
        } catch (txnError) {
          const isStandaloneTxnError = 
            txnError.message && 
            (txnError.message.includes('replica set') || 
             txnError.message.includes('Transaction numbers') ||
             txnError.code === 20);

          if (isStandaloneTxnError) {
            logger.warn('[Mongoose] completeGame: Standalone MongoDB detected. Bypassing transaction.');
            await executeLogic(null);
          } else {
            throw txnError;
          }
        }
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error completing game:', error);
      throw error;
    } finally {
      if (session && !isExternalSession) {
        session.endSession();
      }
    }

    try {
      statsService.invalidateLeaderboardCache();
    } catch (e) {
      logger.error('invalidateLeaderboardCache:', e.message);
    }

    gameEvents.emit(SERVER_EVENTS.GAME_ENDED, {
      gameId,
      results,
      game: formattedGame,
    });
    logger.info(`Game completed: ${gameId}, Winner: ${results.winner}`);
    return formattedGame;
  }

  /**
   * Reconnect to ongoing game
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Game state
   */
  async reconnect(gameId, userId) {
    try {
      const game = await gameRepository.findById(gameId);
      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      const resolvedGame = await this._handleTurnTimeout(gameId, game);

      const playerIndex = resolvedGame.players.findIndex(
        p => toUserIdString(p.userId) === userId
      );

      if (playerIndex === -1) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'User not in this game');
      }

      const formattedGame = this._formatGameResponse(resolvedGame);
      
      // Update reconnect status in DB
      await gameRepository.updatePlayerBoard(gameId, playerIndex, {
        disconnectedAt: null,
        isActive: true,
      });

      gameEvents.emit(SERVER_EVENTS.PLAYER_RECONNECTED, {
        gameId,
        userId,
        game: formattedGame,
      });
      gameEvents.emit(SERVER_EVENTS.GAME_STATE_SYNC, {
        gameId,
        userId,
        game: formattedGame,
      });
      logger.info(`User ${userId} reconnected to game ${gameId}`);
      return formattedGame;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error reconnecting:', error);
      throw error;
    }
  }

  /**
   * Handle unexpected socket disconnect
   * @param {String} userId - User ID
   */
  async handleDisconnect(userId) {
    try {
      // Find the user's active game
      const game = await gameRepository.findActiveGameForUser(userId);
      if (!game || (game.status !== 'active' && game.status !== 'ongoing')) {
        return;
      }

      const playerIndex = game.players.findIndex(
        p => toUserIdString(p.userId) === userId
      );

      if (playerIndex === -1) {
        return;
      }

      await gameRepository.updatePlayerBoard(game._id, playerIndex, {
        disconnectedAt: new Date(),
        isActive: false,
      });

      gameEvents.emit(SERVER_EVENTS.PLAYER_DISCONNECTED, {
        gameId: game._id,
        userId,
      });

      logger.info(`User ${userId} disconnected from game ${game._id}`);

      // Schedule auto-surrender timeout via BullMQ (30 seconds)
      await gameQueue.add(
        'afk-check',
        { gameId: game._id, userId },
        { delay: DISCONNECT_TIMEOUT, jobId: `afk-${game._id}-${userId}` }
      );
    } catch (error) {
      logger.error('Error handling disconnect:', error);
    }
  }

  /**
   * Restore game state
   * @param {String} gameId - Game ID
   * @returns {Promise<Object>} Game state
   */
  async restoreGameState(gameId) {
    try {
      const game = await gameRepository.findById(gameId);
      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      const resolvedGame = await this._handleTurnTimeout(gameId, game);
      const formattedGame = this._formatGameResponse(resolvedGame);
      gameEvents.emit(SERVER_EVENTS.GAME_STATE_SYNC, {
        gameId,
        game: formattedGame,
      });
      return formattedGame;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error restoring game state:', error);
      throw error;
    }
  }

  /**
   * Get user game history
   * @param {String} userId - User ID
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Game history
   */
  async getUserGameHistory(userId, pagination = {}) {
    try {
      const result = await gameRepository.getUserGameHistory(userId, pagination);

      return {
        games: result.games.map(g => this._formatGameResponse(g)),
        pagination: result.pagination,
      };
    } catch (error) {
      logger.error('Error getting game history:', error);
      throw error;
    }
  }

  /**
   * Get waiting games (matchmaking)
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Waiting games
   */
  async getWaitingGames(pagination = {}) {
    try {
      const result = await gameRepository.findWaitingGames(pagination);

      return {
        games: result.games.map(g => this._formatGameResponse(g)),
        pagination: result.pagination,
      };
    } catch (error) {
      logger.error('Error getting waiting games:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} Leaderboard
   */
  async getLeaderboard(pagination = {}) {
    try {
      const leaderboard = await gameRepository.getLeaderboard(pagination);
      return leaderboard;
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * PRIVATE METHODS
   */

  /**
   * Auto-skip a timed out turn before serving the next action.
   * @private
   */
  async _handleTurnTimeout(gameId, game) {
    if (!game || game.status !== 'active' || !game.updatedAt) {
      return game;
    }
 
    const turnStartedAt = game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : 0;
    if (!turnStartedAt || Date.now() - turnStartedAt < TURN_TIMEOUT) {
      return game;
    }
 
    const playerIndex = game.currentTurn;
    const currentPlayer = game.players[playerIndex];
 
    if (currentPlayer) {
      await gameRepository.updatePlayerBoard(gameId, playerIndex, {
        tokens: currentPlayer.tokens,
        isHome: currentPlayer.isHome,
        consecutiveSixes: 0,
      });
    }
 
    const nextTurn = (playerIndex + 1) % game.players.length;
    await gameRepository.update(gameId, { diceValue: 0 });
    await gameRepository.updateCurrentTurn(gameId, nextTurn);
    await gameRepository.addMove(gameId, {
      playerIndex,
      action: 'turn_timeout',
      timeoutMs: TURN_TIMEOUT,
      timestamp: new Date(),
    });
 
    const updatedGame = await gameRepository.findById(gameId);
    const formattedGame = this._formatGameResponse(updatedGame);

    // Schedule turn timeout for the next player
    await this._scheduleTurnTimeout(gameId, TURN_TIMEOUT / 1000);

    // Trigger bot turn if next player is a bot
    this._triggerBotTurn(gameId).catch(err => logger.error('Bot recursion error:', err));

    gameEvents.emit(SERVER_EVENTS.TURN_CHANGED, {
      gameId,
      currentTurn: nextTurn,
      action: 'turn_timeout',
      game: formattedGame,
    });
    gameEvents.emit(SERVER_EVENTS.GAME_STATE_SYNC, {
      gameId,
      game: formattedGame,
    });
 
    return updatedGame;
  }

  /**
   * Check if token landed on opponent and kill them
   * @private
   */
  _checkKill(game, playerIndex, newPosition) {
    if (newPosition < 0 || newPosition > 51) {
      return null; // Safe zones or home lane
    }

    const newGlobalPos = (newPosition + playerIndex * 13 + 1) % 52;
    if (HOME_POSITIONS.includes(newGlobalPos)) {
      return null;
    }

    for (let i = 0; i < game.players.length; i++) {
      if (i === playerIndex) continue;

      const opponentPlayer = game.players[i];
      const killedTokenIndex = opponentPlayer.tokens.findIndex(t => {
        if (t.position < 0 || t.position > 51) return false;
        const oppGlobalPos = (t.position + i * 13 + 1) % 52;
        return oppGlobalPos === newGlobalPos;
      });

      if (killedTokenIndex !== -1) {
        return { playerIndex: i, tokenIndex: killedTokenIndex };
      }
    }

    return null;
  }

  /**
   * Get rigged dice value for hard mode bot
   * @private
   */
  _getRiggedDiceValue(game, playerIndex, isBotRoll) {
    let diceValue = crypto.randomInt(1, 7);
    try {
      let hasHardBot = false;
      let humanPlayer = null;
      for (let i = 0; i < game.players.length; i++) {
        const p = game.players[i];
        if (p.isBot && p.botDifficulty === 'hard') hasHardBot = true;
        else if (!p.isBot) humanPlayer = p;
      }

      if (!hasHardBot || !humanPlayer) return diceValue;

      const humanCompleted = humanPlayer.tokens.filter(t => t.position === 57 || humanPlayer.isHome[humanPlayer.tokens.indexOf(t)]).length;
      const isUserWinning = humanCompleted >= 2;

      if (!isBotRoll) {
        // Anti-required move for human's last token to enter home
        if (humanCompleted === 3) {
            let requiredValueToWin = null;
            for(let i=0; i<4; i++) {
                if(!humanPlayer.isHome[i] && humanPlayer.tokens[i].position >= 51 && humanPlayer.tokens[i].position < 57) {
                    requiredValueToWin = 57 - humanPlayer.tokens[i].position;
                    break;
                }
            }
            if(requiredValueToWin && diceValue === requiredValueToWin) {
                // Deny the winning roll and re-roll 
                let newRoll;
                do {
                    newRoll = crypto.randomInt(1, 7);
                } while(newRoll === requiredValueToWin);
                diceValue = newRoll;
            }
        }
        return diceValue;
      } else {
        const botPlayer = game.players[playerIndex];
        
        // 30% chance to get exact required move to enter home if near home
        if (crypto.randomInt(0, 100) < 30) {
            for (let i = 0; i < 4; i++) {
                const token = botPlayer.tokens[i];
                if (!botPlayer.isHome[i] && token.position >= 51 && token.position < 57) {
                    const requiredHomeRoll = 57 - token.position;
                    if (requiredHomeRoll >= 1 && requiredHomeRoll <= 6) {
                        return requiredHomeRoll;
                    }
                }
            }
        }

        // Always try to find a required move to kill opponent
        let requiredValue = null;
        for (let d = 1; d <= 6; d++) {
          for (let i = 0; i < 4; i++) {
            const token = botPlayer.tokens[i];
            if (token.position >= 0 && token.position < 52) {
              const newPos = token.position + d;
              if (newPos < 52) {
                const killed = this._checkKill(game, playerIndex, newPos);
                if (killed) { requiredValue = d; break; }
              }
            }
          }
          if (requiredValue) break;
        }

        if (requiredValue) {
           diceValue = requiredValue;
        } else if (isUserWinning) {
           // Weighted probability: 60% chance for a high value (4,5,6), 40% for any
           if (crypto.randomInt(0, 100) < 60) {
             const highValues = [4, 5, 6, 6, 6];
             diceValue = highValues[crypto.randomInt(0, highValues.length)];
           } else {
             diceValue = crypto.randomInt(1, 7);
           }
        } else {
           diceValue = crypto.randomInt(1, 7);
        }
      }
      if (diceValue < 1 || diceValue > 6) diceValue = crypto.randomInt(1, 7);
      return diceValue;
    } catch (e) {
      return diceValue;
    }
  }

  /**
   * Get valid moves for current player
   * @private
   */
  _getValidMoves(player, diceValue) {
    const validMoves = [];

    for (let i = 0; i < 4; i++) {
      const token = player.tokens[i];

      // Token locked - needs 6
      if (token.position === -1) {
        if (diceValue === 6) validMoves.push(i);
      } else if (token.position >= 0 && token.position + diceValue <= 57 && !player.isHome?.[i] && token.position !== 57) {
        // Token can move
        validMoves.push(i);
      }
    }

    return validMoves;
  }

  /**
   * Trigger bot turn automation
   * @private
   */
  async _triggerBotTurn(gameId) {
    try {
      const game = await gameRepository.findById(gameId);
      if (!game || game.status !== 'active') {
        return;
      }

      const currentPlayerIndex = game.currentTurn;
      const isBot = await botService.isPlayerBot(game, currentPlayerIndex);

      if (!isBot) {
        return; // Not a bot, skip automation
      }

      const botLevel = await botService.getBotLevel(game, currentPlayerIndex);
      let thinkingDelay = botService.getThinkingDelay(botLevel);
      if (game.gameType === 'practice' || game.gameType === 'bot') {
        thinkingDelay += 1200; // Add an extra 1.2 seconds of relaxed thinking time in practice/bot matches
      }

      const config = require('../config/env');
      if (config.isDevelopment) {
        logger.debug(`[Dev Mode] Scheduling in-memory bot turn in ${thinkingDelay}ms`);
        setTimeout(async () => {
          try {
            await this._triggerBotTurnInternal(gameId);
          } catch (err) {
            logger.error('[Dev Mode] Error in in-memory bot turn:', err);
          }
        }, thinkingDelay);
        return;
      }

      // Schedule bot turn via BullMQ
      await gameQueue.add(
        'bot-turn',
        { gameId },
        { delay: thinkingDelay, jobId: `bot-turn-${gameId}-${game.currentTurnCount}` }
      );
    } catch (error) {
      logger.error('Error triggering bot turn:', error);
    }
  }

  /**
   * Bot rolls dice automatically
   * @private
   */
  async _botRollDice(gameId) {
    try {
      let game = await gameRepository.findById(gameId);
      if (!game || game.status !== 'active') {
        return;
      }

      const playerIndex = game.currentTurn;
      const player = game.players[playerIndex];
      const isBot = await botService.isPlayerBot(game, playerIndex);

      if (!isBot) {
        return; // Not a bot
      }

      const diceValue = this._getRiggedDiceValue(game, playerIndex, true);
      
      // Persist dice value for reconnect/sync
      await gameRepository.update(gameId, { diceValue });

      const validMoves = botService.getValidMoves(player, diceValue);

      const moveData = {
        playerIndex,
        userId: toUserIdString(player.userId),
        action: 'roll_dice',
        diceValue,
        isBot: true,
        consecutiveSixes: player.consecutiveSixes + (diceValue === 6 ? 1 : 0),
      };

      game = await gameRepository.addMove(gameId, moveData);

      gameEvents.emit(SERVER_EVENTS.DICE_ROLLED, {
        gameId,
        userId: toUserIdString(player.userId),
        diceValue,
        playerIndex,
        consecutiveSixes: moveData.consecutiveSixes,
        validMoves,
        game: this._formatGameResponse(game),
      });

      logger.info(`Bot rolled dice in game ${gameId}: ${diceValue}`);

      // Allows frontend dice roll animation to fully complete and user to see rolled number (longer delay in practice/bot matches for relaxed feel)
      const isPracticeOrBot = game.gameType === 'practice' || game.gameType === 'bot';
      const postRollDelay = isPracticeOrBot ? 2800 : 1800;
      await botService.sleep(postRollDelay);

      // Auto-move if valid moves available
      if (validMoves.length > 0) {
        await this._botMoveToken(gameId, validMoves, diceValue);
      } else {
        // No valid moves, skip turn
        await this._botSkipTurn(gameId);
      }
    } catch (error) {
      logger.error('Error in bot roll dice:', error);
    }
  }

  /**
   * Bot moves token automatically
   * @private
   */
  async _botMoveToken(gameId, validMoves, diceValue) {
    try {
      let game = await gameRepository.findById(gameId);
      if (!game || game.status !== 'active') {
        return;
      }

      const playerIndex = game.currentTurn;
      const player = game.players[playerIndex];

      // Decide which token to move
      const tokenIndex = await botService.decideMove(game, playerIndex, validMoves, diceValue);

      if (tokenIndex === -1 || tokenIndex >= 4) {
        // Invalid move, skip turn
        await this._botSkipTurn(gameId);
        return;
      }

      await this._applyMove(gameId, game, playerIndex, tokenIndex, diceValue, toUserIdString(player.userId), true);
    } catch (error) {
      logger.error('Error in bot move token:', error);
    }
  }

  /**
   * Bot skips turn
   * @private
   */
  async _botSkipTurn(gameId) {
    try {
      let game = await gameRepository.findById(gameId);
      if (!game || game.status !== 'active') {
        return;
      }

      const playerIndex = game.currentTurn;
      const player = game.players[playerIndex];

      await gameRepository.updatePlayerBoard(gameId, playerIndex, {
        tokens: player.tokens,
        isHome: player.isHome,
        consecutiveSixes: 0,
      });

      const nextTurn = (playerIndex + 1) % game.players.length;
      await gameRepository.update(gameId, { diceValue: 0 });
      await gameRepository.updateCurrentTurn(gameId, nextTurn);

      game = await gameRepository.findById(gameId);
      const formattedGame = this._formatGameResponse(game);

      // Schedule turn timeout for the next player
      await this._scheduleTurnTimeout(gameId, TURN_TIMEOUT / 1000);

      // Trigger next bot turn if applicable (Fire and forget to prevent async recursion)
      this._triggerBotTurn(gameId).catch(err => logger.error('Bot recursion error:', err));

      gameEvents.emit(SERVER_EVENTS.TURN_CHANGED, {
        gameId,
        userId: toUserIdString(player.userId),
        currentTurn: nextTurn,
        action: 'skip_turn',
        game: formattedGame,
      });
      
      gameEvents.emit(SERVER_EVENTS.GAME_STATE_SYNC, {
        gameId,
        game: formattedGame,
      });
    } catch (error) {
      logger.error('Error in bot skip turn:', error);
    }
  }

  /**
   * Unified move execution engine for both Human and Bot
   * @private
   */
  async _applyMove(gameId, game, playerIndex, tokenIndex, diceValue, actionUserId, isBot) {
    // Create a deep clone to avoid mutating the source object before transaction success
    // This prevents race conditions and state corruption if the transaction fails
    const gameClone = JSON.parse(JSON.stringify(game));
    const currentPlayer = gameClone.players[playerIndex];
    const token = currentPlayer.tokens[tokenIndex];

    const moveData = {
      playerIndex,
      userId: actionUserId,
      action: 'move_token',
      tokenIndex,
      diceValue,
      isBot: !!isBot,
      timestamp: new Date(),
    };

    let newPosition = token.position;
    if (token.position === -1) {
      if (diceValue !== 6) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Dice must be 6 to unlock token');
      newPosition = 0;
      token.active = true;
    } else {
      newPosition = token.position + diceValue;
      if (newPosition > 57) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid move');
      }
    }

    // Handle consecutive sixes on the clone
    let nextTurn = playerIndex;
    if (diceValue === 6) {
      currentPlayer.consecutiveSixes++;
      if (currentPlayer.consecutiveSixes >= 3) {
        currentPlayer.consecutiveSixes = 0;
        nextTurn = (playerIndex + 1) % gameClone.players.length;
        
        // In Ludo, the 3rd consecutive six is discarded and turn passes
        moveData.action = 'consecutive_sixes_skip';
        // We don't update token.position here, effectively skipping the move
      } else {
        token.position = newPosition;
        moveData.newPosition = newPosition;
        if (newPosition === 57) currentPlayer.isHome[tokenIndex] = true;
      }
    } else {
      currentPlayer.consecutiveSixes = 0;
      nextTurn = (playerIndex + 1) % gameClone.players.length;
      token.position = newPosition;
      moveData.newPosition = newPosition;
      if (newPosition === 57) currentPlayer.isHome[tokenIndex] = true;
    }

    // Check for kills using the clone (only if token actually moved)
    const killedOpponent = moveData.action === 'move_token' ? this._checkKill(gameClone, playerIndex, newPosition) : null;
    if (killedOpponent) {
      moveData.killedOpponent = killedOpponent;
      const victim = gameClone.players[killedOpponent.playerIndex];
      victim.tokens[killedOpponent.tokenIndex].position = -1;
      
      // Grant extra turn for a successful kill
      nextTurn = playerIndex;
    }

    // Grant extra turn if token reached the Home goal (57)
    if (newPosition === 57 && moveData.action === 'move_token') {
      nextTurn = playerIndex;
    }

    // Check for win using the clone: tokens must be at position 57
    const hasWon = currentPlayer.tokens.every(t => t.position === 57);


    const executeApplyMoveLogic = async (sess) => {
      const opts = sess ? { session: sess } : {};

      if (killedOpponent) {
        const victim = gameClone.players[killedOpponent.playerIndex];
        await gameRepository.updatePlayerBoard(gameId, killedOpponent.playerIndex, {
          tokens: victim.tokens,
          isHome: victim.isHome,
          consecutiveSixes: victim.consecutiveSixes,
        }, opts);
      }

      if (hasWon) {
        await gameRepository.updatePlayerBoard(gameId, playerIndex, {
          tokens: currentPlayer.tokens,
          isHome: currentPlayer.isHome,
          consecutiveSixes: currentPlayer.consecutiveSixes,
        }, opts);
        return;
      }

      if (nextTurn !== playerIndex) {
        await gameRepository.updateCurrentTurn(gameId, nextTurn, opts);
      } else {
        // Human player gets an extra turn (rolled a 6, got a kill, or reached home 57).
        // We increment currentTurnCount and reset turnStartedAt to refresh the turn version and timer.
        await gameRepository.update(gameId, {
          $inc: { currentTurnCount: 1 },
          $set: { turnStartedAt: new Date() }
        }, opts);
      }

      await gameRepository.updatePlayerBoard(gameId, playerIndex, {
        tokens: currentPlayer.tokens,
        isHome: currentPlayer.isHome,
        consecutiveSixes: currentPlayer.consecutiveSixes,
      }, opts);

      await gameRepository.addMove(gameId, moveData, opts);
      await gameRepository.update(gameId, { diceValue: 0 }, opts);
    };

    let session = null;
    let isStandalone = false;
    try {
      session = await mongoose.startSession();
    } catch (err) {
      isStandalone = true;
    }

    try {
      if (isStandalone) {
        await executeApplyMoveLogic(null);
      } else {
        try {
          await session.withTransaction(async () => {
            await executeApplyMoveLogic(session);
          });
        } catch (txnError) {
          const isStandaloneTxnError = 
            txnError.message && 
            (txnError.message.includes('replica set') || 
             txnError.message.includes('Transaction numbers') ||
             txnError.code === 20);

          if (isStandaloneTxnError) {
            logger.warn('[Mongoose] _applyMove: Standalone MongoDB detected. Bypassing transaction.');
            await executeApplyMoveLogic(null);
          } else {
            throw txnError;
          }
        }
      }
    } catch (error) {
      logger.error('Failed executing updates in _applyMove:', error);
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }

    if (hasWon) {
      const results = {
        winner: toUserIdString(currentPlayer.userId),
        ranking: [toUserIdString(currentPlayer.userId)],
      };
      return await this.completeGame(gameId, results);
    }

    // Use the latest game object returned by the last repository update in the transaction
    const updatedGame = await gameRepository.findById(gameId); // Transaction might have finished, fetch once for final state
    const formattedGame = this._formatGameResponse(updatedGame);

    const turnChanged = nextTurn !== playerIndex;

    gameEvents.emit(SERVER_EVENTS.TOKEN_MOVED, {
      gameId,
      userId: actionUserId,
      playerIndex,
      tokenIndex,
      diceValue,
      newPosition,
      killedOpponent,
    });

    if (turnChanged) {
      gameEvents.emit(SERVER_EVENTS.TURN_CHANGED, {
        gameId,
        userId: actionUserId,
        currentTurn: nextTurn,
      });

      // Schedule timeout for the NEXT player
      await this._scheduleTurnTimeout(gameId, TURN_TIMEOUT / 1000);
    } else if (isBot) {
      // If it was a bot and turn didn't change (got 6), next bot move is already handled by bot automation logic
    } else {
      // It was a human, turn didn't change (got 6), they need to roll again
      await this._scheduleTurnTimeout(gameId, TURN_TIMEOUT / 1000);
    }

    gameEvents.emit(SERVER_EVENTS.GAME_STATE_SYNC, {
      gameId,
      game: formattedGame,
    });

    if (turnChanged || isBot) {
      this._triggerBotTurn(gameId).catch(err => logger.error('Bot recursion error:', err));
    }

    return formattedGame;
  }

  /**
   * Format game response

   * @private
   */
  _formatGameResponse(game) {
    const currentPlayer = game.players && game.players[game.currentTurn];
    const validMoves = (game.status === 'active' && game.diceValue > 0 && currentPlayer)
      ? this._getValidMoves(currentPlayer, game.diceValue)
      : [];

    return {
      _id: game._id,
      gameType: game.gameType,
      status: game.status,
      maxPlayers: game.maxPlayers,
      currentTurn: game.currentTurn,
      players: game.players.map((p, idx) => {
        const isPopulated = p.userId && typeof p.userId === 'object' && p.userId._id;
        return {
          position: idx,
          userId: toUserIdString(p.userId),
          name: isPopulated ? p.userId.name : 'Player',
          avatar: isPopulated ? p.userId.avatar : null,
          tokens: p.tokens,
          isHome: (p.isHome && p.isHome.length === 4) ? p.isHome : p.tokens.map(t => t.position === 57),
          consecutiveSixes: p.consecutiveSixes,
        };
      }),
      diceValue: game.diceValue || 0,
      validMoves: validMoves,
      turnVersion: game.currentTurnCount,
      moves: game.moves,
      startTime: game.startTime,
      endTime: game.endTime,
      results: game.results,
      entryFee: game.entryFee,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }

  // === Queue Worker Handlers ===

  async _triggerBotTurnInternal(gameId) {
    return await withRedisLock(gameId, async () => {
      const game = await gameRepository.findById(gameId);
      if (!game || game.status !== 'active' || game.isBotProcessing) {
        return;
      }

      // Check if current player is actually a bot
      const currentPlayerIndex = game.currentTurn;
      const player = game.players[currentPlayerIndex];
      if (!player || !player.isBot) {
        return;
      }

      try {
        // Set processing flag to prevent duplicate execution
        await gameRepository.update(gameId, { isBotProcessing: true });
        await this._botRollDice(gameId);
      } catch (error) {
        logger.error(`Error in bot turn execution for game ${gameId}:`, error);
      } finally {
        // Always reset flag even on error
        await gameRepository.update(gameId, { isBotProcessing: false });
      }
    });
  }

  async _handleTurnTimeoutInternal(gameId) {
    return await withRedisLock(gameId, async () => {
      const game = await gameRepository.findById(gameId);
      if (game && game.status === 'active') {
        await this._handleTurnTimeout(gameId, game);
      }
    });
  }

  async _handleAfkTimeoutInternal(gameId, userId) {
    return await withRedisLock(gameId, async () => {
      const game = await gameRepository.findById(gameId);
      if (!game || game.status !== 'active') return;

      const p = game.players.find(p => toUserIdString(p.userId) === userId);
      if (p && !p.isActive) {
        logger.info(`Auto-surrendering game ${gameId} for AFK user ${userId}`);
        await this.surrenderGame(gameId, userId);
      }
    });
  }

  /**
   * Schedule turn timeout job in BullMQ
   * @private
   */
  async _scheduleTurnTimeout(gameId, seconds) {
    try {
      const config = require('../config/env');
      if (config.isDevelopment) {
        if (!this.activeTimeouts) {
          this.activeTimeouts = new Map();
        }
        if (this.activeTimeouts.has(gameId)) {
          clearTimeout(this.activeTimeouts.get(gameId));
        }

        logger.debug(`[Dev Mode] Scheduling in-memory turn timeout for game ${gameId} in ${seconds}s`);
        const timeout = setTimeout(async () => {
          try {
            this.activeTimeouts.delete(gameId);
            await this._handleTurnTimeoutInternal(gameId);
          } catch (err) {
            logger.error('[Dev Mode] Error handling in-memory turn timeout:', err);
          }
        }, seconds * 1000);

        this.activeTimeouts.set(gameId, timeout);
        return;
      }

      const jobId = `timeout-${gameId}`;
      // Remove existing timeout for this game if any
      await gameQueue.remove(jobId).catch(() => {});
      
      // Add new delayed job
      await gameQueue.add(
        'turn-timeout',
        { gameId },
        { delay: seconds * 1000, jobId }
      );
      
      logger.debug(`Scheduled turn timeout for game ${gameId} in ${seconds}s`);
    } catch (error) {
      logger.error(`Error scheduling turn timeout for game ${gameId}:`, error);
    }
  }

  /**
   * Handle auto skip turn when a player has no valid moves
   * @private
   */
  _handleNoValidMovesAutoSkip(gameId, userId, turnVersion) {
    setTimeout(async () => {
      try {
        await withRedisLock(gameId, async () => {
          let game = await gameRepository.findById(gameId);
          if (!game || game.status !== 'active') return;
          if (game.currentTurnCount !== turnVersion) return; // Stale state

          const playerIndex = game.currentTurn;
          const currentPlayer = game.players[playerIndex];
          if (toUserIdString(currentPlayer.userId) !== userId) return;

          // Reset consecutive sixes and move to next player
          currentPlayer.consecutiveSixes = 0;
          await gameRepository.updatePlayerBoard(gameId, playerIndex, {
            tokens: currentPlayer.tokens,
            isHome: currentPlayer.isHome,
            consecutiveSixes: currentPlayer.consecutiveSixes,
          });

          const nextTurn = (playerIndex + 1) % game.players.length;
          await gameRepository.update(gameId, { diceValue: 0 });
          await gameRepository.updateCurrentTurn(gameId, nextTurn);

          const moveData = {
            playerIndex,
            userId,
            action: 'skip_turn',
            timestamp: new Date(),
          };

          const updatedGame = await gameRepository.addMove(gameId, moveData);
          const formattedGame = this._formatGameResponse(updatedGame);

          // Schedule turn timeout for the next player
          await this._scheduleTurnTimeout(gameId, TURN_TIMEOUT / 1000);

          // Trigger bot turn if next player is a bot
          this._triggerBotTurn(gameId).catch(err => logger.error('Bot recursion error:', err));

          gameEvents.emit(SERVER_EVENTS.TURN_CHANGED, {
            gameId,
            userId,
            currentTurn: nextTurn,
            action: 'skip_turn',
            game: formattedGame,
          });

          gameEvents.emit(SERVER_EVENTS.GAME_STATE_SYNC, {
            gameId,
            game: formattedGame,
          });

          logger.info(`Auto-skipped turn for user ${userId} in game ${gameId} due to no valid moves`);
        });
      } catch (err) {
        logger.error('Error in auto-skip no valid moves:', err);
      }
    }, 1500); // 1.5 seconds delay for animation
  }
}

module.exports = new GameService();

