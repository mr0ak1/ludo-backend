const gameValidator = require('../../../src/validators/gameValidator');

describe('Game Validator Tests', () => {
  describe('validateCreatePracticeGame', () => {
    it('should validate empty request', () => {
      const { error, value } = gameValidator.validateCreatePracticeGame({});
      expect(error).toBeUndefined();
      expect(value.maxPlayers).toBe(4);
    });

    it('should reject invalid maxPlayers', () => {
      const { error } = gameValidator.validateCreatePracticeGame({ maxPlayers: 5 });
      expect(error).toBeDefined();
    });
  });

  describe('validateCreateCashGame', () => {
    it('should validate cash game request', () => {
      const { error, value } = gameValidator.validateCreateCashGame({
        entryFee: 100,
        maxPlayers: 4,
      });
      expect(error).toBeUndefined();
      expect(value.entryFee).toBe(100);
    });

    it('should reject missing entry fee', () => {
      const { error } = gameValidator.validateCreateCashGame({ maxPlayers: 4 });
      expect(error).toBeDefined();
    });
  });

  describe('validateJoinGame', () => {
    it('should validate join game request', () => {
      const { error } = gameValidator.validateJoinGame({
        gameId: '507f1f77bcf86cd799439011',
      });
      expect(error).toBeUndefined();
    });

    it('should reject invalid game id', () => {
      const { error } = gameValidator.validateJoinGame({ gameId: 'invalid' });
      expect(error).toBeDefined();
    });
  });

  describe('validateMoveToken', () => {
    it('should validate move token request', () => {
      const { error, value } = gameValidator.validateMoveToken({
        gameId: '507f1f77bcf86cd799439011',
        tokenIndex: 2,
      });
      expect(error).toBeUndefined();
      expect(value.tokenIndex).toBe(2);
    });

    it('should reject invalid token index', () => {
      const { error } = gameValidator.validateMoveToken({
        gameId: '507f1f77bcf86cd799439011',
        tokenIndex: 4,
      });
      expect(error).toBeDefined();
    });
  });

  describe('validateGetGameHistory', () => {
    it('should validate default query', () => {
      const { error, value } = gameValidator.validateGetGameHistory({});
      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
      expect(value.status).toBe('all');
    });
  });

  describe('validateGetWaitingGames', () => {
    it('should validate default query', () => {
      const { error, value } = gameValidator.validateGetWaitingGames({});
      expect(error).toBeUndefined();
      expect(value.gameType).toBe('all');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format Joi errors into field map', () => {
      const formatted = gameValidator.formatValidationErrors({
        details: [
          { path: ['gameId'], message: 'Game ID is required' },
          { path: ['tokenIndex'], message: 'Token index is required' },
        ],
      });

      expect(formatted.gameId).toBe('Game ID is required');
      expect(formatted.tokenIndex).toBe('Token index is required');
    });
  });

  describe('Enums', () => {
    it('should expose game types and status enums', () => {
      expect(gameValidator.GAME_TYPES.PRACTICE).toBe('practice');
      expect(gameValidator.GAME_STATUS.ONGOING).toBe('ongoing');
    });
  });
});
