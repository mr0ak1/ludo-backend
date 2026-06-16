const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Game = require('../models/game.model');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const { GAME_STATUS } = require('../constants/game.constants');
const logger = require('../utils/logger');

function _buildWhere(gameId) {
  if (/^\d+$/.test(gameId)) {
    return { [Op.or]: [{ id: parseInt(gameId, 10) }, { gameId: String(gameId) }] };
  }
  return { gameId: String(gameId) };
}

class GameRepository {
  /**
   * Create a new game
   */
  async create(gameData) {
    try {
      const game = await Game.create(gameData);
      logger.info(`Game created: ${game.id} (gameId=${game.gameId})`);
      return game.toJSON();
    } catch (error) {
      logger.error('Error creating game:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Game already exists');
      }
      throw error;
    }
  }

  /**
   * Find game by ID
   */
  async findById(gameId) {
    try {
      const game = await Game.findOne({ where: _buildWhere(gameId) });
      return game ? game.toJSON() : null;
    } catch (error) {
      logger.error('Error finding game:', error);
      throw error;
    }
  }

  /**
   * Find active game for user
   */
  async findActiveGameForUser(userId) {
    try {
      const games = await Game.findAll({
        where: { status: GAME_STATUS.ACTIVE },
      });
      const found = games.find(g => {
        const players = g.players || [];
        return players.some(p => String(p.userId) === String(userId));
      });
      return found ? found.toJSON() : null;
    } catch (error) {
      logger.error('Error finding active game:', error);
      throw error;
    }
  }

  /**
   * Find games by status with pagination
   */
  async findByStatus(status, pagination = {}, filters = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      const where = { ...filters };
      if (status && status !== 'all') where.status = status;

      const { count, rows } = await Game.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return {
        games: rows.map(g => g.toJSON()),
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit) || 1,
        },
      };
    } catch (error) {
      logger.error('Error finding games by status:', error);
      throw error;
    }
  }

  /**
   * Find waiting games
   */
  async findWaitingGames(pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      const { count, rows } = await Game.findAndCountAll({
        where: { status: GAME_STATUS.PENDING },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return {
        games: rows.map(g => g.toJSON()),
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit) || 1,
        },
      };
    } catch (error) {
      logger.error('Error finding waiting games:', error);
      throw error;
    }
  }

  /**
   * Get user's game history
   */
  async getUserGameHistory(userId, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      const games = await Game.findAll({
        where: {
          status: { [Op.in]: [GAME_STATUS.COMPLETED, GAME_STATUS.SURRENDERED] },
        },
        order: [['endedAt', 'DESC']],
      });

      const userGames = games.filter(g =>
        (g.players || []).some(p => String(p.userId) === String(userId))
      );
      const total = userGames.length;
      const paginated = userGames.slice(offset, offset + limit);

      return {
        games: paginated.map(g => g.toJSON()),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      logger.error('Error getting user game history:', error);
      throw error;
    }
  }

  /**
   * Update game state
   */
  async update(gameId, updateData, options = {}) {
    try {
      const where = _buildWhere(gameId);
      const [rowsAffected] = await Game.update(updateData, {
        where,
        transaction: options.transaction,
      });

      if (rowsAffected === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      }

      const game = await Game.findOne({ where, transaction: options.transaction });
      logger.debug(`Game updated: ${gameId}`);
      return game.toJSON();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating game:', error);
      throw error;
    }
  }

  /**
   * Add player to game
   */
  async addPlayer(gameId, playerData) {
    try {
      const game = await Game.findOne({ where: _buildWhere(gameId) });
      if (!game) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');

      const players = game.players || [];
      players.push(playerData);

      const updates = { players };
      if (players.length >= game.maxPlayers) {
        updates.status = GAME_STATUS.ACTIVE;
        if (!game.startTime) {
          updates.startTime = new Date();
          updates.startedAt = new Date();
          updates.turnStartedAt = new Date();
        }
      }

      game.changed('players', true);
      await game.update(updates);
      logger.info(`Player added to game ${gameId}`);
      return game.toJSON();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error adding player:', error);
      throw error;
    }
  }

  /**
   * Update player board state
   */
  async updatePlayerBoard(gameId, playerIndex, boardData, options = {}) {
    try {
      const game = await Game.findOne({
        where: _buildWhere(gameId),
        transaction: options.transaction,
      });
      if (!game) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');

      const players = game.players || [];
      if (!players[playerIndex]) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid player index');

      const player = players[playerIndex];
      if (boardData.tokens !== undefined) player.tokens = boardData.tokens;
      if (boardData.isHome !== undefined) player.isHome = boardData.isHome;
      if (boardData.consecutiveSixes !== undefined) player.consecutiveSixes = boardData.consecutiveSixes;
      if (boardData.diceCount !== undefined) player.diceCount = boardData.diceCount;
      if (boardData.disconnectedAt !== undefined) player.disconnectedAt = boardData.disconnectedAt;
      if (boardData.isActive !== undefined) player.isActive = boardData.isActive;
      if (boardData.missedTurns !== undefined) player.missedTurns = boardData.missedTurns;
      players[playerIndex] = player;
      game.changed('players', true);
      await game.update(
        { players, currentTurnCount: game.currentTurnCount + 1 },
        { transaction: options.transaction }
      );
      return game.toJSON();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating player board:', error);
      throw error;
    }
  }

  /**
   * Add move to move history
   */
  async addMove(gameId, moveData, options = {}) {
    try {
      const game = await Game.findOne({
        where: _buildWhere(gameId),
        transaction: options.transaction,
      });
      if (!game) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');

      const moves = game.moves || [];
      moves.push({ ...moveData, timestamp: new Date() });
      game.changed('moves', true);
      await game.update(
        { moves, currentTurnCount: game.currentTurnCount + 1 },
        { transaction: options.transaction }
      );
      return game.toJSON();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error adding move:', error);
      throw error;
    }
  }

  /**
   * Update current turn
   */
  async updateCurrentTurn(gameId, newTurn, options = {}) {
    try {
      const where = _buildWhere(gameId);
      const [rowsAffected] = await Game.update(
        {
          currentTurn: newTurn,
          turnStartedAt: new Date(),
          currentTurnCount: sequelize.literal('currentTurnCount + 1'),
        },
        { where, transaction: options.transaction }
      );
      if (rowsAffected === 0) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      const game = await Game.findOne({ where, transaction: options.transaction });
      return game.toJSON();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating current turn:', error);
      throw error;
    }
  }

  /**
   * Complete game
   */
  async completeGame(gameId, results, options = {}) {
    try {
      const where = _buildWhere(gameId);
      const updateData = {
        status: (results && results.status === 'surrendered') ? GAME_STATUS.SURRENDERED : GAME_STATUS.COMPLETED,
        endedAt: new Date(),
        endTime: new Date(),
        results,
      };

      if (results && results.winner) updateData.winner = results.winner;
      if (results && results.players) updateData.players = results.players;

      const [rowsAffected] = await Game.update(updateData, {
        where,
        transaction: options.transaction,
      });
      if (rowsAffected === 0) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');

      const game = await Game.findOne({ where, transaction: options.transaction });
      logger.info(`Game completed: ${gameId}`);
      return game.toJSON();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error completing game:', error);
      throw error;
    }
  }

  /**
   * Surrender game
   */
  async surrenderGame(gameId, userId, options = {}) {
    try {
      const where = _buildWhere(gameId);
      const game = await Game.findOne({ where, transaction: options.transaction });
      if (!game) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');

      const results = game.results || {};
      results.surrenderedBy = userId;
      game.changed('results', true);
      await game.update(
        { status: GAME_STATUS.SURRENDERED, endedAt: new Date(), endTime: new Date(), results },
        { transaction: options.transaction }
      );
      logger.info(`Game surrendered by ${userId}: ${gameId}`);
      return game.toJSON();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error surrendering game:', error);
      throw error;
    }
  }

  /**
   * Delete game
   */
  async delete(gameId) {
    try {
      const rowsDeleted = await Game.destroy({ where: _buildWhere(gameId) });
      if (rowsDeleted === 0) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Game not found');
      logger.info(`Game deleted: ${gameId}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error deleting game:', error);
      throw error;
    }
  }

  /**
   * Get user game statistics
   */
  async getUserGameStats(userId) {
    try {
      const allGames = await Game.findAll({
        where: {
          status: { [Op.in]: [GAME_STATUS.COMPLETED, GAME_STATUS.SURRENDERED] },
        },
        attributes: ['id', 'status', 'players', 'results'],
      });

      const userGames = allGames.filter(g =>
        (g.players || []).some(p => String(p.userId) === String(userId))
      );

      const completedGames = userGames.filter(g => g.status === GAME_STATUS.COMPLETED);
      const wins = completedGames.filter(g => String(g.results && g.results.winner) === String(userId));
      const surrenderedGames = userGames.filter(g => g.status === GAME_STATUS.SURRENDERED);

      return {
        totalGames: userGames.length,
        completedGames: completedGames.length,
        wins: wins.length,
        losses: completedGames.length - wins.length,
        surrenders: surrenderedGames.length,
        winRate: completedGames.length > 0 ? (wins.length / completedGames.length) * 100 : 0,
      };
    } catch (error) {
      logger.error('Error getting game stats:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(pagination = {}) {
    try {
      const { limit = 50 } = pagination;
      const User = require('../models/user.model');

      const completedGames = await Game.findAll({
        where: { status: GAME_STATUS.COMPLETED },
        attributes: ['results'],
      });

      // Tally wins by winner userId
      const winMap = {};
      for (const g of completedGames) {
        const winner = g.results && g.results.winner;
        if (winner) {
          winMap[winner] = (winMap[winner] || 0) + 1;
        }
      }

      // Sort by wins descending, take top N
      const sorted = Object.entries(winMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit);

      const leaderboard = [];
      for (const [userId, wins] of sorted) {
        const user = await User.findByPk(parseInt(userId, 10), {
          attributes: ['id', 'uuid', 'name', 'avatar'],
        });
        if (user) {
          leaderboard.push({ userId: user.id, name: user.name, avatar: user.avatar, wins });
        }
      }

      return leaderboard;
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Count total games
   */
  async countAllGames() {
    try {
      return await Game.count();
    } catch (error) {
      logger.error('Error counting games:', error);
      return 0;
    }
  }

  /**
   * Get count of live playing human users
   */
  async getLivePlayingUsersCount() {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const activeGames = await Game.findAll({
        where: {
          status: GAME_STATUS.ACTIVE,
          updatedAt: { [Op.gte]: fifteenMinutesAgo },
        },
        attributes: ['players'],
      });

      const humanPlayerIds = new Set();
      for (const g of activeGames) {
        (g.players || []).forEach(p => {
          if (!p.isBot) humanPlayerIds.add(String(p.userId));
        });
      }
      return humanPlayerIds.size;
    } catch (error) {
      logger.error('Error getting live playing users count:', error);
      return 0;
    }
  }

  /**
   * Get total gameplay amount for today
   */
  async getTodayGameplayAmount() {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const result = await Game.sum('betAmount', {
        where: { createdAt: { [Op.gte]: startOfDay } },
      });
      return result || 0;
    } catch (error) {
      logger.error('Error getting today gameplay amount:', error);
      return 0;
    }
  }
}

module.exports = new GameRepository();
