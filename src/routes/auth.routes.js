const express = require('express');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @route POST /api/v1/auth/send-otp
 * @desc Send OTP to user's phone
 * @access Public
 */
router.post('/send-otp', authLimiter, authController.sendOtp);

/**
 * @route POST /api/v1/auth/verify-otp
 * @desc Verify OTP and login/register user
 * @access Public
 */
router.post('/verify-otp', authLimiter, authController.verifyOtp);

/**
 * @route POST /api/v1/auth/verify
 * @desc Backward-compatible alias for OTP verification
 * @access Public
 */
router.post('/verify', authLimiter, authController.verifyOtp);

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
 * @route GET /api/v1/auth/referral-history
 * @desc Get user referral history
 * @access Private
 */
router.get('/referral-history', authMiddleware, authController.getReferralHistory);

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

/**
 * @route GET /api/v1/auth/settings
 * @desc Get public settings (WhatsApp number, etc.)
 * @access Public
 */
router.get('/settings', authController.getPublicSettings);

module.exports = router;
