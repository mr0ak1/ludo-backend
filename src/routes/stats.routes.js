const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const statsController = require('../controllers/statsController');

const router = express.Router();

/**
 * @route GET /api/v1/stats/me
 * @desc Personal stats (Cluster 9)
 */
router.get('/me', authMiddleware, statsController.getMyStats);

/**
 * @route GET /api/v1/stats/leaderboard
 * @desc Top 100 ranked players (cached ~1h)
 */
router.get('/leaderboard', statsController.getLeaderboard);

/**
 * @route GET /api/v1/stats/history
 * @desc Paginated match history for current user
 */
router.get('/history', authMiddleware, statsController.getMatchHistory);

/**
 * @route GET /api/v1/stats/player/:userId
 * @desc Public profile stats for another player
 */
router.get('/player/:userId', statsController.getPlayerStats);

module.exports = router;
