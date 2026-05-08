const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// TODO: POST /auth/verify - Verify Firebase token and create JWT
router.post('/verify', (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: POST /auth/refresh-token - Refresh JWT token
router.post('/refresh-token', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: POST /auth/logout - Logout user
router.post('/logout', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: GET /auth/profile - Get user profile
router.get('/profile', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: PUT /auth/profile - Update user profile
router.put('/profile', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: DELETE /auth/delete-account - Delete user account
router.delete('/delete-account', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

module.exports = router;
