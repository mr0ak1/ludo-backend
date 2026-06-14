const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const MatchHistory = require('../models/matchHistory.model');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const {
  MATCH_HISTORY_DEFAULT_PAGE,
  MATCH_HISTORY_DEFAULT_LIMIT,
  MATCH_HISTORY_MAX_LIMIT,
} = require('../constants/stats.constants');

class MatchHistoryRepository {
  async create(data, options = {}) {
    try {
      const doc = await MatchHistory.create(data, { transaction: options.transaction });
      return doc.toJSON();
    } catch (error) {
      logger.error('Error creating match history:', error);
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to record match history');
    }
  }

  /**
   * Paginated match history for a user (participant row includes humans and bots).
   * @param {string|number} userId
   * @param {{ page?: number, limit?: number, gameType?: string }} opts
   */
  async findByParticipantUserId(userId, opts = {}) {
    try {
      const page = Math.max(opts.page || MATCH_HISTORY_DEFAULT_PAGE, 1);
      const limit = Math.min(
        Math.max(opts.limit || MATCH_HISTORY_DEFAULT_LIMIT, 1),
        MATCH_HISTORY_MAX_LIMIT
      );
      const skip = (page - 1) * limit;

      const numericUserId = parseInt(userId, 10);
      if (isNaN(numericUserId)) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          pages: 1,
        };
      }

      const where = {
        [Op.and]: [
          sequelize.literal(`JSON_CONTAINS(participants, JSON_OBJECT('userId', ${numericUserId}))`)
        ]
      };
      if (opts.gameType) {
        where.gameType = opts.gameType;
      }

      const { count, rows } = await MatchHistory.findAndCountAll({
        where,
        order: [['endedAt', 'DESC']],
        limit,
        offset: skip,
      });

      return {
        items: rows.map(r => r.toJSON()),
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit) || 1,
      };
    } catch (error) {
      logger.error('Error querying match history:', error);
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to load match history');
    }
  }

  /**
   * Count completed matches for userId in [start, end).
   */
  async countMatchesInRange(userId, start, end) {
    try {
      const numericUserId = parseInt(userId, 10);
      if (isNaN(numericUserId)) return 0;

      const where = {
        endedAt: {
          [Op.gte]: start,
          [Op.lt]: end,
        },
        [Op.and]: [
          sequelize.literal(`JSON_CONTAINS(participants, JSON_OBJECT('userId', ${numericUserId}))`)
        ]
      };

      return await MatchHistory.count({ where });
    } catch (error) {
      logger.error('Error counting match history:', error);
      return 0;
    }
  }
}

module.exports = new MatchHistoryRepository();
