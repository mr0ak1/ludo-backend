const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

/**
 * @route GET /api/v1/notification
 * @desc List current user's notifications (paginated)
 */
router.get('/', authMiddleware, notificationController.getNotifications);

/**
 * @route PUT /api/v1/notification/:notificationId/read
 * @desc Mark one notification as read
 */
router.put('/:notificationId/read', authMiddleware, notificationController.markAsRead);

/**
 * @route POST /api/v1/notification/register-device
 * @desc Register or refresh FCM device token on the user
 */
router.post('/register-device', authMiddleware, notificationController.registerDevice);

/**
 * @route GET /api/v1/notification/latest-popup
 * @desc Get the latest active in-app popup
 */
router.get('/latest-popup', authMiddleware, notificationController.getLatestPopup);

module.exports = router;
