const { sequelize } = require('../config/db');
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
const { GAME_MODE_LIMITS, GAME_STATUS, SAFE_ZONES } = require('../constants/game.constants');
const logger = require('../utils/logger');
const { withRedisLock } = require('../utils/redisLock');
const { gameQueue } = require('../queues/gameQueue');
const ProbabilityConfig = require('../models/probabilityConfig.model');
const Game = require('../models/game.model');

// Game constants
const BOARD_SIZE = 52;
const HOME_ENTRY_START = 50;
const HOME_ENTRY_END = 56; // 50-56 for final home run
const MAX_DICE_VALUE = 6;
const TURN_TIMEOUT = 20000; // 20 seconds
const DISCONNECT_TIMEOUT = 30000; // 30 seconds

function toUserIdString(ref) {
  if (ref == null) return null;
  if (typeof ref === 'string') return ref;
  if (ref.id) return ref.id.toString();
  if (ref._id) return ref._id.toString();
  return ref.toString();
}

function scheduleNewGameNotifications(game) {
  setImmediate(async () => {
    try {
      const gId = game.gameId || game.id;
      for (const p of game.players) {
        const uid = toUserIdString(p.userId);
        if (!uid) continue;
        const u = await userRepository.findById(uid);
        if (u && !u.isBot) {
          await notificationService.notifyGameStarted(uid, { gameId: gId });
        }
      }
      const first = game.players[game.currentTurn];
      if (!first) return;
      const fid = toUserIdString(first.userId);
      const fu = await userRepository.findById(fid);
      if (fu && !fu.isBot) {
        await notificationService.notifyYourTurn(fid, { gameId: gId });
      }
    } catch (err) {
      logger.error('Error sending game start notifications:', err);
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
  async createPracticeGame(userId, maxPlayers = 4, preferredColor = 'red') {
    try {
      // Ensure bots exist in database
      await ensureBotsExist();

      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      const colorMap = { red: 0, green: 1, yellow: 2, blue: 3 };
      const userPos = colorMap[preferredColor] ?? 0;

      // Start with real player
      const players = [
        {
          userId,
          position: userPos,
          playerColor: preferredColor,
          preferredColor,
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
        let botIndex = 0;
        for (let i = 0; i < 4; i++) {
          if (i === userPos) continue;
          if (botIndex < bots.length) {
            players.push(createBotPlayerObject(bots[botIndex], i));
            botIndex++;
          }
        }
      }

      const gameData = {
        gameType: 'practice',
        status: GAME_STATUS.ACTIVE, // Start immediately with bots
        maxPlayers: Math.max(players.length, Math.min(maxPlayers ?? GAME_MODE_LIMITS.PRACTICE, GAME_MODE_LIMITS.PRACTICE)),
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
      const gId = game.gameId || game.id;
      logger.info(`Practice game created with ${players.length} players: ${gId}`);
      
      // Trigger bot turn if first player is bot
      if (game.players.length > 0) {
        this._scheduleTurnTimeout(gId.toString(), TURN_TIMEOUT / 1000)
          .then(() => {
            setImmediate(() => this._triggerBotTurn(gId.toString()));
          })
          .catch(err => logger.error('Error in practice game startup scheduling:', err));
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
  async createCashGame(userId, entryFee, maxPlayers = 2, botDifficulty = 'medium', preferredColor = 'red') {
    try {
      // Ensure bots exist in database
      await ensureBotsExist();

      // If botDifficulty is already forced to 'hard' by the controller or matchmakingService 
      // (e.g. threshold exceeded), we respect it. Otherwise, we check first match and probability manager.
      if (botDifficulty !== 'hard') {
        let isFirstMatch = false;
        try {
          const user = await userRepository.findById(userId);
          if (user && (user.totalGames || 0) === 0) {
            isFirstMatch = true;
          }
        } catch (err) {
          logger.error('Error checking first match in gameService:', err);
        }

        if (isFirstMatch) {
          botDifficulty = 'easy';
        } else {
          // Probability Manager
          try {
            const ProbabilityConfig = require('../models/probabilityConfig.model');
            const config = await ProbabilityConfig.findOne();
            if (config && config.enabled) {
              const activeGames = await Game.find({
                status: { $in: ['active', 'ongoing'] },
                'players.isBot': true,
              }).select('_id betAmount createdAt players').lean();

              const prospective = {
                _id: 'prospective',
                gameId: 'prospective',
                betAmount: entryFee || 0,
                createdAt: new Date(),
                players: [],
              };
              const allGames = activeGames.concat([prospective]);

              allGames.sort((a, b) => {
                const betA = a.betAmount || 0;
                const betB = b.betAmount || 0;
                if (betA !== betB) return betA - betB;
                const timeA = new Date(a.createdAt).getTime();
                const timeB = new Date(b.createdAt).getTime();
                if (timeA !== timeB) return timeA - timeB;
                return String(a.gameId || a.id).localeCompare(String(b.gameId || b.id));
              });

              const total = allGames.length;
              let easyCount = 0;
              if (config.winProbability === 100) easyCount = total;
              else if (config.winProbability === 0) easyCount = 0;
              else easyCount = Math.floor((total * config.winProbability) / 100);

              const index = allGames.findIndex(g => String(g.gameId || g.id) === 'prospective');
              if (index >= 0) {
                botDifficulty = index < easyCount ? 'easy' : 'hard';
              }
            }
          } catch (e) {
            logger.warn('Probability Manager check failed at game creation:', e.message);
          }
        }
      }

      const gameId = crypto.randomBytes(8).toString('hex');

      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      // Deduct entry fee from user's wallet
      await walletService.processGameEntry(userId, entryFee, gameId);

      const colorMap = { red: 0, green: 1, yellow: 2, blue: 3 };
      const userPos = colorMap[preferredColor] ?? 0;
      const botPos = (userPos + 2) % 4; // Diagonally opposite

      // Start with real player
      const players = [
        {
          userId,
          position: userPos,
          playerColor: preferredColor,
          preferredColor,
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
        players.push(createBotPlayerObject(bots[0], botPos, botDifficulty));
      }

      const gameData = {
        gameId,
        gameType: 'cash',
        type: 'cash',
        entryFee,
        betAmount: entryFee, // Game model uses betAmount field
        status: GAME_STATUS.ACTIVE, // Start immediately with bot
        maxPlayers: Math.max(players.length, Math.min(maxPlayers ?? GAME_MODE_LIMITS.CASH, GAME_MODE_LIMITS.CASH)),
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
      const gId = game.gameId || game.id;
      logger.info(`Cash game created with ${players.length} players and entry fee ${entryFee}: ${gId}`);
      
      // Trigger bot turn if first player is bot
      if (game.players.length > 0) {
        this._scheduleTurnTimeout(gId.toString(), TURN_TIMEOUT / 1000)
          .then(() => {
            setImmediate(() => this._triggerBotTurn(gId.toString()));
          })
          .catch(err => logger.error('Error in cash game startup scheduling:', err));
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

      if (game.status !== GAME_STATUS.PENDING) {
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
        await walletService.processGameEntry(userId, game.betAmount || game.entryFee || 0, gameId);
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

      const resolvedGame = await this._handleTurnTimeout(game.gameId || game.id, game);
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

        if (game.status !== GAME_STATUS.ACTIVE) {
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

        if (game.status !== GAME_STATUS.ACTIVE) {
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
        if (!game || game.status !== GAME_STATUS.ACTIVE) {
          throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found or already ended');
        }

        const playerIndex = game.players.findIndex(
          p => toUserIdString(p.userId) === String(userId)
        );

        if (playerIndex === -1) {
          throw new ApiError(HTTP_STATUS.FORBIDDEN, 'User not in this game');
        }

        // Find the other player (winner)
        const otherPlayer = game.players.find((p, idx) => idx !== playerIndex);
        const winnerId = otherPlayer ? toUserIdString(otherPlayer.userId) : null;

        const results = {
          surrenderedBy: userId,
          status: 'surrendered',
          winner: winnerId
        };

        // Complete the game instead of just marking as surrendered to ensure proper rewards/penalties
        return await this.completeGame(gameId, results);
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
    const isExternalTx = !!options.transaction;
    const t = options.transaction || await sequelize.transaction();

    let formattedGame;

    const executeLogic = async (transaction) => {
      const opts = { transaction };
      const game = await gameRepository.findById(gameId);
      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      const winnerStr = toUserIdString(results.winner);
      const entryFee = game.betAmount || game.entryFee || 0;
      const numPlayers = game.players.length;
      const n = game.players.length;
      const winIdx = game.players.findIndex((p) => toUserIdString(p.userId) === winnerStr);

      const playersLean = game.players.map(p => {
        return typeof p.toObject === 'function' ? p.toObject() : { ...p };
      });

      playersLean.forEach((p, idx) => {
        p.placement = winIdx >= 0 ? ((idx - winIdx + n) % n) + 1 : idx + 1;
      });

      results.players = playersLean;
      results.winner = winnerStr;

      await gameRepository.completeGame(gameId, results, opts);

      // REWARD FORMULA:
      // Winner gets their own entry fee back + 90% of opponent's entry fee
      const opponentCount = Math.max(0, numPlayers - 1);
      const rewardAmount =
        game.gameType === 'cash' && winnerStr && entryFee > 0
          ? entryFee + Math.floor(entryFee * 0.9 * opponentCount)
          : 0;

      const startedAt = game.startTime || game.createdAt || new Date();
      const durationMs = Math.max(0, Date.now() - new Date(startedAt).getTime());
      const totalMoves = Array.isArray(game.moves) ? game.moves.length : 0;

      const playerIds = game.players.map((p) => toUserIdString(p.userId));
      const isBotMap = await userRepository.getIsBotMapByIds(playerIds);

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
          userId: parseInt(uid, 10) || uid,
          isBot,
          playerColor,
          placement,
          coinsWon,
          coinsLost,
        };
      });

      try {
        await matchHistoryRepository.create({
          gameId: game.gameId || String(game.id),
          gameType: game.gameType,
          betAmount: entryFee,
          duration: durationMs,
          totalMoves,
          participants,
          winnerId: winnerStr ? (parseInt(winnerStr, 10) || null) : null,
          startedAt: new Date(startedAt),
          endedAt: new Date(),
        }, opts);
      } catch (error) {
        logger.error('Error recording match history:', error);
      }

      // Distribute rewards and unlock wallets for cash games
      if (game.gameType === 'cash') {
        for (const player of game.players) {
          try {
            const uid = toUserIdString(player.userId);
            const isBot = !!(isBotMap[uid] && isBotMap[uid].isBot);
            if (isBot) continue;

            const isWinner = uid === winnerStr;

            if (isWinner) {
              await walletService.processGameReward(uid, rewardAmount, gameId, opts);
              logger.info(`[completeGame] Winner ${uid} credited ${rewardAmount} coins (entry: ${entryFee}) for game ${gameId}`);
            } else {
              const walletRepository = require('../repositories/walletRepository');
              await walletRepository.unlockWallet(uid, opts);
              logger.info(`[completeGame] Loser ${uid} wallet unlocked for game ${gameId}`);
            }
          } catch (error) {
            logger.error(`Error processing reward/unlock for user ${player.userId}:`, error);
          }
        }
      } else {
        // For practice / other game types — always unlock wallets so stale locks never accumulate
        const walletRepository = require('../repositories/walletRepository');
        for (const player of game.players) {
          try {
            const uid = toUserIdString(player.userId);
            const isBot = !!(isBotMap[uid] && isBotMap[uid].isBot);
            if (isBot) continue;
            await walletRepository.unlockWallet(uid, opts);
            logger.info(`[completeGame] Player ${uid} wallet unlocked (non-cash) for game ${gameId}`);
          } catch (error) {
            logger.error(`Error unlocking wallet for user ${player.userId}:`, error);
          }
        }
      }


      for (const player of game.players) {
        try {
          const uid = toUserIdString(player.userId);
          const isBot = !!(isBotMap[uid] && isBotMap[uid].isBot);
          if (isBot) continue;

          const isWinner = uid === winnerStr;
          const idx = game.players.indexOf(player);
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
          }, opts);
        } catch (error) {
          logger.error('Error updating user stats:', error);
        }
      }
      
      const updatedGame = await gameRepository.findById(gameId);
      formattedGame = this._formatGameResponse(updatedGame);
    };

    try {
      if (isExternalTx) {
        await executeLogic(t);
      } else {
        await sequelize.transaction(async (txn) => {
          await executeLogic(txn);
        });
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error completing game:', error);
      throw error;
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
        p => toUserIdString(p.userId) === String(userId)
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
      if (!game || game.status !== GAME_STATUS.ACTIVE) {
        return;
      }

      const playerIndex = game.players.findIndex(
        p => toUserIdString(p.userId) === String(userId)
      );

      if (playerIndex === -1) {
        return;
      }

      const gId = game.gameId || game.id;
      await gameRepository.updatePlayerBoard(gId, playerIndex, {
        disconnectedAt: new Date(),
        isActive: false,
      });

      gameEvents.emit(SERVER_EVENTS.PLAYER_DISCONNECTED, {
        gameId: gId,
        userId,
      });

      logger.info(`User ${userId} disconnected from game ${gId}. Waiting 10 seconds for reconnection before auto-surrendering.`);

      // Wait 10 seconds before checking if they reconnected
      setTimeout(async () => {
        try {
          const checkGame = await gameRepository.findById(gId);
          // If the game is still active, verify if the player has reconnected
          if (checkGame && checkGame.status === GAME_STATUS.ACTIVE) {
            const player = checkGame.players.find(
              p => toUserIdString(p.userId) === String(userId)
            );
            if (player && !player.isActive) {
              logger.info(`User ${userId} did not reconnect within 10 seconds. Auto-surrendering now.`);
              await this.surrenderGame(checkGame.gameId || checkGame.id, userId);
            } else {
              logger.info(`User ${userId} reconnected within 10 seconds. Skipping auto-surrender.`);
            }
          }
        } catch (err) {
          logger.error('Error in deferred handleDisconnect check:', err);
        }
      }, 10000);
    } catch (error) {
      logger.error('Error handling disconnect:', error);
    }
  }

  /**
   * Mark player as active (on socket connect/reconnect)
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID
   */
  async markPlayerActive(gameId, userId) {
    try {
      const game = await gameRepository.findById(gameId);
      if (!game) return;

      const playerIndex = game.players.findIndex(
        p => toUserIdString(p.userId) === String(userId)
      );

      if (playerIndex !== -1) {
        await gameRepository.updatePlayerBoard(gameId, playerIndex, {
          isActive: true,
          disconnectedAt: null
        });
        logger.info(`User ${userId} marked active in game ${gameId}`);
      }
    } catch (error) {
      logger.error('Error marking player active:', error);
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
    if (!game || game.status !== GAME_STATUS.ACTIVE || !game.updatedAt) {
      return game;
    }
 
    const turnStartedAt = game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : 0;
    if (!turnStartedAt || Date.now() - turnStartedAt < TURN_TIMEOUT) {
      return game;
    }
 
    const playerIndex = game.currentTurn;
    const currentPlayer = game.players[playerIndex];
    
    // Increment missed turns
    const missedTurns = (currentPlayer.missedTurns || 0) + 1;
    
    if (missedTurns >= 5 && currentPlayer.userId) {
      const userIdStr = toUserIdString(currentPlayer.userId);
      logger.info(`Player ${userIdStr} missed 5 turns in game ${gameId}. Auto-surrendering.`);
      
      const otherPlayer = game.players.find((p, idx) => idx !== playerIndex);
      const winnerId = otherPlayer ? toUserIdString(otherPlayer.userId) : null;
      
      const results = {
        surrenderedBy: userIdStr,
        status: 'surrendered',
        reason: 'missed_5_turns',
        winner: winnerId
      };
      
      await gameRepository.updatePlayerBoard(gameId, playerIndex, {
        missedTurns,
        isActive: false
      });
      
      return await this.completeGame(gameId, results);
    }

    let diceValue = game.diceValue || 0;

    if (diceValue === 0) {
      diceValue = crypto.randomInt(1, 7);
      if (currentPlayer && currentPlayer.consecutiveSixes >= 2 && diceValue === 6) {
        diceValue = crypto.randomInt(1, 6);
      }
      
      const validMoves = this._getValidMoves(currentPlayer, diceValue);
      const actionUserId = currentPlayer.userId ? toUserIdString(currentPlayer.userId) : null;
      
      const moveData = {
        playerIndex,
        userId: actionUserId,
        action: 'roll_dice',
        diceValue,
        isBot: false,
        consecutiveSixes: (currentPlayer ? currentPlayer.consecutiveSixes : 0) + (diceValue === 6 ? 1 : 0),
        timeoutMs: TURN_TIMEOUT,
      };

      await gameRepository.update(gameId, { diceValue });
      await gameRepository.addMove(gameId, moveData);
      
      gameEvents.emit(SERVER_EVENTS.DICE_ROLLED, {
        gameId,
        userId: actionUserId,
        diceValue,
        playerIndex,
        consecutiveSixes: moveData.consecutiveSixes,
        validMoves,
      });
      
      game.diceValue = diceValue;
    }

    const validMoves = this._getValidMoves(currentPlayer, diceValue);
    const actionUserId = currentPlayer.userId ? toUserIdString(currentPlayer.userId) : null;
    
    // Save missed turns before doing moves
    currentPlayer.missedTurns = missedTurns;
    await gameRepository.updatePlayerBoard(gameId, playerIndex, { missedTurns });
    
    if (validMoves.length > 0) {
      const tokenIndex = validMoves[crypto.randomInt(0, validMoves.length)];
      await this._applyMove(gameId, game, playerIndex, tokenIndex, diceValue, actionUserId, false);
    } else {
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

      await this._scheduleTurnTimeout(gameId, TURN_TIMEOUT / 1000);

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
    }
    
    const finalGame = await gameRepository.findById(gameId);
    return finalGame;
  }

  /**
   * Check if token landed on opponent and kill them
   * @private
   */
  _checkKill(game, playerIndex, newPosition) {
    if (newPosition < 0 || newPosition > 50) {
      return null; // Safe zones or home lane
    }

    const currentPlayer = game.players[playerIndex];
    const currentBoardPos = currentPlayer.position !== undefined ? currentPlayer.position : playerIndex;
    const newGlobalPos = (newPosition + currentBoardPos * 13 + 1) % 52;
    if (SAFE_ZONES.includes(newGlobalPos)) {
      return null;
    }

    for (let i = 0; i < game.players.length; i++) {
      if (i === playerIndex) continue;

      const opponentPlayer = game.players[i];
      const oppBoardPos = opponentPlayer.position !== undefined ? opponentPlayer.position : i;
      const killedTokenIndex = opponentPlayer.tokens.findIndex(t => {
        if (t.position < 0 || t.position > 50) return false;
        const oppGlobalPos = this._getGlobalBoardPosition(t.position, oppBoardPos);
        return oppGlobalPos === newGlobalPos;
      });

      if (killedTokenIndex !== -1) {
        return { playerIndex: i, tokenIndex: killedTokenIndex };
      }
    }

    return null;
  }

  /**
   * Convert a player-relative main-track position into a shared board position.
   * @private
   */
  _getGlobalBoardPosition(position, boardPos) {
    if (position < 0 || position > 50) {
      return null;
    }

    return (position + boardPos * 13 + 1) % 52;
  }

  /**
   * Check if position is a safe zone
   * @private
   */
  _isSafeZone(localPos, boardPos) {
    const globalPos = this._getGlobalBoardPosition(localPos, boardPos);
    return globalPos !== null && SAFE_ZONES.includes(globalPos);
  }

  /**
   * Check if bot has kill opportunity in next N turns (look ahead)
   * @private
   */
  _hasKillOpportunityAhead(botPlayer, humanPlayer, game, botIndex, turnsAhead) {
    if (!botPlayer || !humanPlayer) return false;

    // Check current positions for all possible dice rolls (1-6)
    for (let diceVal = 1; diceVal <= 6; diceVal++) {
      for (let tokenIdx = 0; tokenIdx < 4; tokenIdx++) {
        const token = botPlayer.tokens[tokenIdx];
        if (token.position >= 0 && token.position < 52) {
          const newPos = token.position + diceVal;
          if (newPos < 52 && newPos <= 56) {
            const boardPos = botPlayer.position !== undefined ? botPlayer.position : botIndex;
            
            // Check if this move would be a safe zone
            if (this._isSafeZone(newPos, boardPos)) continue;
            
            // Check if opponent can be killed at this position
            for (let oppIdx = 0; oppIdx < 4; oppIdx++) {
              if (oppIdx === botIndex) continue;
              const oppPlayer = game.players[oppIdx];
              if (!oppPlayer) continue;
              
              for (let oppTokenIdx = 0; oppTokenIdx < 4; oppTokenIdx++) {
                const oppToken = oppPlayer.tokens[oppTokenIdx];
                // Opponent token at same position and not in safe zone
                if (oppToken.position === newPos) {
                  const oppBoardPos = oppPlayer.position !== undefined ? oppPlayer.position : oppIdx;
                  if (!this._isSafeZone(oppToken.position, oppBoardPos)) {
                    return true; // Kill opportunity found!
                  }
                }
              }
            }
          }
        }
      }
    }

    return false; // No kill opportunity
  }

  /**
   * Get rigged dice value for hard mode bot
   * @private
   */
  _getRiggedDiceValue(game, playerIndex, isBotRoll) {
    let diceValue = this._calculateRiggedDiceValue(game, playerIndex, isBotRoll);
    
    // Prevent 3 consecutive 6s
    const player = game.players[playerIndex];
    if (player && player.consecutiveSixes >= 2 && diceValue === 6) {
      diceValue = crypto.randomInt(1, 6); // 1 to 5
    }
    
    return diceValue;
  }

  _calculateRiggedDiceValue(game, playerIndex, isBotRoll) {
    let diceValue = crypto.randomInt(1, 7);
    try {
      let botPlayers = [];
      let humanPlayer = null;
      for (let i = 0; i < game.players.length; i++) {
        const p = game.players[i];
        if (p.isBot) botPlayers.push(p);
        else humanPlayer = p;
      }

      if (!humanPlayer) return diceValue;

      // Determine difficulty from bot players (fallback to 'easy')
      let botDifficulty = 'easy';
      if (botPlayers.some(b => b.botDifficulty === 'hard')) {
        botDifficulty = 'hard';
      } else if (botPlayers.some(b => b.botDifficulty === 'medium')) {
        botDifficulty = 'medium';
      }

      // 1. Medium Mode: Completely Fair
      if (botDifficulty === 'medium') {
        return diceValue;
      }

      // 2. Easy Mode: In favor of user (75% win rate target)
      if (botDifficulty === 'easy') {
        if (!isBotRoll) {
          // Helper: 25% chance to roll a 6 to spawn a token if user has none on the board
          let activeTokens = 0;
          let hasTokensInBase = false;
          for (let i = 0; i < 4; i++) {
            if (humanPlayer.tokens[i].position === -1) hasTokensInBase = true;
            else if (humanPlayer.tokens[i].position >= 0 && humanPlayer.tokens[i].position < 56) activeTokens++;
          }
          if (activeTokens === 0 && hasTokensInBase) {
            if (crypto.randomInt(0, 100) < 25) {
              return 6;
            }
          }

          // Helper: 35% chance to get exact required roll to kill any bot token
          let requiredKillRoll = null;
          const humanBoardPos = humanPlayer.position !== undefined ? humanPlayer.position : playerIndex;
          for (let d = 1; d <= 6; d++) {
            for (let i = 0; i < 4; i++) {
              const token = humanPlayer.tokens[i];
              if (token.position >= 0 && token.position < 52) {
                const newPos = token.position + d;
                if (newPos < 52 && !this._isSafeZone(newPos, humanBoardPos)) {
                  const newGlobalPos = this._getGlobalBoardPosition(newPos, humanBoardPos);
                  for (const bot of botPlayers) {
                    const botBoardPos = bot.position !== undefined ? bot.position : game.players.indexOf(bot);
                    for (const botToken of bot.tokens) {
                      if (botToken.position >= 0 && botToken.position <= 50) {
                        const botGlobalPos = this._getGlobalBoardPosition(botToken.position, botBoardPos);
                        if (botGlobalPos === newGlobalPos) {
                          requiredKillRoll = d;
                          break;
                        }
                      }
                    }
                    if (requiredKillRoll) break;
                  }
                }
              }
              if (requiredKillRoll) break;
            }
            if (requiredKillRoll) break;
          }

          if (requiredKillRoll && crypto.randomInt(0, 100) < 35) {
            return requiredKillRoll;
          }

          return diceValue;
        } else {
          // Bot rolls: 50% chance to avoid a roll that would kill a human token
          const botPlayer = game.players[playerIndex];
          if (!botPlayer) return diceValue;

          const botBoardPos = botPlayer.position !== undefined ? botPlayer.position : playerIndex;
          let wouldKill = false;

          for (let i = 0; i < 4; i++) {
            const token = botPlayer.tokens[i];
            if (token.position >= 0 && token.position < 52) {
              const newPos = token.position + diceValue;
              if (newPos < 52 && !this._isSafeZone(newPos, botBoardPos)) {
                const newGlobalPos = this._getGlobalBoardPosition(newPos, botBoardPos);
                const humanBoardPos = humanPlayer.position !== undefined ? humanPlayer.position : game.players.indexOf(humanPlayer);
                for (const humanToken of humanPlayer.tokens) {
                  if (humanToken.position >= 0 && humanToken.position <= 50) {
                    const humanGlobalPos = this._getGlobalBoardPosition(humanToken.position, humanBoardPos);
                    if (humanGlobalPos === newGlobalPos) {
                      wouldKill = true;
                      break;
                    }
                  }
                }
              }
            }
            if (wouldKill) break;
          }

          if (wouldKill && crypto.randomInt(0, 100) < 50) {
            let safeRolls = [];
            for (let d = 1; d <= 6; d++) {
              let killsOpponent = false;
              for (let i = 0; i < 4; i++) {
                const token = botPlayer.tokens[i];
                if (token.position >= 0 && token.position < 52) {
                  const newPos = token.position + d;
                  if (newPos < 52 && !this._isSafeZone(newPos, botBoardPos)) {
                    const newGlobalPos = this._getGlobalBoardPosition(newPos, botBoardPos);
                    const humanBoardPos = humanPlayer.position !== undefined ? humanPlayer.position : game.players.indexOf(humanPlayer);
                    for (const humanToken of humanPlayer.tokens) {
                      if (humanToken.position >= 0 && humanToken.position <= 50) {
                        const humanGlobalPos = this._getGlobalBoardPosition(humanToken.position, humanBoardPos);
                        if (humanGlobalPos === newGlobalPos) {
                          killsOpponent = true;
                          break;
                        }
                      }
                    }
                  }
                }
              }
              if (!killsOpponent) {
                safeRolls.push(d);
              }
            }
            if (safeRolls.length > 0) {
              diceValue = safeRolls[crypto.randomInt(0, safeRolls.length)];
            }
          }

          return diceValue;
        }
      }

      // 3. Hard Mode: Rigged against human (same logic as before)
      if (botDifficulty === 'hard') {
        const humanCompleted = humanPlayer.tokens.filter((t, i) => Number(t.position) === 56 || humanPlayer.isHome[i]).length;
        const isUserWinning = humanCompleted >= 2;

        if (!isBotRoll) {
          // Anti-required move for human's last token to enter home
          if (humanCompleted === 3) {
            let requiredValueToWin = null;
            for (let i = 0; i < 4; i++) {
              if (!humanPlayer.isHome[i] && humanPlayer.tokens[i].position >= 50 && humanPlayer.tokens[i].position < 56) {
                requiredValueToWin = 56 - humanPlayer.tokens[i].position;
                break;
              }
            }
            if (requiredValueToWin) {
              let allowed = [];
              for (let v = 1; v <= 6; v++) {
                if (v === requiredValueToWin) continue;
                if (v < requiredValueToWin) allowed.push(v);
              }
              if (allowed.length === 0) {
                for (let v = 1; v <= 6; v++) if (v !== requiredValueToWin) allowed.push(v);
              }

              const prefersSmaller = requiredValueToWin > 1;
              const isCurrentAllowed = prefersSmaller ? (diceValue < requiredValueToWin) : (diceValue !== requiredValueToWin);

              if (!isCurrentAllowed) {
                diceValue = allowed[crypto.randomInt(0, allowed.length)];
              }
            }
          }
          return diceValue;
        } else {
          const botPlayer = game.players[playerIndex];
          if (!botPlayer) return diceValue;

          // 30% chance to get exact required move to enter home if near home
          if (crypto.randomInt(0, 100) < 30) {
            for (let i = 0; i < 4; i++) {
              const token = botPlayer.tokens[i];
              if (!botPlayer.isHome[i] && token.position >= 50 && token.position < 56) {
                const requiredHomeRoll = 56 - token.position;
                if (requiredHomeRoll >= 1 && requiredHomeRoll <= 6) {
                  return requiredHomeRoll;
                }
              }
            }
          }

          // SMART RIGGING: Only give kill value if kill opportunity exists in next 2-3 turns
          let requiredValue = null;
          const hasKillOpportunity = this._hasKillOpportunityAhead(botPlayer, humanPlayer, game, playerIndex, 2);

          if (hasKillOpportunity) {
            for (let d = 1; d <= 6; d++) {
              for (let i = 0; i < 4; i++) {
                const token = botPlayer.tokens[i];
                if (token.position >= 0 && token.position < 52) {
                  const newPos = token.position + d;
                  const boardPos = botPlayer.position !== undefined ? botPlayer.position : playerIndex;
                  if (newPos < 52 && !this._isSafeZone(newPos, boardPos)) {
                    const killed = this._checkKill(game, playerIndex, newPos);
                    if (killed) { requiredValue = d; break; }
                  }
                }
              }
              if (requiredValue) break;
            }
          }

          if (requiredValue && crypto.randomInt(0, 100) < 30) {
            diceValue = requiredValue;
          } else if (isUserWinning) {
            if (crypto.randomInt(0, 100) < 66) {
              const highValues = [4, 5, 6, 6, 6];
              diceValue = highValues[crypto.randomInt(0, highValues.length)];
            } else {
              diceValue = crypto.randomInt(1, 7);
            }
          } else {
            diceValue = crypto.randomInt(1, 7);
          }
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
      } else if (token.position >= 0 && token.position + diceValue <= 56 && !player.isHome?.[i] && token.position !== 56) {
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
      if (!game || game.status !== GAME_STATUS.ACTIVE) {
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
      if (!game || game.status !== GAME_STATUS.ACTIVE) {
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
      if (!game || game.status !== GAME_STATUS.ACTIVE) {
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
      if (!game || game.status !== GAME_STATUS.ACTIVE) {
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
    const oldPosition = token.position;

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
      if (newPosition > 56) {
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
        if (newPosition === 56) currentPlayer.isHome[tokenIndex] = true;
      }
    } else {
      currentPlayer.consecutiveSixes = 0;
      nextTurn = (playerIndex + 1) % gameClone.players.length;
      token.position = newPosition;
      moveData.newPosition = newPosition;
      if (newPosition === 56) currentPlayer.isHome[tokenIndex] = true;
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

    // Grant extra turn if token reached the Home goal (56)
    if (moveData.action === 'move_token') {
      if (newPosition === 56) {
        nextTurn = playerIndex;
      }
    }

    // Check for win using the clone: tokens must be at position 56
    const hasWon = currentPlayer.tokens.every(t => Number(t.position) === 56) || currentPlayer.isHome.every(h => h === true);
    
    logger.info(`Checking win for player ${playerIndex}: hasWon=${hasWon}, tokens=${JSON.stringify(currentPlayer.tokens)}, isHome=${JSON.stringify(currentPlayer.isHome)}`);


    const executeApplyMoveLogic = async (transaction) => {
      const opts = { transaction };

      if (killedOpponent) {
        const victim = gameClone.players[killedOpponent.playerIndex];
        await gameRepository.updatePlayerBoard(gameId, killedOpponent.playerIndex, {
          tokens: victim.tokens,
          isHome: victim.isHome,
          consecutiveSixes: victim.consecutiveSixes,
        }, opts);
      }

      if (!hasWon) {
        if (nextTurn !== playerIndex) {
          await gameRepository.updateCurrentTurn(gameId, nextTurn, opts);
        } else {
          // Human player gets an extra turn (rolled a 6, got a kill, or reached home 57).
          // We increment currentTurnCount and reset turnStartedAt to refresh the turn version and timer.
          await gameRepository.update(gameId, {
            currentTurnCount: sequelize.literal('currentTurnCount + 1'),
            turnStartedAt: new Date()
          }, opts);
        }
      }

      await gameRepository.updatePlayerBoard(gameId, playerIndex, {
        tokens: currentPlayer.tokens,
        isHome: currentPlayer.isHome,
        consecutiveSixes: currentPlayer.consecutiveSixes,
      }, opts);

      await gameRepository.addMove(gameId, moveData, opts);
      await gameRepository.update(gameId, { diceValue: 0 }, opts);
    };

    try {
      await sequelize.transaction(async (t) => {
        await executeApplyMoveLogic(t);
      });
    } catch (error) {
      logger.error('Failed executing updates in _applyMove:', error);
      throw error;
    }

    gameEvents.emit(SERVER_EVENTS.TOKEN_MOVED, {
      gameId,
      userId: actionUserId,
      playerIndex,
      tokenIndex,
      diceValue,
      newPosition,
      killedOpponent,
    });

    if (hasWon) {
      const results = {
        winner: toUserIdString(currentPlayer.userId),
        ranking: [toUserIdString(currentPlayer.userId)],
      };
      
      const completedGame = await this.completeGame(gameId, results);
      
      // Also emit GAME_STATE_SYNC for absolute certainty that frontend catches it
      gameEvents.emit(SERVER_EVENTS.GAME_STATE_SYNC, {
        gameId,
        game: completedGame,
      });
      
      return completedGame;
    }

    const turnChanged = nextTurn !== playerIndex;

    const updatedGame = await gameRepository.findById(gameId);
    const formattedGame = this._formatGameResponse(updatedGame);

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
    const validMoves = (game.status === GAME_STATUS.ACTIVE && game.diceValue > 0 && currentPlayer)
      ? this._getValidMoves(currentPlayer, game.diceValue)
      : [];

    return {
      _id: game.gameId || game.id,
      gameType: game.gameType,
      status: game.status,
      maxPlayers: game.maxPlayers,
      currentTurn: game.currentTurn,
      players: game.players.map((p, idx) => {
        const isPopulated = p.userId && typeof p.userId === 'object' && (p.userId.id || p.userId._id);
        // Use playerName if set (for bots), otherwise use populated User name
        const playerName = p.playerName || (isPopulated ? p.userId.name : 'Player');
        return {
          position: p.position ?? idx,
          userId: toUserIdString(p.userId),
          name: playerName,
          avatar: isPopulated ? (p.userId.avatar || null) : null,
          preferredColor: p.preferredColor || 'red',
          tokens: p.tokens,
          isHome: (p.isHome && p.isHome.length === 4) ? p.isHome : p.tokens.map(t => t.position === 56),
          consecutiveSixes: p.consecutiveSixes,
          placement: p.placement !== undefined ? p.placement : null,
        };
      }),
      diceValue: game.diceValue || 0,
      validMoves: validMoves,
      turnVersion: game.currentTurnCount,
      winnerId: game.winner ? toUserIdString(game.winner) : (game.results?.winner || null),
      moves: game.moves,
      startTime: game.startTime,
      endTime: game.endTime,
      results: game.results,
      entryFee: game.betAmount || game.entryFee || 0,
      betAmount: game.betAmount || game.entryFee || 0,
      prizeAmount: game.gameType === 'cash' && (game.betAmount || game.entryFee) > 0
        ? (game.betAmount || game.entryFee) + Math.floor((game.betAmount || game.entryFee) * 0.9 * ((game.maxPlayers || (game.players ? game.players.length : 2)) - 1))
        : 0,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }

  // === Queue Worker Handlers ===

  async _triggerBotTurnInternal(gameId) {
    return await withRedisLock(gameId, async () => {
      const game = await gameRepository.findById(gameId);
      if (!game || game.status !== GAME_STATUS.ACTIVE || game.isBotProcessing) {
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
      if (game && game.status === GAME_STATUS.ACTIVE) {
        await this._handleTurnTimeout(gameId, game);
      }
    });
  }

  async _handleAfkTimeoutInternal(gameId, userId) {
    return await withRedisLock(gameId, async () => {
      const game = await gameRepository.findById(gameId);
      if (!game || game.status !== GAME_STATUS.ACTIVE) return;

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
          if (!game || game.status !== GAME_STATUS.ACTIVE) return;
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

