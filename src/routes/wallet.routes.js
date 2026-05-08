const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// TODO: GET /wallet - Get wallet balance
router.get('/', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: GET /wallet/history - Get transaction history
router.get('/history', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: POST /wallet/add - Add coins (Admin only)
router.post('/add', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: POST /wallet/deduct - Deduct coins (Admin only)
router.post('/deduct', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: POST /wallet/freeze - Freeze wallet
router.post('/freeze', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: POST /wallet/unfreeze - Unfreeze wallet
router.post('/unfreeze', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

module.exports = router;
