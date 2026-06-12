/**
 * Chat Socket Events Handler
 */

const { SOCKET_ERRORS } = require('../constants/socket.constants');
const chatService = require('../services/chatService');
const gameEvents = require('../utils/gameEvents');
const logger = require('../utils/logger');

let botChatListenerAttached = false;

const attachBotChatListenerOnce = (io) => {
  if (botChatListenerAttached) return;
  botChatListenerAttached = true;
  gameEvents.on('CHAT_SENT', (payload) => {
    chatService.persistAndBroadcastBotMessage(io, payload).catch((err) => {
      logger.error('CHAT_SENT handler error:', err);
    });
  });
};

const _socketError = (socket, message) => {
  socket.emit('chat_error', { message });
};

const chatSocket = (socket, io) => {
  attachBotChatListenerOnce(io);

  socket.on('chat_message', async (data) => {
    try {
      const { gameId, message, userId, playerName } = data || {};
      if (!gameId || !userId) {
        _socketError(socket, 'gameId and userId are required');
        return;
      }

      if (socket.userId && userId !== socket.userId) {
        _socketError(socket, 'Access Denied: Identity mismatch');
        return;
      }

      await chatService.sendUserMessage(io, {
        gameId,
        userId,
        playerName,
        message,
      });
    } catch (error) {
      logger.error('Error in chat_message handler:', error);
      _socketError(socket, error.message || SOCKET_ERRORS.INVALID_GAME_ID);
    }
  });

  socket.on('chat_history_request', async (data) => {
    try {
      const { gameId, userId, page, limit } = data || {};
      if (!gameId || !userId) {
        _socketError(socket, 'gameId and userId are required');
        return;
      }

      if (socket.userId && userId !== socket.userId) {
        _socketError(socket, 'Access Denied: Identity mismatch');
        return;
      }

      const result = await chatService.getHistoryForUser(gameId, userId, { page, limit });
      const messages = result.messages.map((m) => ({
        playerId: m.senderId.toString(),
        playerName: m.playerName,
        message: m.message,
        messageType: m.messageType,
        isBot: m.isBot,
        timestamp: m.createdAt,
      }));

      socket.emit('chat_history', {
        gameId,
        messages,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: result.pages,
        },
      });

      logger.info(`Chat history for game ${gameId}: ${messages.length} messages (page ${result.page})`);
    } catch (error) {
      logger.error('Error in chat_history_request handler:', error);
      _socketError(socket, error.message || 'Failed to fetch chat history');
    }
  });

  socket.on('typing', async (data) => {
    try {
      const { gameId, userId, playerName, typing } = data || {};
      if (!gameId || !userId) {
        _socketError(socket, 'gameId and userId are required');
        return;
      }

      if (socket.userId && userId !== socket.userId) {
        _socketError(socket, 'Access Denied: Identity mismatch');
        return;
      }

      const { playerName: resolvedName } = await chatService.assertCanUseTyping(
        gameId,
        userId,
        playerName
      );

      io.to(`game:${gameId}`).emit('user_typing', {
        gameId,
        userId,
        playerName: resolvedName,
        typing: Boolean(typing),
      });
    } catch (error) {
      logger.error('Error in typing handler:', error);
      _socketError(socket, error.message || 'Typing update failed');
    }
  });
};

module.exports = chatSocket;
