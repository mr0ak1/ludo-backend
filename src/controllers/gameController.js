const gameService = require('../services/gameService');
const gameValidator = require('../validators/gameValidator');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

/**
 * Create practice game
 * POST /api/v1/game/practice/create
 */
const createPracticeGame = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = gameValidator.validateCreatePracticeGame(req.body);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const game = await gameService.createPracticeGame(userId, value.maxPlayers);

    res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, 'Practice game created successfully', game)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Create cash game
 * POST /api/v1/game/cash/create
 */
const createCashGame = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = gameValidator.validateCreateCashGame(req.body);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const game = await gameService.createCashGame(userId, value.entryFee, value.maxPlayers);

    res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, 'Cash game created successfully', game)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Join game
 * POST /api/v1/game/join
 */
const joinGame = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = gameValidator.validateJoinGame(req.body);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const game = await gameService.joinGame(value.gameId, userId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Joined game successfully', game)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get game details
 * GET /api/v1/game/:gameId
 */
const getGameDetails = async (req, res, next) => {
  try {
    const { error, value } = gameValidator.validateGetGameDetails(req.params);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const game = await gameService.getGameDetails(value.gameId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Game details retrieved successfully', game)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get active game
 * GET /api/v1/game/active
 */
const getActiveGame = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const game = await gameService.getActiveGame(userId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Active game retrieved successfully', game)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Roll dice
 * POST /api/v1/game/roll-dice
 */
const rollDice = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = gameValidator.validateRollDice(req.body);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const result = await gameService.rollDice(value.gameId, userId, value.turnVersion);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Dice rolled successfully', result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Move token
 * POST /api/v1/game/move-token
 */
const moveToken = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = gameValidator.validateMoveToken(req.body);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const game = await gameService.moveToken(
      value.gameId,
      userId,
      value.tokenIndex,
      value.turnVersion
    );

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Token moved successfully', game)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Skip turn
 * POST /api/v1/game/skip-turn
 */
const skipTurn = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = gameValidator.validateSkipTurn(req.body);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const game = await gameService.skipTurn(value.gameId, userId, value.turnVersion);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Turn skipped successfully', game)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Surrender game
 * POST /api/v1/game/surrender
 */
const surrenderGame = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = gameValidator.validateSurrenderGame(req.body);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const game = await gameService.surrenderGame(value.gameId, userId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Game surrendered successfully', game)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * End game
 * POST /api/v1/game/end
 */
const endGame = async (req, res, next) => {
  try {
    const { error, value } = gameValidator.validateEndGame(req.body);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    // Caller should provide results
    const results = req.body.results || {};

    const game = await gameService.completeGame(value.gameId, results);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Game ended successfully', game)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reconnect to game
 * POST /api/v1/game/reconnect
 */
const reconnect = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = gameValidator.validateReconnect(req.body);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const game = await gameService.reconnect(value.gameId, userId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Reconnected successfully', game)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Restore game state
 * GET /api/v1/game/restore/:gameId
 */
const restoreGameState = async (req, res, next) => {
  try {
    const { error, value } = gameValidator.validateRestoreGameState(req.params);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const game = await gameService.restoreGameState(value.gameId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Game state restored successfully', game)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get game history
 * GET /api/v1/game/history
 */
const getGameHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = gameValidator.validateGetGameHistory(req.query);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const result = await gameService.getUserGameHistory(userId, {
      page: value.page,
      limit: value.limit,
    });

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Game history retrieved successfully', result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get waiting games (for matchmaking)
 * GET /api/v1/game/waiting
 */
const getWaitingGames = async (req, res, next) => {
  try {
    const { error, value } = gameValidator.validateGetWaitingGames(req.query);

    if (error) {
      const errors = gameValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const result = await gameService.getWaitingGames({
      page: value.page,
      limit: value.limit,
    });

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Waiting games retrieved successfully', result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get leaderboard
 * GET /api/v1/game/leaderboard
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 100) : 50;

    const leaderboard = await gameService.getLeaderboard({ limit });

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Leaderboard retrieved successfully', leaderboard)
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPracticeGame,
  createCashGame,
  joinGame,
  getGameDetails,
  getActiveGame,
  rollDice,
  moveToken,
  skipTurn,
  surrenderGame,
  endGame,
  reconnect,
  restoreGameState,
  getGameHistory,
  getWaitingGames,
  getLeaderboard,
};
