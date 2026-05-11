const Wallet = require('../models/wallet.model');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

class WalletRepository {
  /**
   * Create a new wallet
   * @param {Object} walletData - Wallet data
   * @returns {Promise<Object>} Created wallet
   */
  async create(walletData) {
    try {
      const wallet = new Wallet(walletData);
      await wallet.save();
      logger.info(`Wallet created for user: ${walletData.userId}`);
      return wallet.toObject();
    } catch (error) {
      logger.error('Error creating wallet:', error);
      throw error;
    }
  }

  /**
   * Find wallet by user ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} Wallet object or null
   */
  async findByUserId(userId) {
    try {
      const wallet = await Wallet.findOne({ userId }).select('-__v');
      return wallet ? wallet.toObject() : null;
    } catch (error) {
      logger.error('Error finding wallet by user ID:', error);
      throw error;
    }
  }

  /**
   * Find wallet by ID
   * @param {String} walletId - Wallet ID
   * @returns {Promise<Object|null>} Wallet object or null
   */
  async findById(walletId) {
    try {
      const wallet = await Wallet.findById(walletId).select('-__v');
      return wallet ? wallet.toObject() : null;
    } catch (error) {
      logger.error('Error finding wallet by ID:', error);
      throw error;
    }
  }

  /**
   * Update wallet coins
   * @param {String} userId - User ID
   * @param {Number} amount - Coin amount (can be negative for deduction)
   * @param {String} reason - Reason for transaction
   * @returns {Promise<Object>} Updated wallet
   */
  async updateCoins(userId, amount, reason = 'Manual update') {
    try {
      if (!Number.isInteger(amount) || amount === 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid coin amount');
      }

      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Wallet not found');
      }

      // Check if wallet is locked
      if (wallet.isLocked) {
        throw new ApiError(HTTP_STATUS.CONFLICT, `Wallet is locked: ${wallet.lockedReason}`);
      }

      // Check for insufficient balance on deduction
      if (amount < 0 && wallet.coins + amount < 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Insufficient coins');
      }

      const previousBalance = wallet.coins;
      wallet.coins = Math.max(0, wallet.coins + amount); // Prevent negative balance
      wallet.updatedAt = new Date();

      await wallet.save();

      logger.info(`Wallet updated for user ${userId}: ${previousBalance} → ${wallet.coins} (${reason})`);

      return wallet.toObject();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating coins:', error);
      throw error;
    }
  }

  /**
   * Lock wallet (freeze balance)
   * @param {String} userId - User ID
   * @param {String} reason - Lock reason
   * @returns {Promise<Object>} Updated wallet
   */
  async lockWallet(userId, reason) {
    try {
      const wallet = await Wallet.findOneAndUpdate(
        { userId },
        {
          isLocked: true,
          lockedReason: reason,
          lockedAt: new Date(),
          updatedAt: new Date(),
        },
        { new: true }
      ).select('-__v');

      if (!wallet) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Wallet not found');
      }

      logger.warn(`Wallet locked for user ${userId}: ${reason}`);
      return wallet.toObject();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error locking wallet:', error);
      throw error;
    }
  }

  /**
   * Unlock wallet (unfreeze balance)
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated wallet
   */
  async unlockWallet(userId) {
    try {
      const wallet = await Wallet.findOneAndUpdate(
        { userId },
        {
          isLocked: false,
          lockedReason: null,
          lockedAt: null,
          updatedAt: new Date(),
        },
        { new: true }
      ).select('-__v');

      if (!wallet) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Wallet not found');
      }

      logger.info(`Wallet unlocked for user ${userId}`);
      return wallet.toObject();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error unlocking wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   * @param {String} userId - User ID
   * @returns {Promise<Number>} Coin balance
   */
  async getBalance(userId) {
    try {
      const wallet = await Wallet.findOne({ userId }).select('coins');
      return wallet ? wallet.coins : 0;
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Deduct coins from wallet
   * @param {String} userId - User ID
   * @param {Number} amount - Amount to deduct (positive number)
   * @param {String} reason - Reason for deduction
   * @returns {Promise<Object>} Updated wallet
   */
  async deductCoins(userId, amount, reason = 'Game entry fee') {
    try {
      if (amount < 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Deduction amount must be positive');
      }

      return await this.updateCoins(userId, -amount, reason);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error deducting coins:', error);
      throw error;
    }
  }

  /**
   * Add coins to wallet
   * @param {String} userId - User ID
   * @param {Number} amount - Amount to add (positive number)
   * @param {String} reason - Reason for addition
   * @returns {Promise<Object>} Updated wallet
   */
  async addCoins(userId, amount, reason = 'Game reward') {
    try {
      if (amount < 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Addition amount must be positive');
      }

      return await this.updateCoins(userId, amount, reason);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error adding coins:', error);
      throw error;
    }
  }

  /**
   * Check if wallet has sufficient balance
   * @param {String} userId - User ID
   * @param {Number} requiredAmount - Required amount
   * @returns {Promise<Boolean>} Has sufficient balance
   */
  async hasSufficientBalance(userId, requiredAmount) {
    try {
      const balance = await this.getBalance(userId);
      return balance >= requiredAmount;
    } catch (error) {
      logger.error('Error checking balance:', error);
      throw error;
    }
  }

  /**
   * Find all wallets with filters and pagination
   * @param {Object} filters - Query filters
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Wallets and total count
   */
  async findAll(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      const query = {};
      if (filters.isLocked !== undefined) query.isLocked = filters.isLocked;
      if (filters.minCoins !== undefined) query.coins = { $gte: filters.minCoins };
      if (filters.maxCoins !== undefined) {
        query.coins = { ...(query.coins || {}), $lte: filters.maxCoins };
      }

      const wallets = await Wallet.find(query)
        .select('-__v')
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 });

      const total = await Wallet.countDocuments(query);

      return {
        wallets: wallets.map(w => w.toObject()),
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error finding wallets:', error);
      throw error;
    }
  }
}

module.exports = new WalletRepository();
