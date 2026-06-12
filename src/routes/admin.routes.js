const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/admin.middleware');
const adminController = require('../controllers/adminController');

const router = express.Router();

/**
 * @route POST /admin/login
 * @desc Admin login with OTP
 * @access Public
 */
router.post('/login', adminController.adminLogin);

/**
 * @route GET /admin/dashboard
 * @desc Get dashboard analytics
 * @access Private (Admin)
 */
router.get('/dashboard', authMiddleware, adminMiddleware, adminController.getDashboard);

/**
 * @route GET /admin/users
 * @desc Get all users with pagination and filters
 * @access Private (Admin)
 */
router.get('/users', authMiddleware, adminMiddleware, adminController.getAllUsers);

/**
 * @route GET /admin/user/:id
 * @desc Get single user details
 * @access Private (Admin)
 */
router.get('/user/:id', authMiddleware, adminMiddleware, adminController.getUser);

/**
 * @route GET /admin/user/:id/withdrawals
 * @desc Get user withdrawal history
 * @access Private (Admin)
 */
router.get('/user/:id/withdrawals', authMiddleware, adminMiddleware, adminController.getUserWithdrawals);

/**
 * @route GET /admin/withdrawals
 * @desc Get all platform withdrawal requests
 * @access Private (Admin)
 */
router.get('/withdrawals', authMiddleware, adminMiddleware, adminController.getAllWithdrawals);

/**
 * @route POST /admin/withdrawals/:id/approve
 * @desc Approve a withdrawal request
 * @access Private (Admin)
 */
router.post('/withdrawals/:id/approve', authMiddleware, adminMiddleware, adminController.approveWithdrawal);

/**
 * @route POST /admin/withdrawals/:id/reject
 * @desc Reject a withdrawal request
 * @access Private (Admin)
 */
router.post('/withdrawals/:id/reject', authMiddleware, adminMiddleware, adminController.rejectWithdrawal);

/**
 * @route POST /admin/ban-user
 * @desc Ban a user
 * @access Private (Admin)
 */
router.post('/ban-user', authMiddleware, adminMiddleware, adminController.banUser);

/**
 * @route POST /admin/suspend-user
 * @desc Suspend a user
 * @access Private (Admin)
 */
router.post('/suspend-user', authMiddleware, adminMiddleware, adminController.suspendUser);

/**
 * @route POST /admin/toggle-withdraw
 * @desc Toggle withdraw capability for a user
 * @access Private (Admin)
 */
router.post('/toggle-withdraw', authMiddleware, adminMiddleware, adminController.toggleWithdraw);

/**
 * @route POST /admin/toggle-gameplay
 * @desc Toggle gameplay capability for a user
 * @access Private (Admin)
 */
router.post('/toggle-gameplay', authMiddleware, adminMiddleware, adminController.toggleGameplay);

/**
 * @route GET /admin/games
 * @desc Get all games with filters
 * @access Private (Admin)
 */
router.get('/games', authMiddleware, adminMiddleware, adminController.getAllGames);

/**
 * @route GET /admin/live-games
 * @desc Get live/active games
 * @access Private (Admin)
 */
router.get('/live-games', authMiddleware, adminMiddleware, adminController.getLiveGames);

/**
 * @route POST /admin/force-end-game
 * @desc Force end a game
 * @access Private (Admin)
 */
router.post('/force-end-game', authMiddleware, adminMiddleware, adminController.forceEndGame);

/**
 * @route POST /admin/wallet-adjustment
 * @desc Adjust user wallet (add/deduct coins)
 * @access Private (Admin)
 */
router.post('/wallet-adjustment', authMiddleware, adminMiddleware, adminController.adjustWallet);

/**
 * @route POST /admin/set-difficulty
 * @desc Set global bot difficulty level
 * @access Private (Admin)
 */
router.post('/set-difficulty', authMiddleware, adminMiddleware, adminController.setBotDifficulty);

/**
 * @route POST /admin/set-hard-mode-threshold
 * @desc Set threshold for auto hard mode
 * @access Private (Admin)
 */
router.post('/set-hard-mode-threshold', authMiddleware, adminMiddleware, adminController.setHardModeThreshold);

/**
 * @route POST /admin/set-game-difficulty
 * @desc Set bot difficulty for a specific live game
 * @access Private (Admin)
 */
router.post('/set-game-difficulty', authMiddleware, adminMiddleware, adminController.setGameDifficulty);

/**
 * @route GET /admin/get-difficulty
 * @desc Get current global bot difficulty level
 * @access Private (Admin)
 */
router.get('/get-difficulty', authMiddleware, adminMiddleware, adminController.getBotDifficulty);

/**
 * @route GET /admin/revenue
 * @desc Get revenue analytics
 * @access Private (Admin)
 */
router.get('/revenue', authMiddleware, adminMiddleware, adminController.getRevenue);

/**
 * @route GET /admin/transaction-summary
 * @desc Get transaction summary (deposits vs withdrawals)
 * @access Private (Admin)
 */
router.get('/transaction-summary', authMiddleware, adminMiddleware, adminController.getTransactionSummary);

/**
 * @route GET /admin/live-stats
 * @desc Get live statistics
 * @access Private (Admin)
 */
router.get('/live-stats', authMiddleware, adminMiddleware, adminController.getLiveStats);

/**
 * @route GET /admin/probability-config
 * @desc Get probability manager configuration
 * @access Private (Admin)
 */
router.get('/probability-config', authMiddleware, adminMiddleware, adminController.getProbabilityConfig);

/**
 * @route POST /admin/probability-config
 * @desc Update probability manager configuration
 * @access Private (Admin)
 */
router.post('/probability-config', authMiddleware, adminMiddleware, adminController.setProbabilityConfig);

/**
 * @route POST /admin/send-notification
 * @desc Send a notification to users
 * @access Private (Admin)
 */
router.post('/send-notification', authMiddleware, adminMiddleware, adminController.sendNotification);

/**
 * @route GET /admin/notification-history
 * @desc Get sent notifications history
 * @access Private (Admin)
 */
router.get('/notification-history', authMiddleware, adminMiddleware, adminController.getNotificationHistory);

// ================= LOBBY GAMES MANAGEMENT =================

/**
 * @route GET /admin/lobby-games
 * @desc Get all lobby games
 * @access Private (Admin)
 */
router.get('/lobby-games', authMiddleware, adminMiddleware, adminController.getLobbyGames);

/**
 * @route POST /admin/lobby-games
 * @desc Create a lobby game
 * @access Private (Admin)
 */
router.post('/lobby-games', authMiddleware, adminMiddleware, adminController.createLobbyGame);

/**
 * @route PUT /admin/lobby-games/:id
 * @desc Update a lobby game
 * @access Private (Admin)
 */
router.put('/lobby-games/:id', authMiddleware, adminMiddleware, adminController.updateLobbyGame);

/**
 * @route DELETE /admin/lobby-games/:id
 * @desc Delete a lobby game
 * @access Private (Admin)
 */
router.delete('/lobby-games/:id', authMiddleware, adminMiddleware, adminController.deleteLobbyGame);

module.exports = router;
