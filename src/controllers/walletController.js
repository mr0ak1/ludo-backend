const walletService = require('../services/walletService');
const walletValidator = require('../validators/walletValidator');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

/**
 * Get wallet balance
 * GET /api/v1/wallet
 */
const getWallet = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const wallet = await walletService.getWallet(userId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Wallet retrieved successfully', wallet)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction history
 * GET /api/v1/wallet/history
 */
const getTransactionHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { error, value } = walletValidator.validateGetTransactionHistory(req.query);

    if (error) {
      const errors = walletValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const { page, limit, type, startDate, endDate, minAmount, maxAmount } = value;

    const filters = {};
    if (type) filters.type = type;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (minAmount) filters.minAmount = minAmount;
    if (maxAmount) filters.maxAmount = maxAmount;

    const result = await walletService.getTransactionHistory(userId, filters, { page, limit });

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Transaction history retrieved successfully', result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Add coins (admin only)
 * POST /api/v1/wallet/add
 */
const addCoins = async (req, res, next) => {
  try {
    const { error, value } = walletValidator.validateAddCoins(req.body);

    if (error) {
      const errors = walletValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const { userId, amount, reason } = value;

    const wallet = await walletService.addCoins(userId, amount, reason);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Coins added successfully', wallet)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Deduct coins (admin only)
 * POST /api/v1/wallet/deduct
 */
const deductCoins = async (req, res, next) => {
  try {
    const { error, value } = walletValidator.validateDeductCoins(req.body);

    if (error) {
      const errors = walletValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const { userId, amount, reason } = value;

    const wallet = await walletService.deductCoins(userId, amount, reason);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Coins deducted successfully', wallet)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Freeze wallet (admin only)
 * POST /api/v1/wallet/freeze
 */
const freezeWallet = async (req, res, next) => {
  try {
    const { error, value } = walletValidator.validateFreezeWallet(req.body);

    if (error) {
      const errors = walletValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const { userId, reason } = value;

    const wallet = await walletService.freezeWallet(userId, reason);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Wallet frozen successfully', wallet)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Unfreeze wallet (admin only)
 * POST /api/v1/wallet/unfreeze
 */
const unfreezeWallet = async (req, res, next) => {
  try {
    const { error, value } = walletValidator.validateUnfreezeWallet(req.body);

    if (error) {
      const errors = walletValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const { userId } = value;

    const wallet = await walletService.unfreezeWallet(userId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Wallet unfrozen successfully', wallet)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get wallet statistics
 * GET /api/v1/wallet/stats
 */
const getWalletStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const stats = await walletService.getWalletStats(userId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Wallet statistics retrieved successfully', stats)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Request a withdrawal (User)
 * POST /api/v1/wallet/request-withdrawal
 */
const requestWithdrawal = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    let { amount, paymentMethod } = req.body;
    
    amount = parseInt(amount, 10);

    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid withdrawal amount');
    }
    if (!paymentMethod) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Payment method required');
    }

    const result = await walletService.requestWithdrawal(userId, amount, paymentMethod);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Withdrawal request submitted successfully', result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Initiate Deposit
 * POST /api/v1/wallet/deposit
 */
const initiateDeposit = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount < 10) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Valid amount (min 10) is required');
    }

    const result = await walletService.initiateDeposit(userId, Number(amount));

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Deposit initiated', result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Deposit Callback
 * GET /api/v1/wallet/deposit/callback
 */
const verifyDepositCallback = async (req, res, next) => {
  try {
    const { client_txn_id, txn_date } = req.query;

    if (!client_txn_id || !txn_date) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Missing callback parameters');
    }

    await walletService.verifyDepositCallback(client_txn_id, txn_date);

    // Redirect to frontend or return success
    // Depending on integration we might want to redirect.
    const redirectUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${redirectUrl}/wallet?deposit=success`);
  } catch (error) {
    // If it fails, still redirect but with error
    const redirectUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${redirectUrl}/wallet?deposit=failed`);
  }
};

/**
 * Verify Pending Deposits
 * POST /api/v1/wallet/deposit/verify-pending
 */
const verifyPendingDeposits = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await walletService.verifyPendingDeposits(userId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Pending deposits verified', result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get Deposit Config
 * GET /api/v1/wallet/deposit-config
 */
const getDepositConfig = async (req, res, next) => {
  try {
    const BotConfig = require('../models/botConfig.model');
    const config = await BotConfig.findOne();
    
    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Deposit config retrieved', {
        upiId: config?.upiId || '',
        paytmMerchantId: config?.paytmMerchantId || ''
      })
    );
  } catch (error) {
    next(error);
  }
};


/**
 * Submit Manual Deposit
 * POST /api/v1/wallet/deposit/manual
 */
const submitManualDeposit = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { amount, utr } = req.body;

    const result = await walletService.submitManualDeposit(userId, Number(amount), utr);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Manual deposit submitted for review', result)
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWallet,
  getTransactionHistory,
  addCoins,
  deductCoins,
  freezeWallet,
  unfreezeWallet,
  getWalletStats,
  requestWithdrawal,
  initiateDeposit,
  verifyDepositCallback,
  verifyPendingDeposits,
  getDepositConfig,
  submitManualDeposit,
};
