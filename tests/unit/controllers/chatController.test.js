const chatController = require('../../../src/controllers/chatController');
const chatService = require('../../../src/services/chatService');
const { HTTP_STATUS } = require('../../../src/constants/http.constants');

jest.mock('../../../src/services/chatService');

const VALID_GAME_ID = '507f1f77bcf86cd799439011';

describe('ChatController', () => {
  let req;
  let res;
  let next;
  const mockIo = { to: jest.fn().mockReturnThis(), emit: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { userId: '507f1f77bcf86cd799439012' },
      params: { gameId: VALID_GAME_ID },
      query: {},
      body: {},
      app: { get: jest.fn(() => mockIo) },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('getChatHistory', () => {
    it('should return history', async () => {
      const payload = { messages: [], total: 0, page: 1, limit: 50, pages: 1 };
      chatService.getHistoryForUser.mockResolvedValue(payload);

      await chatController.getChatHistory(req, res, next);

      expect(chatService.getHistoryForUser).toHaveBeenCalledWith(VALID_GAME_ID, req.user.userId, {});
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should send via socket io and return 201', async () => {
      req.body = { message: 'Hello there' };
      chatService.sendUserMessage.mockResolvedValue({
        gameId: VALID_GAME_ID,
        playerId: req.user.userId,
        message: 'Hello there',
      });

      await chatController.sendMessage(req, res, next);

      expect(req.app.get).toHaveBeenCalledWith('io');
      expect(chatService.sendUserMessage).toHaveBeenCalledWith(
        mockIo,
        expect.objectContaining({
          gameId: VALID_GAME_ID,
          userId: req.user.userId,
          message: 'Hello there',
        })
      );
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next when io missing', async () => {
      req.body = { message: 'Hello' };
      req.app.get = jest.fn(() => null);

      await chatController.sendMessage(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
    });
  });
});
