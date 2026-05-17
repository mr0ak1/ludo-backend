const walletRepository = require('../repositories/walletRepository');
const transactionRepository = require('../repositories/transactionRepository');
const userRepository = require('../repositories/userRepository');
const notificationService = require('./notificationService');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

class WalletService {
  /**
   * Initialize wallet for new user
   * @param {String} userId - User ID
   * @param {Number} initialCoins - Initial coins (default 500)
   * @returns {Promise<Object>} Created wallet
   */
  async initializeWallet(userId, initialCoins = 500) {
    try {
      // Check if wallet already exists
      const existingWallet = await walletRepository.findByUserId(userId);
      if (existingWallet) {
        return existingWallet;
      }

      // Create new wallet
      const wallet = await walletRepository.create({
        userId,
        coins: initialCoins,
        isLocked: false,
      });

      // Log initial transaction
      await transactionRepository.create({
        userId,
        type: 'sign_up_bonus',
        amount: initialCoins,
        reason: 'Sign-up bonus',
        beforeBalance: 0,
        afterBalance: initialCoins,
      });

      logger.info(`Wallet initialized for user ${userId} with ${initialCoins} coins`);

      setImmediate(() => {
        notificationService
          .notifyBonus(userId, {
            title: 'Welcome bonus',
            body: `You received ${initialCoins} coins to get started.`,
            data: { kind: 'sign_up' },
          })
          .catch((e) => logger.error('notifyBonus failed:', e.message));
      });

      return wallet;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error initializing wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance and details
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Wallet details
   */
  async getWallet(userId) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      let wallet = await walletRepository.findByUserId(userId);
      if (!wallet) {
        wallet = await this.initializeWallet(userId);
      }

      return {
        userId,
        coins: wallet.coins,
        isLocked: wallet.isLocked,
        lockedReason: wallet.lockedReason,
        lockedAt: wallet.lockedAt,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting wallet:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for user
   * @param {String} userId - User ID
   * @param {Object} filters - Query filters
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Transactions list
   */
  async getTransactionHistory(userId, filters = {}, pagination = {}) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      const result = await transactionRepository.findByUserId(userId, pagination, filters);

      return {
        transactions: result.transactions,
        pagination: {
          total: result.total,
          page: result.page,
          pages: result.pages,
          limit: pagination.limit || 20,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * Add coins to wallet (admin operation)
   * @param {String} userId - User ID
   * @param {Number} amount - Amount to add
   * @param {String} reason - Reason for addition
   * @returns {Promise<Object>} Updated wallet
   */
  async addCoins(userId, amount, reason) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      // Get current balance
      let wallet = await walletRepository.findByUserId(userId);
      if (!wallet) {
        wallet = await this.initializeWallet(userId);
      }

      const previousBalance = wallet.coins;

      // Add coins
      const updatedWallet = await walletRepository.addCoins(userId, amount, reason);

      // Log transaction
      await transactionRepository.create({
        userId,
        type: 'admin_add',
        amount,
        reason,
        beforeBalance: previousBalance,
        afterBalance: updatedWallet.coins,
      });

      logger.info(`Added ${amount} coins to user ${userId}: ${reason}`);

      setImmediate(() => {
        notificationService
          .notifyWalletUpdate(userId, {
            amount,
            direction: 'credit',
            balanceAfter: updatedWallet.coins,
            reason: reason || 'Coins added',
            refId: userId,
          })
          .catch((e) => logger.error('notifyWalletUpdate failed:', e.message));
      });

      return updatedWallet;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error adding coins:', error);
      throw error;
    }
  }

  /**
   * Deduct coins from wallet (admin operation)
   * @param {String} userId - User ID
   * @param {Number} amount - Amount to deduct
   * @param {String} reason - Reason for deduction
   * @returns {Promise<Object>} Updated wallet
   */
  async deductCoins(userId, amount, reason) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      // Get current balance
      let wallet = await walletRepository.findByUserId(userId);
      if (!wallet) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Wallet not found');
      }

      // Check sufficient balance
      if (wallet.coins < amount) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Insufficient coins');
      }

      const previousBalance = wallet.coins;

      // Deduct coins
      const updatedWallet = await walletRepository.deductCoins(userId, amount, reason);

      // Log transaction
      await transactionRepository.create({
        userId,
        type: 'admin_deduct',
        amount: -amount,
        reason,
        beforeBalance: previousBalance,
        afterBalance: updatedWallet.coins,
      });

      logger.info(`Deducted ${amount} coins from user ${userId}: ${reason}`);

      setImmediate(() => {
        notificationService
          .notifyWalletUpdate(userId, {
            amount,
            direction: 'debit',
            balanceAfter: updatedWallet.coins,
            reason: reason || 'Coins deducted',
            refId: userId,
          })
          .catch((e) => logger.error('notifyWalletUpdate failed:', e.message));
      });

      return updatedWallet;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error deducting coins:', error);
      throw error;
    }
  }

  /**
   * Freeze wallet (prevent transactions)
   * @param {String} userId - User ID
   * @param {String} reason - Freeze reason
   * @returns {Promise<Object>} Updated wallet
   */
  async freezeWallet(userId, reason) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      const wallet = await walletRepository.lockWallet(userId, reason);

      logger.warn(`Wallet frozen for user ${userId}: ${reason}`);

      return wallet;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error freezing wallet:', error);
      throw error;
    }
  }

  /**
   * Unfreeze wallet (allow transactions)
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated wallet
   */
  async unfreezeWallet(userId) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      const wallet = await walletRepository.unlockWallet(userId);

      logger.info(`Wallet unfrozen for user ${userId}`);

      return wallet;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error unfreezing wallet:', error);
      throw error;
    }
  }

  /**
   * Process game entry (deduct coins and lock wallet)
   * @param {String} userId - User ID
   * @param {Number} entryFee - Entry fee amount
   * @param {String} gameId - Game ID
   * @returns {Promise<Object>} Updated wallet
   */
  async processGameEntry(userId, entryFee, gameId, options = {}) {
    try {
      let wallet = await walletRepository.findByUserId(userId, options);
      if (!wallet) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Wallet not found');
      }

      if (!entryFee || entryFee <= 0) {
        return wallet;
      }

      // Check if wallet is locked
      if (wallet.isLocked) {
        throw new ApiError(HTTP_STATUS.CONFLICT, `Wallet is locked: ${wallet.lockedReason}`);
      }

      // Check sufficient balance
      if (wallet.coins < entryFee) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Insufficient coins for entry fee');
      }

      const previousBalance = wallet.coins;

      // Deduct entry fee
      const updatedWallet = await walletRepository.deductCoins(userId, entryFee, `Game entry: ${gameId}`, options);

      // Lock wallet during game
      await walletRepository.lockWallet(userId, `Game in progress: ${gameId}`, options);

      // Log transaction
      await transactionRepository.create({
        userId,
        type: 'game_entry',
        amount: -entryFee,
        reason: `Game entry fee for ${gameId}`,
        beforeBalance: previousBalance,
        afterBalance: updatedWallet.coins,
      }, options);

      logger.info(`Game entry processed for user ${userId}: ${entryFee} coins for game ${gameId}`);

      setImmediate(() => {
        notificationService
          .notifyWalletUpdate(userId, {
            amount: entryFee,
            direction: 'debit',
            balanceAfter: updatedWallet.coins,
            reason: 'Game entry fee',
            refId: gameId,
          })
          .catch((e) => logger.error('notifyWalletUpdate failed:', e.message));
      });

      return updatedWallet;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error processing game entry:', error);
      throw error;
    }
  }

  /**
   * Process game reward (add coins and unlock wallet)
   * @param {String} userId - User ID
   * @param {Number} rewardAmount - Reward amount
   * @param {String} gameId - Game ID
   * @returns {Promise<Object>} Updated wallet
   */
  async processGameReward(userId, rewardAmount, gameId, options = {}) {
    try {
      let wallet = await walletRepository.findByUserId(userId, options);
      if (!wallet) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Wallet not found');
      }

      if (!rewardAmount || rewardAmount <= 0) {
        await walletRepository.unlockWallet(userId, options);
        return wallet;
      }

      const previousBalance = wallet.coins;

      // Add reward
      const updatedWallet = await walletRepository.addCoins(userId, rewardAmount, `Game reward: ${gameId}`, options);

      // Unlock wallet
      await walletRepository.unlockWallet(userId, options);

      // Log transaction
      await transactionRepository.create({
        userId,
        type: 'game_reward',
        amount: rewardAmount,
        reason: `Game reward for ${gameId}`,
        beforeBalance: previousBalance,
        afterBalance: updatedWallet.coins,
      }, options);

      logger.info(`Game reward processed for user ${userId}: +${rewardAmount} coins for game ${gameId}`);

      setImmediate(() => {
        notificationService
          .notifyWalletUpdate(userId, {
            amount: rewardAmount,
            direction: 'credit',
            balanceAfter: updatedWallet.coins,
            reason: 'Game reward',
            refId: gameId,
          })
          .catch((e) => logger.error('notifyWalletUpdate failed:', e.message));
      });

      return updatedWallet;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error processing game reward:', error);
      throw error;
    }
  }

  /**
   * Get wallet statistics
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Wallet statistics
   */
  async getWalletStats(userId) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      const wallet = await walletRepository.findByUserId(userId);
      const coinStats = await transactionRepository.getUserCoinStats(userId);
      const summary = await transactionRepository.getTransactionSummary(userId);

      return {
        currentBalance: wallet?.coins || 0,
        totalEarned: coinStats.totalEarned || 0,
        totalSpent: coinStats.totalSpent || 0,
        netCoins: (coinStats.totalEarned || 0) - (coinStats.totalSpent || 0),
        transactionCount: coinStats.transactionCount || 0,
        transactionSummary: summary,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting wallet stats:', error);
      throw error;
    }
  }
}

module.exports = new WalletService();
