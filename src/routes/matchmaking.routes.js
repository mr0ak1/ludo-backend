const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/admin.middleware');
const matchmakingController = require('../controllers/matchmakingController');

const router = express.Router();

/**
 * POST /api/v1/matchmaking/join-queue
 * Join matchmaking queue (instant bot match with fake wait)
 * Body: { gameType?: 'cash'|'practice'|'tournament', betAmount?: 0-10000 }
 */
router.post('/join-queue', authMiddleware, matchmakingController.joinQueue);

/**
 * POST /api/v1/matchmaking/leave-queue
 * Leave matchmaking queue if not yet matched
 */
router.post('/leave-queue', authMiddleware, matchmakingController.leaveQueue);

/**
 * GET /api/v1/matchmaking/queue-status
 * Get current queue status and wait time
 */
router.get('/queue-status', authMiddleware, matchmakingController.getQueueStatus);

/**
 * GET /api/v1/matchmaking/bot-difficulty
 * Get current global bot difficulty setting
 */
router.get('/bot-difficulty', authMiddleware, matchmakingController.getBotDifficulty);

/**
 * POST /api/v1/matchmaking/set-bot-difficulty (Admin Only)
 * Set global bot difficulty for all users
 * Body: { difficulty: 'easy'|'medium'|'hard' }
 */
router.post('/set-bot-difficulty', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const matchmakingValidator = require('../validators/matchmakingValidator');
    const ApiError = require('../utils/ApiError');
    const ApiResponse = require('../utils/ApiResponse');
    const { HTTP_STATUS } = require('../constants/http.constants');
    const matchmakingService = require('../services/matchmakingService');

    const { error, value } = matchmakingValidator.validateSetBotDifficulty(req.body);

    if (error) {
      const errors = matchmakingValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    await matchmakingService.setGlobalBotDifficulty(value.difficulty);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Bot difficulty updated', {
        difficulty: value.difficulty,
        appliedToNewGames: true,
      })
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
