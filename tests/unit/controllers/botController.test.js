const botController = require('../../../src/controllers/botController');
const gameService = require('../../../src/services/gameService');
const botValidator = require('../../../src/validators/botValidator');
const { HTTP_STATUS } = require('../../../src/constants/http.constants');

jest.mock('../../../src/services/gameService');
jest.mock('../../../src/validators/botValidator');

describe('BotController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { userId: 'user123' },
      body: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('createBotGame', () => {
    it('should create a bot game with default difficulty', async () => {
      req.body = { entryFee: 100 };
      const mockGame = { _id: 'game123', gameType: 'cash', players: [{}, {}] };

      botValidator.validateCreateBotGame.mockReturnValue({
        error: null,
        value: { difficulty: 'medium', entryFee: 100 },
      });
      botValidator.formatValidationErrors = jest.fn();
      gameService.createCashGame.mockResolvedValue(mockGame);

      await botController.createBotGame(req, res, next);

      expect(gameService.createCashGame).toHaveBeenCalledWith('user123', 100, 2, 'medium');
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      req.body = { difficulty: 'invalid' };
      const mockError = {
        details: [{ path: ['difficulty'], message: 'Invalid difficulty' }],
      };

      botValidator.validateCreateBotGame.mockReturnValue({
        error: mockError,
        value: null,
      });
      botValidator.formatValidationErrors.mockReturnValue([
        { field: 'difficulty', message: 'Invalid difficulty' },
      ]);

      await botController.createBotGame(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    it('should handle game service errors', async () => {
      req.body = { difficulty: 'easy' };
      const mockError = new Error('Database error');

      botValidator.validateCreateBotGame.mockReturnValue({
        error: null,
        value: { difficulty: 'easy', entryFee: 0 },
      });
      gameService.createCashGame.mockRejectedValue(mockError);

      await botController.createBotGame(req, res, next);

      expect(next).toHaveBeenCalledWith(mockError);
    });

    it('should create bot game with custom difficulty levels', async () => {
      const difficulties = ['easy', 'medium', 'hard'];

      for (const difficulty of difficulties) {
        jest.clearAllMocks();
        req.body = { difficulty };
        const mockGame = { _id: `game_${difficulty}` };

        botValidator.validateCreateBotGame.mockReturnValue({
          error: null,
          value: { difficulty, entryFee: 0 },
        });
        gameService.createCashGame.mockResolvedValue(mockGame);

        await botController.createBotGame(req, res, next);

        expect(gameService.createCashGame).toHaveBeenCalledWith('user123', 0, 2, difficulty);
      }
    });
  });

  describe('getBotDifficulties', () => {
    it('should return all available difficulty levels', async () => {
      await botController.getBotDifficulties(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      const response = res.json.mock.calls[0][0];

      expect(response.data.difficulties).toBeDefined();
      expect(response.data.difficulties.length).toBeGreaterThan(0);
      expect(response.data.recommended).toBe('medium');
    });

    it('should include difficulty metadata', async () => {
      await botController.getBotDifficulties(req, res, next);

      const response = res.json.mock.calls[0][0];
      const difficulties = response.data.difficulties;

      for (const diff of difficulties) {
        expect(diff.level).toBeDefined();
        expect(diff.displayName).toBeDefined();
        expect(diff.description).toBeDefined();
        expect(diff.winRate).toBeDefined();
        expect(diff.thinkingTime).toBeDefined();
      }
    });

    it('should have increasing difficulty descriptions', async () => {
      await botController.getBotDifficulties(req, res, next);

      const response = res.json.mock.calls[0][0];
      const difficulties = response.data.difficulties;

      expect(difficulties.find(d => d.level === 'easy')).toBeDefined();
      expect(difficulties.find(d => d.level === 'medium')).toBeDefined();
      expect(difficulties.find(d => d.level === 'hard')).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Test error');
      res.status.mockImplementation(() => {
        throw mockError;
      });

      await botController.getBotDifficulties(req, res, next);

      expect(next).toHaveBeenCalledWith(mockError);
    });
  });
});
