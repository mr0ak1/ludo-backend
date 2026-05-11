const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const gameController = require('../controllers/gameController');

const router = express.Router();

// GET /game/active - Get active game
router.get('/active', authMiddleware, gameController.getActiveGame);

// GET /game/history - Get game history
router.get('/history', authMiddleware, gameController.getGameHistory);

// GET /game/waiting - Get waiting games
router.get('/waiting', authMiddleware, gameController.getWaitingGames);

// GET /game/leaderboard - Get leaderboard
router.get('/leaderboard', authMiddleware, gameController.getLeaderboard);

// POST /game/practice/create - Create practice game
router.post('/practice/create', authMiddleware, gameController.createPracticeGame);

// POST /game/cash/create - Create cash game
router.post('/cash/create', authMiddleware, gameController.createCashGame);

// POST /game/join - Join existing game
router.post('/join', authMiddleware, gameController.joinGame);

// POST /game/roll-dice - Roll dice
router.post('/roll-dice', authMiddleware, gameController.rollDice);

// POST /game/move-token - Move token
router.post('/move-token', authMiddleware, gameController.moveToken);

// POST /game/skip-turn - Skip turn
router.post('/skip-turn', authMiddleware, gameController.skipTurn);

// POST /game/surrender - Surrender game
router.post('/surrender', authMiddleware, gameController.surrenderGame);

// POST /game/end - End game
router.post('/end', authMiddleware, gameController.endGame);

// POST /game/reconnect - Reconnect to game
router.post('/reconnect', authMiddleware, gameController.reconnect);

// GET /game/restore/:gameId - Restore game state
router.get('/restore/:gameId', authMiddleware, gameController.restoreGameState);

// GET /game/:gameId - Get game details
router.get('/:gameId', authMiddleware, gameController.getGameDetails);

module.exports = router;
