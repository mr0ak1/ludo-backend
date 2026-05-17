const matchmakingService = require('../services/matchmakingService');
const matchmakingValidator = require('../validators/matchmakingValidator');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

/**
 * Join matchmaking queue
 * POST /api/v1/matchmaking/join-queue
 */
const joinQueue = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = matchmakingValidator.validateJoinQueue(req.body);

    if (error) {
      const errors = matchmakingValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const queueEntry = await matchmakingService.joinQueue(userId, {
      gameType: value.gameType,
      betAmount: value.betAmount,
    });

    logger.info(`User ${userId} joined ${value.gameType} queue`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Joined matchmaking queue', {
        queueId: queueEntry._id,
        status: queueEntry.status,
        gameType: queueEntry.gameType,
        betAmount: queueEntry.betAmount,
        joinedAt: queueEntry.joinedAt,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Leave matchmaking queue
 * POST /api/v1/matchmaking/leave-queue
 */
const leaveQueue = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const cancelledEntry = await matchmakingService.leaveQueue(userId);

    logger.info(`User ${userId} left matchmaking queue`);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Left matchmaking queue', {
        queueId: cancelledEntry._id,
        status: cancelledEntry.status,
        cancelReason: cancelledEntry.cancelReason,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get queue status
 * GET /api/v1/matchmaking/queue-status
 */
const getQueueStatus = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const status = await matchmakingService.getQueueStatus(userId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Queue status retrieved', status)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get current bot difficulty (admin info)
 * GET /api/v1/matchmaking/bot-difficulty
 */
const getBotDifficulty = async (req, res, next) => {
  try {
    const difficulty = matchmakingService.getGlobalBotDifficulty();

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Current bot difficulty', {
        difficulty,
      })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  joinQueue,
  leaveQueue,
  getQueueStatus,
  getBotDifficulty,
};
