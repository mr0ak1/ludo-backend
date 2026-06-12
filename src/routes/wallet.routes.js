const express = require('express');
const walletController = require('../controllers/walletController');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/admin.middleware');

const router = express.Router();

/**
 * @route GET /api/v1/wallet
 * @desc Get wallet balance and details
 * @access Private
 */
router.get('/', authMiddleware, walletController.getWallet);

/**
 * @route GET /api/v1/wallet/history
 * @desc Get transaction history
 * @access Private
 */
router.get('/history', authMiddleware, walletController.getTransactionHistory);

/**
 * @route GET /api/v1/wallet/stats
 * @desc Get wallet statistics
 * @access Private
 */
router.get('/stats', authMiddleware, walletController.getWalletStats);

/**
 * @route POST /api/v1/wallet/request-withdrawal
 * @desc Request a withdrawal
 * @access Private
 */
router.post('/request-withdrawal', authMiddleware, walletController.requestWithdrawal);

/**
 * @route POST /api/v1/wallet/add
 * @desc Add coins to user wallet (admin only)
 * @access Private (Admin)
 */
router.post('/add', authMiddleware, adminMiddleware, walletController.addCoins);

/**
 * @route POST /api/v1/wallet/deduct
 * @desc Deduct coins from user wallet (admin only)
 * @access Private (Admin)
 */
router.post('/deduct', authMiddleware, adminMiddleware, walletController.deductCoins);

/**
 * @route POST /api/v1/wallet/freeze
 * @desc Freeze wallet to prevent transactions (admin only)
 * @access Private (Admin)
 */
router.post('/freeze', authMiddleware, adminMiddleware, walletController.freezeWallet);

/**
 * @route POST /api/v1/wallet/unfreeze
 * @desc Unfreeze wallet to allow transactions (admin only)
 * @access Private (Admin)
 */
router.post('/unfreeze', authMiddleware, adminMiddleware, walletController.unfreezeWallet);

module.exports = router;
