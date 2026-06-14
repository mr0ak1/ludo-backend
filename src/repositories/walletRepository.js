const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Wallet = require('../models/wallet.model');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

class WalletRepository {
  /**
   * Create a new wallet
   * @param {Object} walletData - Wallet data
   * @param {Object} options - Options
   * @returns {Promise<Object>} Created wallet
   */
  async create(walletData, options = {}) {
    try {
      const wallet = await Wallet.create(walletData, { transaction: options.transaction });
      logger.info(`Wallet created for user: ${walletData.userId}`);
      return wallet.toJSON();
    } catch (error) {
      logger.error('Error creating wallet:', error);
      throw error;
    }
  }

  /**
   * Find wallet by user ID
   * @param {String|Number} userId - User ID
   * @returns {Promise<Object|null>} Wallet object or null
   */
  async findByUserId(userId, options = {}) {
    try {
      const numericUserId = parseInt(userId, 10);
      if (isNaN(numericUserId)) return null;
      const wallet = await Wallet.findOne({
        where: { userId: numericUserId },
        transaction: options.transaction,
      });
      return wallet ? wallet.toJSON() : null;
    } catch (error) {
      logger.error('Error finding wallet by user ID:', error);
      throw error;
    }
  }

  /**
   * Find wallet by ID
   * @param {String|Number} walletId - Wallet ID
   * @returns {Promise<Object|null>} Wallet object or null
   */
  async findById(walletId, options = {}) {
    try {
      const numericId = parseInt(walletId, 10);
      if (isNaN(numericId)) return null;
      const wallet = await Wallet.findByPk(numericId, { transaction: options.transaction });
      return wallet ? wallet.toJSON() : null;
    } catch (error) {
      logger.error('Error finding wallet by ID:', error);
      throw error;
    }
  }

  /**
   * Update wallet coins atomically using Sequelize transaction
   * @param {String|Number} userId - User ID
   * @param {Number} amount - Coin amount (can be negative for deduction)
   * @param {String} reason - Reason for transaction
   * @returns {Promise<Object>} Updated wallet
   */
  async updateCoins(userId, amount, reason = 'Manual update', options = {}) {
    const numericUserId = parseInt(userId, 10);
    const t = options.transaction || await sequelize.transaction();
    const isExternalTx = !!options.transaction;

    try {
      if (!Number.isInteger(amount) || amount === 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid coin amount');
      }

      // Lock the row for update within the transaction
      const wallet = await Wallet.findOne({
        where: { userId: numericUserId },
        transaction: t,
        lock: true,
      });

      if (!wallet) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Wallet not found');
      }

      if (wallet.isLocked) {
        throw new ApiError(HTTP_STATUS.CONFLICT, `Wallet is locked: ${wallet.lockedReason}`);
      }

      if (amount < 0 && wallet.coins + amount < 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Insufficient coins');
      }

      const prevCoins = wallet.coins;
      await wallet.increment({ coins: amount }, { transaction: t });
      
      // Keep track of statistics
      if (amount > 0) {
        await wallet.increment({ totalEarned: amount }, { transaction: t });
      } else {
        await wallet.increment({ totalSpent: Math.abs(amount) }, { transaction: t });
      }

      await wallet.reload({ transaction: t });
      logger.info(`Wallet updated atomically for user ${userId}: ${prevCoins} → ${wallet.coins} (${reason})`);

      if (!isExternalTx) {
        await t.commit();
      }

      return wallet.toJSON();
    } catch (error) {
      if (!isExternalTx) {
        await t.rollback();
      }
      if (error instanceof ApiError) throw error;
      logger.error('Error updating coins:', error);
      throw error;
    }
  }

  /**
   * Lock wallet (freeze balance)
   * @param {String|Number} userId - User ID
   * @param {String} reason - Lock reason
   * @returns {Promise<Object>} Updated wallet
   */
  async lockWallet(userId, reason, options = {}) {
    try {
      const numericUserId = parseInt(userId, 10);
      const wallet = await Wallet.findOne({ where: { userId: numericUserId }, transaction: options.transaction });
      if (!wallet) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Wallet not found');
      }

      await wallet.update({
        isLocked: true,
        lockedReason: reason,
        lockedAt: new Date(),
      }, { transaction: options.transaction });

      logger.warn(`Wallet locked for user ${userId}: ${reason}`);
      return wallet.toJSON();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error locking wallet:', error);
      throw error;
    }
  }

  /**
   * Unlock wallet (unfreeze balance)
   * @param {String|Number} userId - User ID
   * @returns {Promise<Object>} Updated wallet
   */
  async unlockWallet(userId, options = {}) {
    try {
      const numericUserId = parseInt(userId, 10);
      const wallet = await Wallet.findOne({ where: { userId: numericUserId }, transaction: options.transaction });
      if (!wallet) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Wallet not found');
      }

      await wallet.update({
        isLocked: false,
        lockedReason: null,
        lockedAt: null,
      }, { transaction: options.transaction });

      logger.info(`Wallet unlocked for user ${userId}`);
      return wallet.toJSON();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error unlocking wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   * @param {String|Number} userId - User ID
   * @returns {Promise<Number>} Coin balance
   */
  async getBalance(userId, options = {}) {
    try {
      const numericUserId = parseInt(userId, 10);
      const wallet = await Wallet.findOne({
        where: { userId: numericUserId },
        attributes: ['coins'],
        transaction: options.transaction,
      });
      return wallet ? wallet.coins : 0;
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Deduct coins from wallet
   * @param {String|Number} userId - User ID
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
   * @param {String|Number} userId - User ID
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
   * @param {String|Number} userId - User ID
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
      if (filters.minCoins !== undefined) query.coins = { [Op.gte]: filters.minCoins };
      if (filters.maxCoins !== undefined) {
        query.coins = { ...(query.coins || {}), [Op.lte]: filters.maxCoins };
      }

      const { count, rows } = await Wallet.findAndCountAll({
        where: query,
        limit,
        offset: skip,
        order: [['createdAt', 'DESC']],
      });

      return {
        wallets: rows.map(w => w.toJSON()),
        total: count,
        page,
        pages: Math.ceil(count / limit) || 1,
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
      return await Wallet.sum('coins') || 0;
    } catch (error) {
      logger.error('Error getting total system balance:', error);
      return 0;
    }
  }
}

module.exports = new WalletRepository();
