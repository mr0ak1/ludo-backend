const chatService = require('../../../src/services/chatService');
const chatRepository = require('../../../src/repositories/chatRepository');
const gameRepository = require('../../../src/repositories/gameRepository');
const ApiError = require('../../../src/utils/ApiError');
const { HTTP_STATUS } = require('../../../src/constants/http.constants');
const { CHAT_TYPE } = require('../../../src/constants/chat.constants');

jest.mock('../../../src/repositories/chatRepository');
jest.mock('../../../src/repositories/gameRepository');

const GAME_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439012';
const OTHER_ID = '507f1f77bcf86cd799439013';

const mockGame = (overrides = {}) => ({
  _id: GAME_ID,
  status: 'ongoing',
  players: [
    { userId: USER_ID, playerName: 'Human' },
    { userId: OTHER_ID, playerName: 'Other', isBot: true },
  ],
  ...overrides,
});

describe('ChatService', () => {
  let io;

  beforeEach(() => {
    jest.clearAllMocks();
    chatService.clearRateLimitsForTests();
    io = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
  });

  describe('prepareMessageContent', () => {
    it('should reject empty message', () => {
      expect(() => chatService.prepareMessageContent('   ')).toThrow(ApiError);
    });

    it('should reject URLs', () => {
      expect(() => chatService.prepareMessageContent('see https://spam.com')).toThrow(ApiError);
      expect(() => chatService.prepareMessageContent('visit www.bad.com')).toThrow(ApiError);
    });

    it('should mark predefined messages as quick_message', () => {
      const r = chatService.prepareMessageContent('Well Played!');
      expect(r.messageType).toBe(CHAT_TYPE.QUICK_MESSAGE);
    });

    it('should mark free text as text_message and filter profanity', () => {
      const r = chatService.prepareMessageContent('Hello damn world');
      expect(r.messageType).toBe(CHAT_TYPE.TEXT_MESSAGE);
      expect(r.displayMessage).toContain('***');
    });
  });

  describe('sendUserMessage', () => {
    it('should persist and broadcast', async () => {
      gameRepository.findById.mockResolvedValue(mockGame());
      chatRepository.create.mockResolvedValue({
        gameId: { toString: () => GAME_ID },
        senderId: { toString: () => USER_ID },
        playerName: 'Human',
        message: 'Hi',
        messageType: CHAT_TYPE.TEXT_MESSAGE,
        isBot: false,
        createdAt: new Date(),
      });

      await chatService.sendUserMessage(io, {
        gameId: GAME_ID,
        userId: USER_ID,
        message: 'Hi',
      });

      expect(chatRepository.create).toHaveBeenCalled();
      expect(io.to).toHaveBeenCalledWith(`game:${GAME_ID}`);
      expect(io.emit).toHaveBeenCalledWith('chat_received', expect.any(Object));
    });

    it('should reject when user is not in game', async () => {
      gameRepository.findById.mockResolvedValue(
        mockGame({
          players: [{ userId: OTHER_ID, playerName: 'X' }],
        })
      );

      await expect(
        chatService.sendUserMessage(io, { gameId: GAME_ID, userId: USER_ID, message: 'Hi' })
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.FORBIDDEN });
    });

    it('should reject when game is completed', async () => {
      gameRepository.findById.mockResolvedValue(mockGame({ status: 'completed' }));

      await expect(
        chatService.sendUserMessage(io, { gameId: GAME_ID, userId: USER_ID, message: 'Hi' })
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.FORBIDDEN });
    });

    it('should enforce rate limit (5 per 10s per user per game)', async () => {
      gameRepository.findById.mockResolvedValue(mockGame());
      chatRepository.create.mockResolvedValue({
        gameId: { toString: () => GAME_ID },
        senderId: { toString: () => USER_ID },
        playerName: 'Human',
        message: 'x',
        messageType: CHAT_TYPE.TEXT_MESSAGE,
        isBot: false,
        createdAt: new Date(),
      });

      for (let i = 0; i < 5; i += 1) {
        await chatService.sendUserMessage(io, {
          gameId: GAME_ID,
          userId: USER_ID,
          message: `m${i}`,
        });
      }

      await expect(
        chatService.sendUserMessage(io, { gameId: GAME_ID, userId: USER_ID, message: 'sixth' })
      ).rejects.toMatchObject({ statusCode: 429 });
    });
  });

  describe('getHistoryForUser', () => {
    it('should return repository data for a player', async () => {
      gameRepository.findById.mockResolvedValue(mockGame());
      chatRepository.findByGameId.mockResolvedValue({ messages: [], total: 0, page: 1, limit: 50, pages: 1 });

      const r = await chatService.getHistoryForUser(GAME_ID, USER_ID, { page: 1, limit: 20 });

      expect(chatRepository.findByGameId).toHaveBeenCalledWith(GAME_ID, { page: 1, limit: 20 });
      expect(r.total).toBe(0);
    });
  });
});
