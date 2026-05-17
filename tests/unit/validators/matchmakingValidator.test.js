const matchmakingValidator = require('../../../src/validators/matchmakingValidator');

describe('MatchmakingValidator', () => {
  describe('validateJoinQueue', () => {
    it('should validate valid queue join request', () => {
      const data = { gameType: 'cash', betAmount: 100 };
      const { error, value } = matchmakingValidator.validateJoinQueue(data);

      expect(error).toBeUndefined();
      expect(value.gameType).toBe('cash');
      expect(value.betAmount).toBe(100);
    });

    it('should set default game type', () => {
      const data = { betAmount: 50 };
      const { error, value } = matchmakingValidator.validateJoinQueue(data);

      expect(error).toBeUndefined();
      expect(value.gameType).toBe('cash');
    });

    it('should set default bet amount', () => {
      const data = { gameType: 'practice' };
      const { error, value } = matchmakingValidator.validateJoinQueue(data);

      expect(error).toBeUndefined();
      expect(value.betAmount).toBe(0);
    });

    it('should allow all valid game types', () => {
      const gameTypes = ['practice', 'cash', 'tournament'];

      for (const gameType of gameTypes) {
        const { error } = matchmakingValidator.validateJoinQueue({ gameType });
        expect(error).toBeUndefined();
      }
    });

    it('should reject invalid game type', () => {
      const data = { gameType: 'invalid' };
      const { error } = matchmakingValidator.validateJoinQueue(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be one of');
    });

    it('should reject negative bet amount', () => {
      const data = { betAmount: -50 };
      const { error } = matchmakingValidator.validateJoinQueue(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('cannot be negative');
    });

    it('should reject bet amount exceeding max', () => {
      const data = { betAmount: 15000 };
      const { error } = matchmakingValidator.validateJoinQueue(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('cannot exceed');
    });

    it('should accept valid bet amounts', () => {
      const amounts = [0, 10, 100, 1000, 10000];

      for (const amount of amounts) {
        const { error } = matchmakingValidator.validateJoinQueue({ betAmount: amount });
        expect(error).toBeUndefined();
      }
    });
  });

  describe('validateLeaveQueue', () => {
    it('should validate leave request with reason', () => {
      const data = { reason: 'Found another match' };
      const { error, value } = matchmakingValidator.validateLeaveQueue(data);

      expect(error).toBeUndefined();
      expect(value.reason).toBe('Found another match');
    });

    it('should allow empty reason', () => {
      const { error, value } = matchmakingValidator.validateLeaveQueue({});

      expect(error).toBeUndefined();
    });

    it('should reject reason exceeding max length', () => {
      const longReason = 'a'.repeat(201);
      const { error } = matchmakingValidator.validateLeaveQueue({ reason: longReason });

      expect(error).toBeDefined();
    });
  });

  describe('validateSetBotDifficulty', () => {
    it('should validate all valid difficulties', () => {
      const difficulties = ['easy', 'medium', 'hard'];

      for (const difficulty of difficulties) {
        const { error, value } = matchmakingValidator.validateSetBotDifficulty({ difficulty });
        expect(error).toBeUndefined();
        expect(value.difficulty).toBe(difficulty);
      }
    });

    it('should require difficulty field', () => {
      const { error } = matchmakingValidator.validateSetBotDifficulty({});

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('required');
    });

    it('should reject invalid difficulty', () => {
      const { error } = matchmakingValidator.validateSetBotDifficulty({ difficulty: 'extreme' });

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be one of');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format Joi validation errors', () => {
      const error = {
        details: [
          { path: ['gameType'], message: 'Invalid type' },
          { path: ['betAmount'], message: 'Invalid amount' },
        ],
      };

      const formatted = matchmakingValidator.formatValidationErrors(error);

      expect(formatted).toEqual([
        { field: 'gameType', message: 'Invalid type' },
        { field: 'betAmount', message: 'Invalid amount' },
      ]);
    });

    it('should handle nested paths', () => {
      const error = {
        details: [{ path: ['options', 'difficulty'], message: 'Invalid' }],
      };

      const formatted = matchmakingValidator.formatValidationErrors(error);

      expect(formatted[0].field).toBe('options.difficulty');
    });

    it('should return default for missing details', () => {
      const error = { message: 'Unknown error' };
      const formatted = matchmakingValidator.formatValidationErrors(error);

      expect(formatted).toEqual([{ message: 'Validation failed' }]);
    });
  });
});
