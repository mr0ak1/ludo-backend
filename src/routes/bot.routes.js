const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// TODO: POST /bot/move - Get bot move
router.post('/move', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: POST /bot/difficulty - Set bot difficulty
router.post('/difficulty', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

module.exports = router;
