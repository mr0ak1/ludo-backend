const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const chatController = require('../controllers/chatController');

const router = express.Router();

router.get('/:gameId', authMiddleware, chatController.getChatHistory);
router.post('/:gameId/message', authMiddleware, chatController.sendMessage);

module.exports = router;
