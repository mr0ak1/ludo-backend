/**
 * Bot Chat Service Tests
 */

const botChatService = require('../../../src/services/botChatService');
const gameEvents = require('../../../src/utils/gameEvents');
const { CHAT_MESSAGES, CHAT_TYPE } = require('../../../src/constants/chat.constants');

jest.mock('../../../src/utils/gameEvents');

// Mock setTimeout
jest.useFakeTimers();

describe('Bot Chat Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gameEvents.emit.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('sendBotQuickMessage', () => {
    it('should send bot message in cash games', async () => {
      const game = {
        _id: 'game123',
        gameType: 'cash',
        status: 'active',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          {
            userId: 'bot1',
            playerName: 'BotPlayer',
            isBot: true,
          },
        ],
      };

      const io = {};

      await botChatService.sendBotQuickMessage(game, 1, io);

      // Fast forward timer
      jest.advanceTimersByTime(5000);

      // Check if gameEvents.emit was called
      expect(gameEvents.emit).toHaveBeenCalledWith(
        'CHAT_SENT',
        expect.objectContaining({
          gameId: 'game123',
          playerId: 'bot1',
          playerName: 'BotPlayer',
          messageType: CHAT_TYPE.QUICK_MESSAGE,
          isBot: true,
        })
      );
    });

    it('should send bot message in tournament games', async () => {
      const game = {
        _id: 'game456',
        gameType: 'tournament',
        status: 'active',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          {
            userId: 'bot1',
            playerName: 'BotPlayer',
            isBot: true,
          },
        ],
      };

      const io = {};

      await botChatService.sendBotQuickMessage(game, 1, io);

      jest.advanceTimersByTime(5000);

      expect(gameEvents.emit).toHaveBeenCalledWith(
        'CHAT_SENT',
        expect.objectContaining({
          gameId: 'game456',
          isBot: true,
        })
      );
    });

    it('should NOT send bot message in practice games', async () => {
      const game = {
        _id: 'game789',
        gameType: 'practice',
        status: 'active',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          {
            userId: 'bot1',
            playerName: 'BotPlayer',
            isBot: true,
          },
        ],
      };

      const io = {};

      await botChatService.sendBotQuickMessage(game, 1, io);

      jest.advanceTimersByTime(5000);

      expect(gameEvents.emit).not.toHaveBeenCalled();
    });

    it('should NOT send message for non-bot player', async () => {
      const game = {
        _id: 'game123',
        gameType: 'cash',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          { userId: 'user2', playerName: 'Player2', isBot: false },
        ],
      };

      const io = {};

      await botChatService.sendBotQuickMessage(game, 1, io);

      jest.advanceTimersByTime(5000);

      expect(gameEvents.emit).not.toHaveBeenCalled();
    });

    it('should NOT send message if game is not ongoing', async () => {
      const game = {
        _id: 'game123',
        gameType: 'cash',
        status: 'completed',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          {
            userId: 'bot1',
            playerName: 'BotPlayer',
            isBot: true,
          },
        ],
      };

      const io = {};

      await botChatService.sendBotQuickMessage(game, 1, io);

      jest.advanceTimersByTime(5000);

      expect(gameEvents.emit).not.toHaveBeenCalled();
    });

    it('should use predefined messages', async () => {
      const game = {
        _id: 'game123',
        gameType: 'cash',
        status: 'active',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          {
            userId: 'bot1',
            playerName: 'BotPlayer',
            isBot: true,
          },
        ],
      };

      const io = {};

      await botChatService.sendBotQuickMessage(game, 1, io);

      jest.advanceTimersByTime(5000);

      const emittedMessage = gameEvents.emit.mock.calls[0][1].message;
      expect(CHAT_MESSAGES).toContain(emittedMessage);
    });
  });

  describe('sendBotReactionMessage', () => {
    it('should send win reaction in cash games', async () => {
      const game = {
        _id: 'game123',
        gameType: 'cash',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          {
            userId: 'bot1',
            playerName: 'BotPlayer',
            isBot: true,
          },
        ],
      };

      await botChatService.sendBotReactionMessage(game, 1, 'win');

      expect(gameEvents.emit).toHaveBeenCalledWith(
        'CHAT_SENT',
        expect.objectContaining({
          gameId: 'game123',
          playerId: 'bot1',
          messageType: CHAT_TYPE.QUICK_MESSAGE,
          isBot: true,
        })
      );

      const emittedMessage = gameEvents.emit.mock.calls[0][1].message;
      expect(['I am winning 😎', 'Too easy!', 'Well Played!']).toContain(emittedMessage);
    });

    it('should send lose reaction in tournament games', async () => {
      const game = {
        _id: 'game456',
        gameType: 'tournament',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          {
            userId: 'bot1',
            playerName: 'BotPlayer',
            isBot: true,
          },
        ],
      };

      await botChatService.sendBotReactionMessage(game, 1, 'lose');

      expect(gameEvents.emit).toHaveBeenCalledWith(
        'CHAT_SENT',
        expect.objectContaining({
          gameId: 'game456',
          isBot: true,
        })
      );

      const emittedMessage = gameEvents.emit.mock.calls[0][1].message;
      expect(["Oh no!", "Play fast!", "Too slow!", "Loser!"]).toContain(emittedMessage);
    });

    it('should NOT send reaction in practice games', async () => {
      const game = {
        _id: 'game789',
        gameType: 'practice',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          {
            userId: 'bot1',
            playerName: 'BotPlayer',
            isBot: true,
          },
        ],
      };

      await botChatService.sendBotReactionMessage(game, 1, 'win');

      expect(gameEvents.emit).not.toHaveBeenCalled();
    });

    it('should NOT send reaction for non-bot player', async () => {
      const game = {
        _id: 'game123',
        gameType: 'cash',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          { userId: 'user2', playerName: 'Player2', isBot: false },
        ],
      };

      await botChatService.sendBotReactionMessage(game, 1, 'win');

      expect(gameEvents.emit).not.toHaveBeenCalled();
    });
  });
});
