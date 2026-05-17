const gameService = require('../services/gameService');
const botValidator = require('../validators/botValidator');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const { BOT_DIFFICULTY, BOT_LEVELS } = require('../constants/bot.constants');
const logger = require('../utils/logger');

/**
 * Create bot game (1v1 with AI opponent)
 * POST /api/v1/bot/create-game
 */
const createBotGame = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = botValidator.validateCreateBotGame(req.body);

    if (error) {
      const errors = botValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const { difficulty, entryFee } = value;

    // Create cash game with bot (2 players: 1 real + 1 bot)
    const game = await gameService.createCashGame(userId, entryFee || 0, 2, difficulty);

    logger.info(`Bot game created for user ${userId} with difficulty ${difficulty}`);

    res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, 'Bot game created successfully', game)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get available bot difficulty levels
 * GET /api/v1/bot/difficulties
 */
const getBotDifficulties = async (req, res, next) => {
  try {
    const difficulties = BOT_LEVELS.map(level => ({
      level,
      displayName: level.charAt(0).toUpperCase() + level.slice(1),
      description: getDifficultyDescription(level),
      winRate: getExpectedWinRate(level),
      thinkingTime: getThinkingTimeDescription(level),
    }));

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Bot difficulties retrieved successfully', {
        difficulties,
        recommended: BOT_DIFFICULTY.MEDIUM,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Get description for difficulty level
 * @param {String} level - Bot difficulty level
 * @returns {String} Description
 */
function getDifficultyDescription(level) {
  const descriptions = {
    easy: 'Makes random moves with basic logic. Perfect for learning the game.',
    medium: 'Balanced strategy with smart move selection. Recommended for casual play.',
    hard: 'Advanced AI with lookahead planning. Challenge yourself against this level.',
  };
  return descriptions[level] || '';
}

/**
 * Helper: Get expected win rate against bot
 * @param {String} level - Bot difficulty level
 * @returns {String} Win rate range
 */
function getExpectedWinRate(level) {
  const rates = {
    easy: '50-70%',
    medium: '30-50%',
    hard: '10-30%',
  };
  return rates[level] || '';
}

/**
 * Helper: Get thinking time description
 * @param {String} level - Bot difficulty level
 * @returns {String} Thinking time description
 */
function getThinkingTimeDescription(level) {
  const times = {
    easy: '~1 second',
    medium: '~1.5 seconds',
    hard: '~2 seconds',
  };
  return times[level] || '';
}

module.exports = {
  createBotGame,
  getBotDifficulties,
};
