const MatchHistory = require('../models/matchHistory.model');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');

class MatchHistoryRepository {
  async create(data) {
    try {
      // If model not present (tests), just return data
      if (!MatchHistory) {
        logger.debug('MatchHistory model not found, returning data');
        return data;
      }

      const doc = await MatchHistory.create(data);
      return doc;
    } catch (error) {
      logger.error('Error creating match history:', error);
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to record match history');
    }
  }
}

module.exports = new MatchHistoryRepository();
