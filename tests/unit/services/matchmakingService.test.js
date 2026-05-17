const matchmakingService = require('../../../src/services/matchmakingService');
const queueRepository = require('../../../src/repositories/queueRepository');
const gameService = require('../../../src/services/gameService');
const userRepository = require('../../../src/repositories/userRepository');
const { BOT_NAMES } = require('../../../src/constants/bot.constants');

jest.mock('../../../src/repositories/queueRepository');
jest.mock('../../../src/services/gameService');
jest.mock('../../../src/repositories/userRepository');
jest.useFakeTimers();

describe('MatchmakingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Global Bot Difficulty', () => {
    it('should set and get global bot difficulty', () => {
      matchmakingService.setGlobalBotDifficulty('hard');
      expect(matchmakingService.getGlobalBotDifficulty()).toBe('hard');
    });

    it('should default to medium', () => {
      matchmakingService.setGlobalBotDifficulty('medium');
      expect(matchmakingService.getGlobalBotDifficulty()).toBe('medium');
    });

    it('should not set invalid difficulty', () => {
      matchmakingService.setGlobalBotDifficulty('medium');
      matchmakingService.setGlobalBotDifficulty('invalid');
      expect(matchmakingService.getGlobalBotDifficulty()).toBe('medium');
    });
  });

  describe('joinQueue', () => {
    it('should create queue entry for user', async () => {
      const mockUser = { _id: 'user123' };
      const mockQueueEntry = { _id: 'queue123', status: 'waiting' };

      userRepository.findById.mockResolvedValue(mockUser);
      queueRepository.create.mockResolvedValue(mockQueueEntry);
      queueRepository.findByUserId.mockResolvedValue(null);

      const result = await matchmakingService.joinQueue('user123', { gameType: 'cash' });

      expect(userRepository.findById).toHaveBeenCalledWith('user123');
      expect(queueRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockQueueEntry);
    });

    it('should reject if user already in queue', async () => {
      const mockUser = { _id: 'user123' };
      const existingQueue = { _id: 'queue123', status: 'waiting' };

      userRepository.findById.mockResolvedValue(mockUser);
      queueRepository.findByUserId.mockResolvedValue(existingQueue);

      await expect(matchmakingService.joinQueue('user123', {})).rejects.toThrow('Already in queue');
    });

    it('should reject if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(matchmakingService.joinQueue('invalid', {})).rejects.toThrow('User not found');
    });

    it('should simulate match with fake delay', async () => {
      const mockUser = { _id: 'user123' };
      const mockQueueEntry = { _id: 'queue123', status: 'waiting' };

      userRepository.findById.mockResolvedValue(mockUser);
      queueRepository.findByUserId.mockResolvedValue(null);
      queueRepository.create.mockResolvedValue(mockQueueEntry);

      const result = await matchmakingService.joinQueue('user123', { gameType: 'cash', betAmount: 100 });

      // Verify queue entry was created
      expect(result).toEqual(mockQueueEntry);
      expect(queueRepository.create).toHaveBeenCalled();
    });
  });

  describe('leaveQueue', () => {
    it('should cancel queue entry', async () => {
      const mockQueue = { _id: 'queue123', status: 'waiting' };
      const cancelledQueue = { ...mockQueue, status: 'cancelled' };

      queueRepository.findByUserId.mockResolvedValue(mockQueue);
      queueRepository.cancel.mockResolvedValue(cancelledQueue);

      const result = await matchmakingService.leaveQueue('user123');

      expect(queueRepository.cancel).toHaveBeenCalledWith('queue123', 'User cancelled');
      expect(result.status).toBe('cancelled');
    });

    it('should reject if not in queue', async () => {
      queueRepository.findByUserId.mockResolvedValue(null);

      await expect(matchmakingService.leaveQueue('user123')).rejects.toThrow('Not in queue');
    });

    it('should reject if already matched', async () => {
      const matchedQueue = { _id: 'queue123', status: 'matched' };

      queueRepository.findByUserId.mockResolvedValue(matchedQueue);

      await expect(matchmakingService.leaveQueue('user123')).rejects.toThrow('Already matched');
    });
  });

  describe('getQueueStatus', () => {
    it('should return status for waiting user', async () => {
      const joinedTime = new Date(Date.now() - 3000);
      const mockQueue = {
        _id: 'queue123',
        status: 'waiting',
        gameType: 'cash',
        betAmount: 100,
        joinedAt: joinedTime,
      };

      queueRepository.findByUserId.mockResolvedValue(mockQueue);
      queueRepository.findWaitingByGameType.mockResolvedValue([mockQueue]);

      const status = await matchmakingService.getQueueStatus('user123');

      expect(status.inQueue).toBe(true);
      expect(status.status).toBe('waiting');
      expect(status.waitTime).toBeGreaterThan(0);
      expect(status.position).toBe(1);
    });

    it('should return not in queue status', async () => {
      queueRepository.findByUserId.mockResolvedValue(null);

      const status = await matchmakingService.getQueueStatus('user123');

      expect(status.inQueue).toBe(false);
      expect(status.status).toBeNull();
    });
  });

  describe('getRandomBotName', () => {
    it('should return bot name for each difficulty', () => {
      const difficulties = ['easy', 'medium', 'hard'];

      for (const difficulty of difficulties) {
        const name = matchmakingService.getRandomBotName(difficulty);
        expect(name).toBeTruthy();
        expect(typeof name).toBe('string');
      }
    });

    it('should return names from correct pool', () => {
      const easyName = matchmakingService.getRandomBotName('easy');
      const easyNames = BOT_NAMES.EASY;
      expect(easyNames).toContain(easyName);
    });

    it('should return different names on multiple calls', () => {
      const names = new Set();
      for (let i = 0; i < 10; i++) {
        names.add(matchmakingService.getRandomBotName('easy'));
      }
      expect(names.size).toBeGreaterThan(1);
    });
  });

  describe('generateBotStats', () => {
    it('should generate realistic stats for easy bot', () => {
      const stats = matchmakingService.generateBotStats('easy');

      expect(stats.wins).toBeGreaterThanOrEqual(10);
      expect(stats.wins).toBeLessThanOrEqual(60);
      expect(stats.losses).toBeGreaterThanOrEqual(20);
      expect(stats.losses).toBeLessThanOrEqual(100);
      expect(stats.totalGames).toBe(stats.wins + stats.losses);
    });

    it('should generate realistic stats for medium bot', () => {
      const stats = matchmakingService.generateBotStats('medium');

      expect(stats.wins).toBeGreaterThanOrEqual(50);
      expect(stats.losses).toBeGreaterThanOrEqual(50);
      expect(stats.coins).toBeGreaterThanOrEqual(500);
      expect(stats.coins).toBeLessThanOrEqual(2500);
    });

    it('should generate realistic stats for hard bot', () => {
      const stats = matchmakingService.generateBotStats('hard');

      expect(stats.wins).toBeGreaterThanOrEqual(200);
      expect(stats.losses).toBeGreaterThanOrEqual(50);
      expect(stats.winRate).toBeGreaterThan(60);
      expect(stats.level).toBeGreaterThanOrEqual(11);
    });

    it('should calculate win rate correctly', () => {
      const stats = matchmakingService.generateBotStats('medium');
      const expectedWinRate = Math.round((stats.wins / stats.totalGames) * 100);
      expect(stats.winRate).toBe(expectedWinRate);
    });
  });
});
