const statsService = require('../services/statsService');
const statsValidator = require('../validators/statsValidator');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');

const getMyStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const stats = await statsService.getMyStats(userId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, 'Stats retrieved', stats));
  } catch (err) {
    next(err);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const result = await statsService.getLeaderboard();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, 'Leaderboard retrieved', result));
  } catch (err) {
    next(err);
  }
};

const getMatchHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = statsValidator.validateMatchHistoryQuery(req.query);
    if (error) {
      const errors = statsValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }
    const result = await statsService.getMatchHistory(userId, value);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, 'Match history retrieved', result));
  } catch (err) {
    next(err);
  }
};

const getPlayerStats = async (req, res, next) => {
  try {
    const { error, value } = statsValidator.validatePlayerParams(req.params);
    if (error) {
      const errors = statsValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }
    const viewerId = req.user?.userId || null;
    const stats = await statsService.getPlayerStats(viewerId, value.userId);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, 'Player stats retrieved', stats));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyStats,
  getLeaderboard,
  getMatchHistory,
  getPlayerStats,
};
