/**
 * Chat Socket Tests
 */

const chatSocket = require('../../../src/sockets/chat.socket');
const chatService = require('../../../src/services/chatService');

jest.mock('../../../src/services/chatService');
jest.mock('../../../src/utils/gameEvents', () => ({
  on: jest.fn(),
  emit: jest.fn(),
}));

describe('Chat Socket', () => {
  let socket;
  let io;

  beforeEach(() => {
    socket = {
      userId: '507f1f77bcf86cd799439012',
      emit: jest.fn(),
      on: jest.fn((event, handler) => {
        socket[`_handler_${event}`] = handler;
      }),
      join: jest.fn(),
    };

    io = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('chat_message event', () => {
    it('should delegate to chatService.sendUserMessage', async () => {
      chatService.sendUserMessage.mockResolvedValue({});

      chatSocket(socket, io);
      const handler = socket._handler_chat_message;

      await handler({
        gameId: '507f1f77bcf86cd799439011',
        message: 'Well Played!',
        userId: '507f1f77bcf86cd799439012',
        playerName: 'TestPlayer',
      });

      expect(chatService.sendUserMessage).toHaveBeenCalledWith(io, {
        gameId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        playerName: 'TestPlayer',
        message: 'Well Played!',
      });
      expect(socket.emit).not.toHaveBeenCalledWith('chat_error', expect.any(Object));
    });

    it('should emit chat_error when gameId or userId missing', async () => {
      chatSocket(socket, io);
      const handler = socket._handler_chat_message;

      await handler({ gameId: '507f1f77bcf86cd799439011', message: 'Hi' });

      expect(socket.emit).toHaveBeenCalledWith('chat_error', expect.objectContaining({ message: expect.any(String) }));
      expect(chatService.sendUserMessage).not.toHaveBeenCalled();
    });

    it('should emit chat_error when sendUserMessage fails', async () => {
      chatService.sendUserMessage.mockRejectedValue(new Error('Too many messages'));

      chatSocket(socket, io);
      const handler = socket._handler_chat_message;

      await handler({
        gameId: '507f1f77bcf86cd799439011',
        message: 'Hi',
        userId: '507f1f77bcf86cd799439012',
      });

      expect(socket.emit).toHaveBeenCalledWith(
        'chat_error',
        expect.objectContaining({ message: 'Too many messages' })
      );
    });
  });

  describe('chat_history_request event', () => {
    it('should return mapped messages', async () => {
      const createdAt = new Date('2026-05-12T10:00:00Z');
      chatService.getHistoryForUser.mockResolvedValue({
        messages: [
          {
            senderId: { toString: () => 'user1' },
            playerName: 'A',
            message: 'Hi',
            messageType: 'text_message',
            isBot: false,
            createdAt,
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
        pages: 1,
      });

      chatSocket(socket, io);
      const handler = socket._handler_chat_history_request;

      await handler({
        gameId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
      });

      expect(chatService.getHistoryForUser).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        { page: undefined, limit: undefined }
      );
      expect(socket.emit).toHaveBeenCalledWith(
        'chat_history',
        expect.objectContaining({
          gameId: '507f1f77bcf86cd799439011',
          messages: [
            expect.objectContaining({
              playerId: 'user1',
              message: 'Hi',
            }),
          ],
          pagination: { total: 1, page: 1, limit: 50, pages: 1 },
        })
      );
    });

    it('should emit chat_error when gameId or userId missing', async () => {
      chatSocket(socket, io);
      const handler = socket._handler_chat_history_request;

      await handler({ gameId: '507f1f77bcf86cd799439011' });

      expect(socket.emit).toHaveBeenCalledWith('chat_error', expect.any(Object));
    });
  });

  describe('typing event', () => {
    it('should broadcast user_typing when allowed', async () => {
      chatService.assertCanUseTyping.mockResolvedValue({
        game: {},
        playerName: 'Hero',
      });

      chatSocket(socket, io);
      const handler = socket._handler_typing;

      await handler({
        gameId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        typing: true,
      });

      expect(chatService.assertCanUseTyping).toHaveBeenCalled();
      expect(io.to).toHaveBeenCalledWith('game:507f1f77bcf86cd799439011');
      expect(io.emit).toHaveBeenCalledWith(
        'user_typing',
        expect.objectContaining({
          gameId: '507f1f77bcf86cd799439011',
          userId: '507f1f77bcf86cd799439012',
          playerName: 'Hero',
          typing: true,
        })
      );
    });
  });
});
