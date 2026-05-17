const mongoose = require('mongoose');
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
      const docs = await MatchHistory.create([data], options);
      return docs[0];
    } catch (error) {
      logger.error('Error creating match history:', error);
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to record match history');
    }
  }

  /**
   * Paginated match history for a user (participant row includes humans and bots).
   * @param {string} userId
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

      const userOid = new mongoose.Types.ObjectId(userId);
      const filter = { 'participants.userId': userOid };
      if (opts.gameType) {
        filter.gameType = opts.gameType;
      }

      const [items, total] = await Promise.all([
        MatchHistory.find(filter)
          .sort({ endedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        MatchHistory.countDocuments(filter),
      ]);

      return {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
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
      const userOid = new mongoose.Types.ObjectId(userId);
      return MatchHistory.countDocuments({
        'participants.userId': userOid,
        endedAt: { $gte: start, $lt: end },
      });
    } catch (error) {
      logger.error('Error counting match history:', error);
      return 0;
    }
  }
}

module.exports = new MatchHistoryRepository();
