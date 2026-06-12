const mongoose = require('mongoose');
const Game = require('../models/game.model');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const { GAME_STATUS } = require('../constants/game.constants');
const logger = require('../utils/logger');

function _getQuery(gameId) {
  if (mongoose.isValidObjectId(gameId)) {
    return { $or: [{ _id: gameId }, { gameId: gameId }] };
  }
  return { gameId: gameId };
}

class GameRepository {
  /**
   * Create a new game
   * @param {Object} gameData - Game data
   * @returns {Promise<Object>} Created game
   */
  async create(gameData) {
    try {
      const game = await Game.create(gameData);
      logger.info(`Game created: ${game._id}`);
      return game;
    } catch (error) {
      logger.error('Error creating game:', error);
      if (error.code === 11000) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Game already exists');
      }
      throw error;
    }
  }

  /**
   * Find game by ID
   * @param {String} gameId - Game ID
   * @returns {Promise<Object>} Game document
   */
  async findById(gameId) {
    try {
      const game = await Game.findOne(_getQuery(gameId)).populate('players.userId');
      return game;
    } catch (error) {
      logger.error('Error finding game:', error);
      throw error;
    }
  }

  /**
   * Find active game for user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Active game
   */
  async findActiveGameForUser(userId) {
    try {
      const game = await Game.findOne({
        'players.userId': userId,
        status: GAME_STATUS.ACTIVE,
      }).populate('players.userId');

      return game;
    } catch (error) {
      logger.error('Error finding active game:', error);
      throw error;
    }
  }

  /**
   * Find games by status
   * @param {String} status - Game status
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} Games list
   */
  async findByStatus(status, pagination = {}, filters = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const query = { ...filters };
      if (status && status !== 'all') {
        query.status = status;
      }

      const games = await Game.find(query)
        .skip(skip)
        .limit(limit)
        .populate('players.userId')
        .sort({ createdAt: -1 });

      const total = await Game.countDocuments(query);

      return {
        games,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      logger.error('Error finding games by status:', error);
      throw error;
    }
  }

  /**
   * Find waiting games (not full)
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} Waiting games
   */
  async findWaitingGames(pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const games = await Game.find({
        status: GAME_STATUS.PENDING,
        $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] },
      })
        .skip(skip)
        .limit(limit)
        .populate('players.userId')
        .sort({ createdAt: -1 });

      const total = await Game.countDocuments({
        status: GAME_STATUS.PENDING,
        $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] },
      });

      return {
        games,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error finding waiting games:', error);
      throw error;
    }
  }

  /**
   * Get user's game history
   * @param {String} userId - User ID
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Game history
   */
  async getUserGameHistory(userId, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const games = await Game.find({
        'players.userId': userId,
        status: { $in: [GAME_STATUS.COMPLETED, GAME_STATUS.SURRENDERED] },
      })
        .skip(skip)
        .limit(limit)
        .populate('players.userId')
        .sort({ endTime: -1 });

      const total = await Game.countDocuments({
        'players.userId': userId,
        status: { $in: [GAME_STATUS.COMPLETED, GAME_STATUS.SURRENDERED] },
      });

      return {
        games,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting user game history:', error);
      throw error;
    }
  }

  /**
   * Update game state
   * @param {String} gameId - Game ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated game
   */
  async update(gameId, updateData, options = {}) {
    try {
      const game = await Game.findOneAndUpdate(_getQuery(gameId), updateData, {
        new: true,
        runValidators: true,
        ...options,
      }).populate('players.userId');

      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      logger.debug(`Game updated: ${gameId}`);
      return game;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating game:', error);
      throw error;
    }
  }

  /**
   * Add player to game
   * @param {String} gameId - Game ID
   * @param {Object} playerData - Player data
   * @returns {Promise<Object>} Updated game
   */
  async addPlayer(gameId, playerData) {
    try {
      const game = await Game.findOneAndUpdate(
        _getQuery(gameId),
        {
          $push: { 'players': playerData },
        },
        { new: true }
      ).populate('players.userId');

      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      // Start game when the configured player count is reached
      if (game.players.length === game.maxPlayers) {
        game.status = GAME_STATUS.ACTIVE;
        if (!game.startTime) {
          game.startTime = new Date();
          game.turnStartedAt = new Date();
        }
        await game.save();
      }

      logger.info(`Player added to game ${gameId}`);
      return game;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error adding player:', error);
      throw error;
    }
  }

  /**
   * Update player board state
   * @param {String} gameId - Game ID
   * @param {Number} playerIndex - Player index in array
   * @param {Object} boardData - Board state
   * @returns {Promise<Object>} Updated game
   */
  async updatePlayerBoard(gameId, playerIndex, boardData, options = {}) {
    try {
      const updatePath = `players.${playerIndex}`;
      const updates = {};

      if (boardData.tokens !== undefined) {
        updates[`${updatePath}.tokens`] = boardData.tokens;
      }

      if (boardData.isHome !== undefined) {
        updates[`${updatePath}.isHome`] = boardData.isHome;
      }

      if (boardData.consecutiveSixes !== undefined) {
        updates[`${updatePath}.consecutiveSixes`] = boardData.consecutiveSixes;
      }

      if (boardData.diceCount !== undefined) {
        updates[`${updatePath}.diceCount`] = boardData.diceCount;
      }

      if (boardData.disconnectedAt !== undefined) {
        updates[`${updatePath}.disconnectedAt`] = boardData.disconnectedAt;
      }

      if (boardData.isActive !== undefined) {
        updates[`${updatePath}.isActive`] = boardData.isActive;
      }

      const game = await Game.findOneAndUpdate(
        _getQuery(gameId),
        {
          $set: updates,
          $inc: { currentTurnCount: 1 }
        },
        { new: true, ...options }
      ).populate('players.userId');

      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      return game;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating player board:', error);
      throw error;
    }
  }

  /**
   * Add move to move history
   * @param {String} gameId - Game ID
   * @param {Object} moveData - Move details
   * @returns {Promise<Object>} Updated game
   */
  async addMove(gameId, moveData, options = {}) {
    try {
      const game = await Game.findOneAndUpdate(
        _getQuery(gameId),
        {
          $push: {
            moves: {
              ...moveData,
              timestamp: new Date(),
            },
          },
          $inc: { currentTurnCount: 1 }
        },
        { new: true, ...options }
      ).populate('players.userId');

      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      return game;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error adding move:', error);
      throw error;
    }
  }

  /**
   * Update current turn
   * @param {String} gameId - Game ID
   * @param {Number} newTurn - New player turn index
   * @returns {Promise<Object>} Updated game
   */
  async updateCurrentTurn(gameId, newTurn, options = {}) {
    try {
      const game = await Game.findOneAndUpdate(
        _getQuery(gameId),
        {
          $set: {
            currentTurn: newTurn,
            turnStartedAt: new Date(),
          },
          $inc: { currentTurnCount: 1 }
        },
        { new: true, ...options }
      ).populate('players.userId');

      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      return game;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating current turn:', error);
      throw error;
    }
  }

  /**
   * Complete game
   * @param {String} gameId - Game ID
   * @param {Object} results - Game results
   * @returns {Promise<Object>} Updated game
   */
  async completeGame(gameId, results, options = {}) {
    try {
      const game = await Game.findOneAndUpdate(
        _getQuery(gameId),
        {
          $set: {
            status: GAME_STATUS.COMPLETED,
            endTime: new Date(),
            results,
          },
          $inc: { currentTurnCount: 1 }
        },
        { new: true, ...options }
      ).populate('players.userId');

      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      logger.info(`Game completed: ${gameId}`);
      return game;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error completing game:', error);
      throw error;
    }
  }

  /**
   * Surrender game
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated game
   */
  async surrenderGame(gameId, userId, options = {}) {
    try {
      const game = await Game.findOneAndUpdate(
        _getQuery(gameId),
        {
          $set: {
            status: GAME_STATUS.SURRENDERED,
            endTime: new Date(),
            'results.surrenderedBy': userId,
          },
          $inc: { currentTurnCount: 1 }
        },
        { new: true, ...options }
      ).populate('players.userId');

      if (!game) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      logger.info(`Game surrendered by ${userId}: ${gameId}`);
      return game;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error surrendering game:', error);
      throw error;
    }
  }

  /**
   * Delete game (for testing/cleanup)
   * @param {String} gameId - Game ID
   * @returns {Promise<Boolean>} Deletion result
   */
  async delete(gameId) {
    try {
      const result = await Game.findOneAndDelete(_getQuery(gameId));
      if (!result) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }
      logger.info(`Game deleted: ${gameId}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error deleting game:', error);
      throw error;
    }
  }

  /**
   * Get game statistics
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Game statistics
   */
  async getUserGameStats(userId) {
    try {
      const completedGames = await Game.countDocuments({
        'players.userId': userId,
        status: GAME_STATUS.COMPLETED,
      });

      const winCount = await Game.countDocuments({
        'results.winner': userId,
        status: GAME_STATUS.COMPLETED,
      });

      const surrenderedCount = await Game.countDocuments({
        'players.userId': userId,
        status: GAME_STATUS.SURRENDERED,
      });

      return {
        totalGames: completedGames + surrenderedCount,
        completedGames,
        wins: winCount,
        losses: completedGames - winCount,
        surrenders: surrenderedCount,
        winRate: completedGames > 0 ? (winCount / completedGames) * 100 : 0,
      };
    } catch (error) {
      logger.error('Error getting game stats:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} Leaderboard data
   */
  async getLeaderboard(pagination = {}) {
    try {
      const { limit = 50 } = pagination;

      const leaderboard = await Game.aggregate([
        { $match: { status: GAME_STATUS.COMPLETED } },
        { $group: { _id: '$results.winner', wins: { $sum: 1 } } },
        { $sort: { wins: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            name: '$user.name',
            avatar: '$user.avatar',
            wins: 1,
          },
        },
      ]);

      return leaderboard;
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Count total games
   * @returns {Promise<Number>} Total game count
   */
  async countAllGames() {
    try {
      return await Game.countDocuments();
    } catch (error) {
      logger.error('Error counting games:', error);
      return 0;
    }
  }

  /**
   * Get count of live playing human users
   * @returns {Promise<Number>} Live players count
   */
  async getLivePlayingUsersCount() {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const result = await Game.aggregate([
        { $match: { status: GAME_STATUS.ACTIVE, updatedAt: { $gte: fifteenMinutesAgo } } },
        { $unwind: '$players' },
        { $match: { 'players.isBot': false } },
        { $group: { _id: '$players.userId' } },
        { $count: 'livePlayers' }
      ]);
      return result.length > 0 ? result[0].livePlayers : 0;
    } catch (error) {
      logger.error('Error getting live playing users count:', error);
      return 0;
    }
  }

  /**
   * Get total gameplay amount for today
   * @returns {Promise<Number>} Today's total bet amount
   */
  async getTodayGameplayAmount() {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const result = await Game.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, totalAmount: { $sum: '$betAmount' } } }
      ]);
      return result.length > 0 ? result[0].totalAmount : 0;
    } catch (error) {
      logger.error('Error getting today gameplay amount:', error);
      return 0;
    }
  }
}

module.exports = new GameRepository();
