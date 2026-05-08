const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// TODO: POST /chat/send - Send chat message
router.post('/send', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: GET /chat/:gameId - Get chat history
router.get('/:gameId', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

module.exports = router;
