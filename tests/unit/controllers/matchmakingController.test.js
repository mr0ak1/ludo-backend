const matchmakingController = require('../../../src/controllers/matchmakingController');
const matchmakingService = require('../../../src/services/matchmakingService');
const matchmakingValidator = require('../../../src/validators/matchmakingValidator');
const { HTTP_STATUS } = require('../../../src/constants/http.constants');

jest.mock('../../../src/services/matchmakingService');
jest.mock('../../../src/validators/matchmakingValidator');

describe('MatchmakingController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { userId: 'user123' },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('joinQueue', () => {
    it('should join user to matchmaking queue', async () => {
      req.body = { gameType: 'cash', betAmount: 100 };
      const mockQueue = {
        _id: 'queue123',
        status: 'waiting',
        gameType: 'cash',
        betAmount: 100,
        joinedAt: new Date(),
      };

      matchmakingValidator.validateJoinQueue.mockReturnValue({
        error: null,
        value: { gameType: 'cash', betAmount: 100 },
      });
      matchmakingService.joinQueue.mockResolvedValue(mockQueue);

      await matchmakingController.joinQueue(req, res, next);

      expect(matchmakingService.joinQueue).toHaveBeenCalledWith('user123', {
        gameType: 'cash',
        betAmount: 100,
      });
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      req.body = { betAmount: -100 };
      const mockError = {
        details: [{ path: ['betAmount'], message: 'Bet amount cannot be negative' }],
      };

      matchmakingValidator.validateJoinQueue.mockReturnValue({
        error: mockError,
        value: null,
      });
      matchmakingValidator.formatValidationErrors.mockReturnValue([
        { field: 'betAmount', message: 'Bet amount cannot be negative' },
      ]);

      await matchmakingController.joinQueue(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    it('should handle queue errors', async () => {
      req.body = { gameType: 'cash' };
      const mockError = new Error('Already in queue');

      matchmakingValidator.validateJoinQueue.mockReturnValue({
        error: null,
        value: { gameType: 'cash', betAmount: 0 },
      });
      matchmakingService.joinQueue.mockRejectedValue(mockError);

      await matchmakingController.joinQueue(req, res, next);

      expect(next).toHaveBeenCalledWith(mockError);
    });
  });

  describe('leaveQueue', () => {
    it('should remove user from queue', async () => {
      const mockQueue = {
        _id: 'queue123',
        status: 'cancelled',
        cancelReason: 'User cancelled',
      };

      matchmakingService.leaveQueue.mockResolvedValue(mockQueue);

      await matchmakingController.leaveQueue(req, res, next);

      expect(matchmakingService.leaveQueue).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle not in queue error', async () => {
      const mockError = new Error('Not in queue');
      matchmakingService.leaveQueue.mockRejectedValue(mockError);

      await matchmakingController.leaveQueue(req, res, next);

      expect(next).toHaveBeenCalledWith(mockError);
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status for waiting player', async () => {
      const mockStatus = {
        inQueue: true,
        status: 'waiting',
        waitTime: 3000,
        maxWaitTime: 5000,
        position: 1,
        gameType: 'cash',
      };

      matchmakingService.getQueueStatus.mockResolvedValue(mockStatus);

      await matchmakingController.getQueueStatus(req, res, next);

      expect(matchmakingService.getQueueStatus).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return not in queue status', async () => {
      const mockStatus = {
        inQueue: false,
        status: null,
        waitTime: null,
        position: null,
      };

      matchmakingService.getQueueStatus.mockResolvedValue(mockStatus);

      await matchmakingController.getQueueStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });
  });

  describe('getBotDifficulty', () => {
    it('should return current bot difficulty', async () => {
      matchmakingService.getGlobalBotDifficulty.mockReturnValue('medium');

      await matchmakingController.getBotDifficulty(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.data.difficulty).toBe('medium');
    });
  });
});
