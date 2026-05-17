const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const botController = require('../controllers/botController');

const router = express.Router();

/**
 * POST /api/v1/bot/create-game
 * Create a new game against a bot opponent
 * Body: {
 *   difficulty?: 'easy' | 'medium' | 'hard' (default: 'medium'),
 *   entryFee?: number (default: 0)
 * }
 */
router.post('/create-game', authMiddleware, botController.createBotGame);

/**
 * GET /api/v1/bot/difficulties
 * Get list of available bot difficulty levels with descriptions
 */
router.get('/difficulties', authMiddleware, botController.getBotDifficulties);

module.exports = router;
