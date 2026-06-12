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
  async create(walletData, options = {}) {
    try {
      const wallet = new Wallet(walletData);
      await wallet.save(options);
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
  async findByUserId(userId, options = {}) {
    try {
      const wallet = await Wallet.findOne({ userId }, null, options).select('-__v');
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
  async findById(walletId, options = {}) {
    try {
      const wallet = await Wallet.findById(walletId, null, options).select('-__v');
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
  async updateCoins(userId, amount, reason = 'Manual update', options = {}) {
    try {
      if (!Number.isInteger(amount) || amount === 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid coin amount');
      }

      // Pre-check for locked status and balance for better error diagnostics
      const existingWallet = await Wallet.findOne({ userId }, 'isLocked lockedReason coins', options);
      if (!existingWallet) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Wallet not found');
      }

      if (existingWallet.isLocked) {
        throw new ApiError(HTTP_STATUS.CONFLICT, `Wallet is locked: ${existingWallet.lockedReason}`);
      }

      if (amount < 0 && existingWallet.coins + amount < 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Insufficient coins');
      }

      // Build atomic query
      const query = {
        userId,
        isLocked: false,
      };

      if (amount < 0) {
        query.coins = { $gte: Math.abs(amount) }; // Enforce balance check atomically
      }

      const update = {
        $inc: { coins: amount },
        $set: { updatedAt: new Date() },
      };

      const updatedWallet = await Wallet.findOneAndUpdate(query, update, {
        new: true,
        runValidators: true,
        ...options,
      }).select('-__v');

      if (!updatedWallet) {
        // If the update failed, find out why to raise the precise error
        const doubleCheck = await Wallet.findOne({ userId }, 'isLocked coins', options);
        if (!doubleCheck) {
          throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Wallet not found');
        }
        if (doubleCheck.isLocked) {
          throw new ApiError(HTTP_STATUS.CONFLICT, 'Wallet was concurrently locked');
        }
        if (amount < 0 && doubleCheck.coins < Math.abs(amount)) {
          throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Insufficient coins');
        }
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Concurrent wallet update conflict. Please try again.');
      }

      logger.info(`Wallet updated atomically for user ${userId}: ${existingWallet.coins} → ${updatedWallet.coins} (${reason})`);

      return updatedWallet.toObject();
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
  async lockWallet(userId, reason, options = {}) {
    try {
      const wallet = await Wallet.findOneAndUpdate(
        { userId },
        {
          isLocked: true,
          lockedReason: reason,
          lockedAt: new Date(),
          updatedAt: new Date(),
        },
        { new: true, ...options }
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
  async unlockWallet(userId, options = {}) {
    try {
      const wallet = await Wallet.findOneAndUpdate(
        { userId },
        {
          isLocked: false,
          lockedReason: null,
          lockedAt: null,
          updatedAt: new Date(),
        },
        { new: true, ...options }
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
  async getBalance(userId, options = {}) {
    try {
      const wallet = await Wallet.findOne({ userId }, 'coins', options);
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
  async deductCoins(userId, amount, reason = 'Game entry fee', options = {}) {
    try {
      if (amount < 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Deduction amount must be positive');
      }

      return await this.updateCoins(userId, -amount, reason, options);
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
  async addCoins(userId, amount, reason = 'Game reward', options = {}) {
    try {
      if (amount < 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Addition amount must be positive');
      }

      return await this.updateCoins(userId, amount, reason, options);
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

  /**
   * Get total sum of all user balances in the system
   * @returns {Promise<Number>} Total balance
   */
  async getTotalSystemBalance() {
    try {
      const result = await Wallet.aggregate([
        { $group: { _id: null, totalBalance: { $sum: '$coins' } } }
      ]);
      return result.length > 0 ? result[0].totalBalance : 0;
    } catch (error) {
      logger.error('Error getting total system balance:', error);
      return 0;
    }
  }
}

module.exports = new WalletRepository();
