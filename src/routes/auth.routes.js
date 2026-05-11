const express = require('express');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @route POST /api/v1/auth/verify
 * @desc Verify Firebase token and create JWT
 * @access Public
 */
router.post('/verify', authController.verifyFirebaseToken);

/**
 * @route POST /api/v1/auth/refresh-token
 * @desc Refresh JWT token
 * @access Public
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user and remove device token
 * @access Private
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @route GET /api/v1/auth/profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', authMiddleware, authController.getProfile);

/**
 * @route PUT /api/v1/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', authMiddleware, authController.updateProfile);

/**
 * @route DELETE /api/v1/auth/delete-account
 * @desc Delete user account
 * @access Private
 */
router.delete('/delete-account', authMiddleware, authController.deleteAccount);

/**
 * @route GET /api/v1/auth/status
 * @desc Check user account status (ban/suspend)
 * @access Private
 */
router.get('/status', authMiddleware, authController.checkStatus);

module.exports = router;
