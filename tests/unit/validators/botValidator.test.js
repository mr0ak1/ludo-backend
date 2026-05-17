const botValidator = require('../../../src/validators/botValidator');

describe('BotValidator', () => {
  describe('validateCreateBotGame', () => {
    it('should validate valid bot game request with all fields', () => {
      const data = {
        difficulty: 'medium',
        entryFee: 100,
      };

      const { error, value } = botValidator.validateCreateBotGame(data);

      expect(error).toBeUndefined();
      expect(value.difficulty).toBe('medium');
      expect(value.entryFee).toBe(100);
    });

    it('should set default difficulty to medium', () => {
      const data = { entryFee: 50 };

      const { error, value } = botValidator.validateCreateBotGame(data);

      expect(error).toBeUndefined();
      expect(value.difficulty).toBe('medium');
    });

    it('should set default entry fee to 0', () => {
      const data = { difficulty: 'easy' };

      const { error, value } = botValidator.validateCreateBotGame(data);

      expect(error).toBeUndefined();
      expect(value.entryFee).toBe(0);
    });

    it('should allow all valid difficulty levels', () => {
      const difficulties = ['easy', 'medium', 'hard'];

      for (const difficulty of difficulties) {
        const { error, value } = botValidator.validateCreateBotGame({ difficulty });

        expect(error).toBeUndefined();
        expect(value.difficulty).toBe(difficulty);
      }
    });

    it('should reject invalid difficulty levels', () => {
      const data = { difficulty: 'invalid' };

      const { error } = botValidator.validateCreateBotGame(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be one of');
    });

    it('should reject negative entry fee', () => {
      const data = { entryFee: -100 };

      const { error } = botValidator.validateCreateBotGame(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('cannot be negative');
    });

    it('should reject entry fee exceeding maximum', () => {
      const data = { entryFee: 15000 };

      const { error } = botValidator.validateCreateBotGame(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('cannot exceed');
    });

    it('should accept entry fee within valid range', () => {
      const fees = [0, 10, 100, 1000, 10000];

      for (const fee of fees) {
        const { error } = botValidator.validateCreateBotGame({ entryFee: fee });
        expect(error).toBeUndefined();
      }
    });

    it('should reject non-integer entry fee', () => {
      const data = { entryFee: 99.99 };

      const { error } = botValidator.validateCreateBotGame(data);

      expect(error).toBeDefined();
    });

    it('should allow empty request body with defaults', () => {
      const { error, value } = botValidator.validateCreateBotGame({});

      expect(error).toBeUndefined();
      expect(value.difficulty).toBe('medium');
      expect(value.entryFee).toBe(0);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format Joi validation errors', () => {
      const error = {
        details: [
          { path: ['difficulty'], message: 'Invalid difficulty' },
          { path: ['entryFee'], message: 'Invalid fee' },
        ],
      };

      const formatted = botValidator.formatValidationErrors(error);

      expect(formatted).toEqual([
        { field: 'difficulty', message: 'Invalid difficulty' },
        { field: 'entryFee', message: 'Invalid fee' },
      ]);
    });

    it('should handle nested field paths', () => {
      const error = {
        details: [
          { path: ['payload', 'difficulty'], message: 'Invalid' },
        ],
      };

      const formatted = botValidator.formatValidationErrors(error);

      expect(formatted[0].field).toBe('payload.difficulty');
    });

    it('should return default error for missing error.details', () => {
      const error = { message: 'Unknown error' };

      const formatted = botValidator.formatValidationErrors(error);

      expect(formatted).toEqual([{ message: 'Validation failed' }]);
    });
  });
});
