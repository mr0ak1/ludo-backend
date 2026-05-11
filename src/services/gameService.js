const gameRepository = require('../repositories/gameRepository');
const userRepository = require('../repositories/userRepository');
const walletService = require('./walletService');
const matchHistoryRepository = require('../repositories/matchHistoryRepository');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const { GAME_RULES } = require('../constants/rules.constants');
const logger = require('../utils/logger');

// Game constants
const BOARD_SIZE = 52;
const HOME_POSITIONS = [1, 9, 14, 22, 27, 35, 40, 48]; // Safe zones
const HOME_ENTRY_START = 50;
const HOME_ENTRY_END = 56; // 50-56 for final home run
const MAX_DICE_VALUE = 6;
const TURN_TIMEOUT = 20000; // 20 seconds

class GameService {
  /**
   * Create practice game
   * @param {String} userId - Creator user ID
   * @param {Number} maxPlayers - Maximum players
   * @returns {Promise<Object>} Created game
   */
  async createPracticeGame(userId, maxPlayers = 4) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      const gameData = {
        gameType: 'practice',
        status: 'waiting',
        maxPlayers,
        players: [
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
        ],
        currentTurn: 0,
        moves: [],
        startTime: null,
        endTime: null,
        results: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const game = await gameRepository.create(gameData);
      logger.info(`Practice game created: ${game._id}`);
      return game;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating practice game:', error);
      throw error;
    }
  }

  /**
   * Create cash game with entry fee
   * @param {String} userId - Creator user ID
   * @param {Number} entryFee - Entry fee amount
   * @param {Number} maxPlayers - Maximum players
   * @returns {Promise<Object>} Created game
   */
  async createCashGame(userId, entryFee, maxPlayers = 4) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      // Deduct entry fee from user's wallet
      await walletService.processGameEntry(userId, entryFee, null);

      const gameData = {
        gameType: 'cash',
        entryFee,
        status: 'waiting',
        maxPlayers,
        players: [
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
        ],
        currentTurn: 0,
        moves: [],
        startTime: new Date(),
        endTime: null,
        results: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const game = await gameRepository.create(gameData);
      logger.info(`Cash game created with entry fee ${entryFee}: ${game._id}`);
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
      const alreadyInGame = game.players.some(p => p.userId.toString() === userId);
      if (alreadyInGame) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Already in this game');
      }

      // For cash games, deduct entry fee
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

      return this._formatGameResponse(game);
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

      return this._formatGameResponse(game);
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
  async rollDice(gameId, userId) {
    try {
      const game = await gameRepository.findById(gameId);
      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      if (game.status !== 'ongoing') {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Game is not ongoing');
      }

      // Verify it's user's turn
      const currentPlayer = game.players[game.currentTurn];
      if (currentPlayer.userId.toString() !== userId) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Not your turn');
      }

      // Roll dice (1-6)
      const diceValue = Math.floor(Math.random() * 6) + 1;

      const moveData = {
        playerIndex: game.currentTurn,
        userId,
        action: 'roll_dice',
        diceValue,
        consecutiveSixes: currentPlayer.consecutiveSixes + (diceValue === 6 ? 1 : 0),
      };

      const updatedGame = await gameRepository.addMove(gameId, moveData);

      logger.info(`Dice rolled in game ${gameId}: ${diceValue}`);

      return {
        gameId,
        diceValue,
        playerIndex: game.currentTurn,
        consecutiveSixes: moveData.consecutiveSixes,
        validMoves: this._getValidMoves(currentPlayer, diceValue),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error rolling dice:', error);
      throw error;
    }
  }

  /**
   * Move token
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID
   * @param {Number} tokenIndex - Token index (0-3)
   * @param {Number} diceValue - Dice value
   * @returns {Promise<Object>} Updated game
   */
  async moveToken(gameId, userId, tokenIndex, diceValue) {
    try {
      const game = await gameRepository.findById(gameId);
      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      if (game.status !== 'ongoing') {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Game is not ongoing');
      }

      const playerIndex = game.currentTurn;
      const currentPlayer = game.players[playerIndex];

      // Verify it's user's turn
      if (currentPlayer.userId.toString() !== userId) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Not your turn');
      }

      // Validate token index
      if (tokenIndex < 0 || tokenIndex > 3) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid token index');
      }

      const token = currentPlayer.tokens[tokenIndex];

      // Check if token is unlocked (position >= 0)
      if (token.position < 0) {
        // Token needs dice value 6 to unlock
        if (diceValue !== 6) {
          throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Dice must be 6 to unlock token');
        }
        token.position = 0;
        token.active = true;
      }

      // Calculate new position
      const newPosition = token.position + diceValue;

      // Check if token reached home
      if (newPosition === BOARD_SIZE) {
        // Token reached home
        currentPlayer.isHome[tokenIndex] = true;
        token.position = newPosition;
      } else if (newPosition < BOARD_SIZE) {
        token.position = newPosition;

        // Check for kill logic (landing on opponent)
        const killedOpponent = this._checkKill(game, playerIndex, newPosition);
        if (killedOpponent) {
          moveData.killedOpponent = killedOpponent;
        }
      }

      // Update game board
      await gameRepository.updatePlayerBoard(gameId, playerIndex, {
        tokens: currentPlayer.tokens,
        isHome: currentPlayer.isHome,
      });

      // Check if player won
      const hasWon = currentPlayer.isHome.every(h => h === true);
      if (hasWon) {
        const results = {
          winner: userId,
          ranking: [userId],
        };
        return await this.completeGame(gameId, results);
      }

      // Handle consecutive 6s
      if (diceValue === 6) {
        currentPlayer.consecutiveSixes++;
        if (currentPlayer.consecutiveSixes >= 3) {
          // 3rd six cancels turn, move to next player
          currentPlayer.consecutiveSixes = 0;
          const nextTurn = (playerIndex + 1) % game.players.length;
          await gameRepository.updateCurrentTurn(gameId, nextTurn);
        }
        // Otherwise, player gets another turn
      } else {
        // Non-6 roll, move to next player
        currentPlayer.consecutiveSixes = 0;
        const nextTurn = (playerIndex + 1) % game.players.length;
        await gameRepository.updateCurrentTurn(gameId, nextTurn);
      }

      const moveData = {
        playerIndex,
        userId,
        action: 'move_token',
        tokenIndex,
        diceValue,
        newPosition: token.position,
        timestamp: new Date(),
      };

      await gameRepository.addMove(gameId, moveData);

      const updatedGame = await gameRepository.findById(gameId);
      return this._formatGameResponse(updatedGame);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error moving token:', error);
      throw error;
    }
  }

  /**
   * Skip turn
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated game
   */
  async skipTurn(gameId, userId) {
    try {
      const game = await gameRepository.findById(gameId);
      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      const playerIndex = game.currentTurn;
      const currentPlayer = game.players[playerIndex];

      if (currentPlayer.userId.toString() !== userId) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Not your turn');
      }

      // Move to next player
      currentPlayer.consecutiveSixes = 0;
      const nextTurn = (playerIndex + 1) % game.players.length;
      await gameRepository.updateCurrentTurn(gameId, nextTurn);

      const moveData = {
        playerIndex,
        userId,
        action: 'skip_turn',
        timestamp: new Date(),
      };

      await gameRepository.addMove(gameId, moveData);

      const updatedGame = await gameRepository.findById(gameId);
      return this._formatGameResponse(updatedGame);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error skipping turn:', error);
      throw error;
    }
  }

  /**
   * Surrender game
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated game
   */
  async surrenderGame(gameId, userId) {
    try {
      const game = await gameRepository.findById(gameId);
      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      const playerIndex = game.players.findIndex(
        p => p.userId.toString() === userId
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

      logger.info(`User ${userId} surrendered game ${gameId}`);
      return this._formatGameResponse(updatedGame);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error surrendering game:', error);
      throw error;
    }
  }

  /**
   * Complete game and distribute rewards
   * @param {String} gameId - Game ID
   * @param {Object} results - Game results
   * @returns {Promise<Object>} Completed game
   */
  async completeGame(gameId, results) {
    try {
      const game = await gameRepository.findById(gameId);
      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      const completedGame = await gameRepository.completeGame(gameId, results);

      // Record in match history
      const matchData = {
        gameId,
        gameType: game.gameType,
        players: game.players.map(p => p.userId),
        winner: results.winner,
        duration: new Date() - game.startTime,
        entryFee: game.entryFee || 0,
        results,
      };

      await matchHistoryRepository.create(matchData);

      // Distribute rewards for cash games
      if (game.gameType === 'cash' && results.winner) {
        const totalPot = game.entryFee * game.players.length;
        const rewardAmount = Math.floor(totalPot * 0.9); // 90% to winner, 10% platform

        try {
          await walletService.processGameReward(results.winner, rewardAmount, gameId);
        } catch (error) {
          logger.error('Error distributing reward:', error);
        }
      }

      // Update user stats
      for (const player of game.players) {
        try {
          const isWinner = player.userId.toString() === results.winner.toString();
          await userRepository.updateGameStats(player.userId, {
            wins: isWinner ? 1 : 0,
            losses: isWinner ? 0 : 1,
            gamesPlayed: 1,
          });
        } catch (error) {
          logger.error('Error updating user stats:', error);
        }
      }

      logger.info(`Game completed: ${gameId}, Winner: ${results.winner}`);
      return this._formatGameResponse(completedGame);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error completing game:', error);
      throw error;
    }
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

      const playerIndex = game.players.findIndex(
        p => p.userId.toString() === userId
      );

      if (playerIndex === -1) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'User not in this game');
      }

      logger.info(`User ${userId} reconnected to game ${gameId}`);
      return this._formatGameResponse(game);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error reconnecting:', error);
      throw error;
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

      return this._formatGameResponse(game);
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
   * Check if token landed on opponent and kill them
   * @private
   */
  _checkKill(game, playerIndex, newPosition) {
    // Check if position is a safe zone
    if (HOME_POSITIONS.includes(newPosition)) {
      return null;
    }

    // Check if opponent token is on this position
    for (let i = 0; i < game.players.length; i++) {
      if (i === playerIndex) continue;

      const opponentPlayer = game.players[i];
      const killedTokenIndex = opponentPlayer.tokens.findIndex(
        t => t.position === newPosition && t.active
      );

      if (killedTokenIndex !== -1) {
        // Send opponent token home
        opponentPlayer.tokens[killedTokenIndex].position = -1;
        opponentPlayer.tokens[killedTokenIndex].active = false;
        return { playerIndex: i, tokenIndex: killedTokenIndex };
      }
    }

    return null;
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
      if (token.position === -1 && diceValue !== 6) continue;

      // Token can move
      validMoves.push(i);
    }

    return validMoves;
  }

  /**
   * Format game response
   * @private
   */
  _formatGameResponse(game) {
    return {
      _id: game._id,
      gameType: game.gameType,
      status: game.status,
      maxPlayers: game.maxPlayers,
      currentTurn: game.currentTurn,
      players: game.players.map((p, idx) => ({
        position: idx,
        userId: p.userId._id,
        name: p.userId.name,
        avatar: p.userId.avatar,
        tokens: p.tokens,
        isHome: p.isHome,
        consecutiveSixes: p.consecutiveSixes,
      })),
      moves: game.moves,
      startTime: game.startTime,
      endTime: game.endTime,
      results: game.results,
      entryFee: game.entryFee,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }
}

module.exports = new GameService();
