const chatService = require('../services/chatService');
const chatValidator = require('../validators/chatValidator');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

/**
 * GET /api/v1/chat/:gameId
 */
const getChatHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { error: pErr, value: pVal } = chatValidator.validateGameIdParam(req.params);
    if (pErr) {
      const errors = chatValidator.formatValidationErrors(pErr);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const { error: qErr, value: qVal } = chatValidator.validateChatHistoryQuery(req.query);
    if (qErr) {
      const errors = chatValidator.formatValidationErrors(qErr);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const result = await chatService.getHistoryForUser(pVal.gameId, userId, qVal);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Chat history retrieved', result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/chat/:gameId/message
 */
const sendMessage = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { error: pErr, value: pVal } = chatValidator.validateGameIdParam(req.params);
    if (pErr) {
      const errors = chatValidator.formatValidationErrors(pErr);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const { error: bErr, value: bVal } = chatValidator.validateSendMessageBody(req.body);
    if (bErr) {
      const errors = chatValidator.formatValidationErrors(bErr);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const io = req.app.get('io');
    if (!io) {
      logger.error('Socket.io instance not mounted on app (req.app.get("io"))');
      throw new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Real-time server unavailable');
    }

    const payload = await chatService.sendUserMessage(io, {
      gameId: pVal.gameId,
      userId,
      playerName: bVal.playerName,
      message: bVal.message,
    });

    res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, 'Message sent', { message: payload })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChatHistory,
  sendMessage,
};
