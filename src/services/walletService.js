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
  async addCoins(userId, amount, arg3, arg4) {
    let type = 'admin_add';
    let reason = arg3;
    
    if (arg4 !== undefined) {
      type = arg3;
      reason = arg4;
    } else if (typeof arg3 === 'string') {
      const lower = arg3.toLowerCase();
      if (lower.includes('referral')) type = 'referral_bonus';
      else if (lower.includes('deposit')) type = 'deposit';
      else if (lower.includes('refund')) type = 'refund';
    }

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
        type,
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
  async deductCoins(userId, amount, arg3, arg4) {
    let type = 'admin_deduct';
    let reason = arg3;
    
    if (arg4 !== undefined) {
      type = arg3;
      reason = arg4;
    } else if (typeof arg3 === 'string') {
      const lower = arg3.toLowerCase();
      if (lower.includes('withdrawal')) type = 'withdrawal';
      else if (lower.includes('penalty')) type = 'penalty';
    }

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
        type,
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
   * Request withdrawal (User)
   * @param {String} userId - User ID
   * @param {Number} amount - Amount to withdraw
   * @param {String} paymentMethod - Target method
   */
  async requestWithdrawal(userId, amount, paymentMethod) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');

      let wallet = await walletRepository.findByUserId(userId);
      if (!wallet || wallet.coins < amount) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Insufficient coins');
      }

      if (wallet.isLocked) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Wallet is locked: ' + wallet.lockedReason);
      }

      const previousBalance = wallet.coins;

      // Deduct coins pending approval
      const updatedWallet = await walletRepository.deductCoins(userId, amount, 'Withdrawal request');

      const cutAmount = Number((amount * 0.82).toFixed(2));

      // Log transaction as pending withdrawal
      const tx = await transactionRepository.create({
        userId,
        type: 'withdrawal',
        amount: -cutAmount,
        reason: 'Withdrawal to ' + paymentMethod,
        beforeBalance: previousBalance,
        afterBalance: updatedWallet.coins,
        status: 'pending',
        metadata: { paymentMethod, originalAmount: amount, fee: amount - cutAmount }
      });

      logger.info(`User ${userId} requested withdrawal of ${amount}`);

      return { wallet: updatedWallet, transaction: tx };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error requesting withdrawal:', error);
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
        // Extract the locked game's ID from the reason string, e.g. "Game in progress: abc123"
        const lockedGameIdMatch = wallet.lockedReason
          ? wallet.lockedReason.match(/Game in progress[:\s]+(\S+)/i)
          : null;
        const lockedGameId = lockedGameIdMatch ? lockedGameIdMatch[1] : null;

        if (lockedGameId) {
          // Check if that game is still active
          try {
            const gameRepository = require('../repositories/gameRepository');
            const lockedGame = await gameRepository.findById(lockedGameId);
            const isStillActive = lockedGame && lockedGame.status === 'active';

            if (!isStillActive) {
              // Game is gone or ended — stale lock, auto-unlock and proceed
              logger.warn(`Auto-unlocking stale wallet lock for user ${userId}. Locked game ${lockedGameId} is no longer active (status: ${lockedGame?.status ?? 'not found'}).`);
              await walletRepository.unlockWallet(userId);
              wallet = await walletRepository.findByUserId(userId, options);
              // Fall through to process the entry normally
            } else {
              // Game is genuinely still running — block
              throw new ApiError(HTTP_STATUS.CONFLICT, `Wallet is locked: ${wallet.lockedReason}`);
            }
          } catch (checkErr) {
            if (checkErr instanceof ApiError) throw checkErr;
            // If check itself fails, fall back to throwing 409 to be safe
            logger.error('Error checking locked game status:', checkErr.message);
            throw new ApiError(HTTP_STATUS.CONFLICT, `Wallet is locked: ${wallet.lockedReason}`);
          }
        } else {
          // No game ID in reason — hard lock (admin freeze etc.)
          throw new ApiError(HTTP_STATUS.CONFLICT, `Wallet is locked: ${wallet.lockedReason}`);
        }
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

      // Unlock wallet BEFORE adding coins, because locked wallets reject coin additions
      await walletRepository.unlockWallet(userId, options);

      let updatedWallet = wallet;
      // Add reward if applicable
      if (rewardAmount > 0) {
        updatedWallet = await walletRepository.addCoins(userId, rewardAmount, `Game reward: ${gameId}`, options);
      }
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
  /**
   * Initiate deposit via EKQR
   */
  async initiateDeposit(userId, amount, backendUrl) {
    if (amount < 10) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Minimum deposit amount is ₹10');
    }

    const BotConfig = require('../models/botConfig.model');
    const config = await BotConfig.findOne();
    const gatewayKey = config?.paymentGatewayKey;
    
    if (!gatewayKey) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Payment gateway key not configured by admin.");
    }

    const User = require('../models/user.model');
    const user = await User.findByPk(userId);

    const client_txn_id = String(Math.floor(Math.random() * 900000) + 100000);
    const txn_date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    
    // Create pending transaction
    const Transaction = require('../models/transaction.model');
    await Transaction.create({
      userId,
      amount,
      type: 'deposit',
      reason: 'Wallet Deposit via UPI',
      status: 'pending',
      transactionId: client_txn_id,
      metadata: { txn_date }
    });

    const redirect_url = `${backendUrl}/api/v1/wallet/payment-redirect?client_txn_id=${client_txn_id}&txn_date=${txn_date}`;
    
    const rawPhone = String(user?.phone || '9999999999').replace(/\D/g, '');
    const safePhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone.padStart(10, '9');

    const payload = {
      key: gatewayKey,
      client_txn_id,
      amount: String(amount),
      p_info: "Wallet Deposit",
      customer_name: user?.name || "Ludo Player",
      customer_email: user?.email || "user@ludogame.com",
      customer_mobile: safePhone,
      redirect_url,
      txn_date,
      udf1: String(userId)
    };

    try {
      const response = await fetch("https://api.ekqr.in/api/create_order", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.status === true && result.data?.payment_url) {
        return { paymentUrl: result.data.payment_url };
      } else {
        throw new Error(result.msg || 'Unknown Error from gateway');
      }
    } catch (err) {
      logger.error('EKQR API Error: ' + err.message);
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to initiate payment: " + err.message);
    }
  }

  /**
   * Verify deposit callback from EKQR
   */
  async verifyDepositCallback(client_txn_id, txn_date) {
    if (!client_txn_id || !txn_date) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing callback parameters");
    }

    const Transaction = require('../models/transaction.model');
    const txn = await Transaction.findOne({ where: { transactionId: client_txn_id, type: 'deposit' } });

    if (!txn) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Transaction not found");
    }

    if (txn.status === 'completed' || txn.status === 'processing') {
      return { success: true, message: "Transaction already processed", amount: txn.amount };
    }

    // Atomically mark as processing to prevent concurrent requests from double-crediting
    const [updatedCount] = await Transaction.update(
      { status: 'processing' },
      { where: { transactionId: client_txn_id, status: 'pending' } }
    );

    if (updatedCount === 0) {
      return { success: true, message: "Transaction is already being processed", amount: txn.amount };
    }

    const BotConfig = require('../models/botConfig.model');
    const config = await BotConfig.findOne();
    const gatewayKey = config?.paymentGatewayKey;

    if (!gatewayKey) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Payment gateway key not configured");
    }

    try {
      const payload = new URLSearchParams();
      payload.append('key', gatewayKey);
      payload.append('client_txn_id', client_txn_id);
      payload.append('txn_date', txn_date);

      const response = await fetch("https://api.ekqr.in/api/check_order_status", {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString()
      });
      const resultData = await response.json();

      if (
        response.status === 200 &&
        resultData.status === true &&
        resultData.data?.status?.toLowerCase() === 'success'
      ) {
        // Payment success, add funds
        const amount = txn.amount;
        const bonus = (amount >= 100) ? Number((amount * 0.05).toFixed(2)) : 0;
        const totalCredit = amount + bonus;

        const wallet = await walletRepository.findByUserId(txn.userId);
        const previousBalance = wallet ? wallet.coins : 0;
        
        const updatedWallet = await walletRepository.addCoins(txn.userId, totalCredit, `UPI Deposit (Bonus: ${bonus})`);
        
        txn.amount = totalCredit; // Update amount if bonus was added
        txn.beforeBalance = previousBalance;
        txn.afterBalance = updatedWallet.coins;
        txn.status = 'completed';
        txn.reason = `UPI Deposit (Bonus: ${bonus})`;
        await txn.save();

        setImmediate(() => {
          notificationService
            .notifyWalletUpdate(txn.userId, {
              amount: totalCredit,
              direction: 'credit',
              balanceAfter: updatedWallet.coins,
              reason: `UPI Deposit (Bonus: ${bonus})`,
              refId: txn.transactionId,
            })
            .catch((e) => logger.error('notifyWalletUpdate failed:', e.message));
        });

        return { success: true, amount: totalCredit };
      } else {
        // Payment failed or not success
        txn.status = 'failed';
        await txn.save();
        return { success: false, message: "Payment was not successful" };
      }
    } catch (err) {
      logger.error('EKQR Verification Error: ' + err.message);
      // Reset status back to pending so it can be retried
      if (txn) {
        txn.status = 'pending';
        await txn.save().catch(e => logger.error('Failed to reset txn status', e));
      }
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Verification failed");
    }
  }

  /**
   * Verify all pending deposits for a user
   */
  async verifyPendingDeposits(userId) {
    const Transaction = require('../models/transaction.model');
    const pendingTxns = await Transaction.findAll({
      where: { userId, type: 'deposit', status: 'pending' }
    });

    if (!pendingTxns.length) {
      return { updated: false };
    }

    let updated = false;
    for (const txn of pendingTxns) {
      try {
        const result = await this.verifyDepositCallback(txn.transactionId, txn.metadata?.txn_date);
        if (result.success) {
          updated = true;
        }
      } catch (err) {
        // ignore errors for individual pending checks
        logger.error(`Failed to verify pending txn ${txn.transactionId}: ${err.message}`);
      }
    }
    return { updated };
  }
  /**
   * Submit manual deposit with UTR
   */
  async submitManualDeposit(userId, amount, utr) {
    if (amount < 10) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Minimum deposit amount is ₹10');
    }

    if (!utr || utr.length < 10) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Valid UTR is required');
    }

    const { sequelize } = require('../config/db');
    const Transaction = require('../models/transaction.model');
    
    // Check if UTR already exists to prevent duplicate submission
    const existing = await Transaction.findOne({
      where: sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.utr')) = ${sequelize.escape(utr)}`)
    });
    if (existing) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'UTR already submitted');
    }

    const client_txn_id = 'MANUAL_' + Date.now();
    
    // Create pending transaction
    const txn = await Transaction.create({
      userId,
      amount,
      type: 'deposit',
      reason: 'Manual UPI Deposit (Pending Admin Approval)',
      status: 'pending',
      transactionId: client_txn_id,
      metadata: { utr }
    });

    return { success: true, transactionId: txn.transactionId };
  }
}

module.exports = new WalletService();
