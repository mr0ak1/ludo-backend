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

module.exports = {
  getWallet,
  getTransactionHistory,
  addCoins,
  deductCoins,
  freezeWallet,
  unfreezeWallet,
  getWalletStats,
};
