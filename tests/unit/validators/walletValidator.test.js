const walletValidator = require('../../../src/validators/walletValidator');

describe('Wallet Validator Tests', () => {
  describe('validateGetWallet', () => {
    it('should validate empty wallet request', () => {
      const data = {};

      const { error, value } = walletValidator.validateGetWallet(data);

      expect(error).toBeUndefined();
    });
  });

  describe('validateGetTransactionHistory', () => {
    it('should validate transaction history request with defaults', () => {
      const data = {};

      const { error, value } = walletValidator.validateGetTransactionHistory(data);

      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
    });

    it('should validate transaction history with pagination', () => {
      const data = {
        page: 2,
        limit: 50,
      };

      const { error, value } = walletValidator.validateGetTransactionHistory(data);

      expect(error).toBeUndefined();
      expect(value.page).toBe(2);
      expect(value.limit).toBe(50);
    });

    it('should reject invalid page number', () => {
      const data = {
        page: 0,
      };

      const { error } = walletValidator.validateGetTransactionHistory(data);

      expect(error).toBeDefined();
    });

    it('should reject limit exceeding max', () => {
      const data = {
        limit: 101,
      };

      const { error } = walletValidator.validateGetTransactionHistory(data);

      expect(error).toBeDefined();
    });

    it('should validate with valid transaction type', () => {
      const data = {
        type: 'game_reward',
      };

      const { error, value } = walletValidator.validateGetTransactionHistory(data);

      expect(error).toBeUndefined();
      expect(value.type).toBe('game_reward');
    });

    it('should reject invalid transaction type', () => {
      const data = {
        type: 'invalid_type',
      };

      const { error } = walletValidator.validateGetTransactionHistory(data);

      expect(error).toBeDefined();
    });

    it('should validate with date range', () => {
      const data = {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      };

      const { error, value } = walletValidator.validateGetTransactionHistory(data);

      expect(error).toBeUndefined();
      expect(value.startDate).toBeDefined();
      expect(value.endDate).toBeDefined();
    });

    it('should validate with amount range', () => {
      const data = {
        minAmount: 100,
        maxAmount: 1000,
      };

      const { error, value } = walletValidator.validateGetTransactionHistory(data);

      expect(error).toBeUndefined();
      expect(value.minAmount).toBe(100);
      expect(value.maxAmount).toBe(1000);
    });
  });

  describe('validateAddCoins', () => {
    it('should validate add coins request', () => {
      const data = {
        userId: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId
        amount: 500,
        reason: 'Daily bonus reward for the user',
      };

      const { error, value } = walletValidator.validateAddCoins(data);

      expect(error).toBeUndefined();
      expect(value.userId).toBe(data.userId);
      expect(value.amount).toBe(500);
    });

    it('should reject invalid user ID', () => {
      const data = {
        userId: 'invalid-id',
        amount: 500,
        reason: 'Test reason here',
      };

      const { error } = walletValidator.validateAddCoins(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('does not match any of the allowed types');
    });

    it('should reject missing user ID', () => {
      const data = {
        amount: 500,
        reason: 'Test reason here',
      };

      const { error } = walletValidator.validateAddCoins(data);

      expect(error).toBeDefined();
    });

    it('should reject non-positive amount', () => {
      const data = {
        userId: '507f1f77bcf86cd799439011',
        amount: -100,
        reason: 'Test reason here',
      };

      const { error } = walletValidator.validateAddCoins(data);

      expect(error).toBeDefined();
    });

    it('should reject non-integer amount', () => {
      const data = {
        userId: '507f1f77bcf86cd799439011',
        amount: 500.5,
        reason: 'Test reason here',
      };

      const { error } = walletValidator.validateAddCoins(data);

      expect(error).toBeDefined();
    });

    it('should reject short reason', () => {
      const data = {
        userId: '507f1f77bcf86cd799439011',
        amount: 500,
        reason: 'Test',
      };

      const { error } = walletValidator.validateAddCoins(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('at least 5');
    });

    it('should reject long reason', () => {
      const data = {
        userId: '507f1f77bcf86cd799439011',
        amount: 500,
        reason: 'A'.repeat(501),
      };

      const { error } = walletValidator.validateAddCoins(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('exceed 500');
    });
  });

  describe('validateDeductCoins', () => {
    it('should validate deduct coins request', () => {
      const data = {
        userId: '507f1f77bcf86cd799439011',
        amount: 100,
        reason: 'Penalty for rule violation in game',
      };

      const { error, value } = walletValidator.validateDeductCoins(data);

      expect(error).toBeUndefined();
      expect(value.amount).toBe(100);
    });

    it('should reject zero amount', () => {
      const data = {
        userId: '507f1f77bcf86cd799439011',
        amount: 0,
        reason: 'Test reason here',
      };

      const { error } = walletValidator.validateDeductCoins(data);

      expect(error).toBeDefined();
    });
  });

  describe('validateFreezeWallet', () => {
    it('should validate freeze wallet request', () => {
      const data = {
        userId: '507f1f77bcf86cd799439011',
        reason: 'Suspicious activity detected on account',
      };

      const { error, value } = walletValidator.validateFreezeWallet(data);

      expect(error).toBeUndefined();
      expect(value.userId).toBe(data.userId);
      expect(value.reason).toBe(data.reason);
    });

    it('should reject missing reason', () => {
      const data = {
        userId: '507f1f77bcf86cd799439011',
      };

      const { error } = walletValidator.validateFreezeWallet(data);

      expect(error).toBeDefined();
    });
  });

  describe('validateUnfreezeWallet', () => {
    it('should validate unfreeze wallet request', () => {
      const data = {
        userId: '507f1f77bcf86cd799439011',
      };

      const { error, value } = walletValidator.validateUnfreezeWallet(data);

      expect(error).toBeUndefined();
      expect(value.userId).toBe(data.userId);
    });

    it('should reject invalid user ID', () => {
      const data = {
        userId: 'not-a-valid-id',
      };

      const { error } = walletValidator.validateUnfreezeWallet(data);

      expect(error).toBeDefined();
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const mockError = {
        details: [
          {
            path: ['amount'],
            message: 'Amount must be positive',
          },
          {
            path: ['reason'],
            message: 'Reason is required',
          },
        ],
      };

      const formatted = walletValidator.formatValidationErrors(mockError);

      expect(formatted.amount).toBe('Amount must be positive');
      expect(formatted.reason).toBe('Reason is required');
    });
  });

  describe('Transaction Type Validation', () => {
    it('should accept all valid transaction types', () => {
      const validTypes = [
        'game_entry',
        'game_reward',
        'game_refund',
        'admin_add',
        'admin_deduct',
        'sign_up_bonus',
        'referral_bonus',
        'daily_bonus',
        'withdrawal',
        'deposit',
      ];

      validTypes.forEach(type => {
        const data = { type };
        const { error } = walletValidator.validateGetTransactionHistory(data);
        expect(error).toBeUndefined();
      });
    });

    it('should have correct transaction type list', () => {
      expect(walletValidator.TRANSACTION_TYPES).toContain('game_entry');
      expect(walletValidator.TRANSACTION_TYPES).toContain('game_reward');
      expect(walletValidator.TRANSACTION_TYPES).toContain('admin_add');
      expect(walletValidator.TRANSACTION_TYPES.length).toBeGreaterThan(0);
    });
  });
});
