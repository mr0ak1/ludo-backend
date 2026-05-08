const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// TODO: POST /notification/register-device - Register device token
router.post('/register-device', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// TODO: POST /notification/send - Send push notification
router.post('/send', authMiddleware, (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

module.exports = router;
