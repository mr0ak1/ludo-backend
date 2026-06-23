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

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const backendUrl = process.env.BACKEND_URL || (host ? `${protocol}://${host}` : 'https://ludocash.co');

    const result = await walletService.initiateDeposit(userId, Number(amount), backendUrl);

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

/**
 * Handle payment redirect to return user back to the app via deep link
 * GET /api/v1/wallet/payment-redirect
 */
const handlePaymentRedirect = async (req, res, next) => {
  try {
    const { client_txn_id, txn_date } = req.query;
    const deepLinkUrl = `ludofrontend://payment-callback?client_txn_id=${client_txn_id}&txn_date=${txn_date}`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Completed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            text-align: center;
            padding: 40px 20px;
            background-color: #0c1232;
            color: #ffffff;
          }
          .card {
            background-color: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 30px 20px;
            max-width: 400px;
            margin: 0 auto;
          }
          h2 { color: #10b981; margin-top: 0; }
          p { color: #cbd5e1; font-size: 14px; line-height: 1.5; }
          .btn {
            display: inline-block;
            background: linear-gradient(90deg, #3aa9ff, #0d47a1);
            color: #fff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: bold;
            margin-top: 20px;
            font-size: 14px;
          }
          .loader {
            border: 3px solid rgba(255,255,255,0.1);
            border-top: 3px solid #3aa9ff;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            margin: 20px auto 0 auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Payment Completed</h2>
          <p>Your payment is being processed. You are being redirected back to the Ludo Game app...</p>
          <div class="loader"></div>
          <a class="btn" href="${deepLinkUrl}">Open Ludo App</a>
        </div>
        <script>
          // Attempt redirect immediately
          window.location.href = "${deepLinkUrl}";
          // Fallback redirect after 2 seconds
          setTimeout(function() {
            window.location.href = "${deepLinkUrl}";
          }, 2000);
        </script>
      </body>
      </html>
    `);
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
  handlePaymentRedirect,
};
