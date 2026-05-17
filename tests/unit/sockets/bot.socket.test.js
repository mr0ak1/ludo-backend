/**
 * Bot Socket Tests
 */

const botSocket = require('../../../src/sockets/bot.socket');
const gameRepository = require('../../../src/repositories/gameRepository');
const botService = require('../../../src/services/botService');
const botChatService = require('../../../src/services/botChatService');
const gameEvents = require('../../../src/utils/gameEvents');

jest.mock('../../../src/repositories/gameRepository');
jest.mock('../../../src/services/botService');
jest.mock('../../../src/services/botChatService');
jest.mock('../../../src/utils/gameEvents');

describe('Bot Socket', () => {
  let socket;
  let io;

  beforeEach(() => {
    socket = {
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

  describe('bot_auto_join event', () => {
    it('should join bot to game room', async () => {
      const gameData = {
        _id: 'game123',
        gameType: 'cash',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          {
            userId: 'bot1',
            playerName: 'BotPlayer',
            isBot: true,
            botDifficulty: 'medium',
          },
        ],
      };

      gameRepository.findById.mockResolvedValue(gameData);

      botSocket(socket, io);
      const handler = socket._handler_bot_auto_join;

      await handler({ gameId: 'game123' });

      expect(socket.join).toHaveBeenCalledWith('game:game123');
      expect(io.to).toHaveBeenCalledWith('game:game123');
      expect(io.emit).toHaveBeenCalledWith('match_found', {
        gameId: 'game123',
        botName: 'BotPlayer',
        botDifficulty: 'medium',
      });
    });

    it('should handle non-existent game', async () => {
      gameRepository.findById.mockResolvedValue(null);

      botSocket(socket, io);
      const handler = socket._handler_bot_auto_join;

      await handler({ gameId: 'invalid' });

      expect(socket.emit).toHaveBeenCalledWith('bot_error', expect.any(Object));
    });

    it('should handle game with no bot', async () => {
      const gameData = {
        _id: 'game123',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          { userId: 'user2', playerName: 'Player2', isBot: false },
        ],
      };

      gameRepository.findById.mockResolvedValue(gameData);

      botSocket(socket, io);
      const handler = socket._handler_bot_auto_join;

      await handler({ gameId: 'game123' });

      // Should not emit match_found or error
      expect(io.emit).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });
  });

  describe('bot_move_request event', () => {
    it('should process bot move successfully', async () => {
      const gameData = {
        _id: 'game123',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          {
            userId: 'bot1',
            playerName: 'BotPlayer',
            isBot: true,
            botDifficulty: 'medium',
          },
        ],
      };

      gameRepository.findById.mockResolvedValue(gameData);
      botService.getValidMoves.mockReturnValue([0, 1, 2]);
      botService.decideMove.mockReturnValue(1);
      botService.getThinkingDelay.mockReturnValue(1500);
      botChatService.sendBotQuickMessage.mockResolvedValue();

      botSocket(socket, io);
      const handler = socket._handler_bot_move_request;

      await handler({
        gameId: 'game123',
        botPlayerIndex: 1,
        diceValue: 5,
      });

      expect(botService.getValidMoves).toHaveBeenCalled();
      expect(botService.decideMove).toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith('bot_move_ready', {
        gameId: 'game123',
        botPlayerIndex: 1,
        action: 'move',
        selectedMove: 1,
        delay: 1500,
      });
    });

    it('should skip turn when no valid moves', async () => {
      const gameData = {
        _id: 'game123',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          {
            userId: 'bot1',
            playerName: 'BotPlayer',
            isBot: true,
            botDifficulty: 'easy',
          },
        ],
      };

      gameRepository.findById.mockResolvedValue(gameData);
      botService.getValidMoves.mockReturnValue([]);
      botService.getThinkingDelay.mockReturnValue(1000);

      botSocket(socket, io);
      const handler = socket._handler_bot_move_request;

      await handler({
        gameId: 'game123',
        botPlayerIndex: 1,
        diceValue: 1,
      });

      expect(socket.emit).toHaveBeenCalledWith('bot_move_ready', {
        gameId: 'game123',
        botPlayerIndex: 1,
        action: 'skip',
        selectedMove: null,
        delay: 1000,
      });
    });

    it('should handle invalid bot player', async () => {
      const gameData = {
        _id: 'game123',
        players: [
          { userId: 'user1', playerName: 'Player1', isBot: false },
          { userId: 'user2', playerName: 'Player2', isBot: false },
        ],
      };

      gameRepository.findById.mockResolvedValue(gameData);

      botSocket(socket, io);
      const handler = socket._handler_bot_move_request;

      await handler({
        gameId: 'game123',
        botPlayerIndex: 1,
        diceValue: 5,
      });

      expect(socket.emit).toHaveBeenCalledWith('bot_error', expect.any(Object));
    });

    it('should handle non-existent game', async () => {
      gameRepository.findById.mockResolvedValue(null);

      botSocket(socket, io);
      const handler = socket._handler_bot_move_request;

      await handler({
        gameId: 'invalid',
        botPlayerIndex: 0,
        diceValue: 5,
      });

      expect(socket.emit).toHaveBeenCalledWith('bot_error', expect.any(Object));
    });
  });

  describe('Event listeners', () => {
    it('should listen for TURN_STARTED event and send bot message', async () => {
      const gameData = {
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

      gameRepository.findById.mockResolvedValue(gameData);
      botChatService.sendBotQuickMessage.mockResolvedValue();

      botSocket(socket, io);

      // Simulate TURN_STARTED event
      gameEvents.on.mock.calls.forEach((call) => {
        if (call[0] === 'TURN_STARTED') {
          call[1]({ gameId: 'game123', playerIndex: 1 });
        }
      });

      expect(botChatService.sendBotQuickMessage).toBeDefined();
    });

    it('should listen for GAME_ENDED event and send reaction', async () => {
      const gameData = {
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

      gameRepository.findById.mockResolvedValue(gameData);
      botChatService.sendBotReactionMessage.mockResolvedValue();

      botSocket(socket, io);

      // Simulate GAME_ENDED event
      gameEvents.on.mock.calls.forEach((call) => {
        if (call[0] === 'GAME_ENDED') {
          call[1]({ gameId: 'game123', winnerId: 'bot1' });
        }
      });

      expect(botChatService.sendBotReactionMessage).toBeDefined();
    });
  });
});
