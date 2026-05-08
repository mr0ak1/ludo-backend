const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// TODO: GET /stats - Get player stats
router.get('/', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: GET /stats/match-history - Get match history
router.get('/match-history', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: GET /stats/win-rate - Get win rate
router.get('/win-rate', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: GET /stats/leaderboard - Get leaderboard
router.get('/leaderboard', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

module.exports = router;
