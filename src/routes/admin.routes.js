const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminMiddleware } = require('../middlewares/admin.middleware');

const router = express.Router();

// TODO: POST /admin/login - Admin login
router.post('/login', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: GET /admin/dashboard - Get dashboard analytics
router.get('/dashboard', authMiddleware, adminMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: GET /admin/users - Get all users
router.get('/users', authMiddleware, adminMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: GET /admin/user/:id - Get single user
router.get('/user/:id', authMiddleware, adminMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: POST /admin/ban-user - Ban user
router.post('/ban-user', authMiddleware, adminMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: POST /admin/suspend-user - Suspend user
router.post('/suspend-user', authMiddleware, adminMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: GET /admin/games - Get all games
router.get('/games', authMiddleware, adminMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: GET /admin/live-games - Get live games
router.get('/live-games', authMiddleware, adminMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: POST /admin/force-end-game - Force end game
router.post('/force-end-game', authMiddleware, adminMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: POST /admin/wallet-adjustment - Adjust wallet
router.post('/wallet-adjustment', authMiddleware, adminMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: GET /admin/revenue - Get revenue analytics
router.get('/revenue', authMiddleware, adminMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

module.exports = router;
