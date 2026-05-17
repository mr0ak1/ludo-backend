const authService = require('../services/authService');
const authValidator = require('../validators/authValidator');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

/**
 * Send OTP to phone
 * POST /api/v1/auth/send-otp
 */
const sendOtp = async (req, res, next) => {
  try {
    const { error, value } = authValidator.validateSendOtp(req.body);

    if (error) {
      const errors = authValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const { phone } = value;

    const result = await authService.sendOtp(phone);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'OTP sent successfully', result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP and create/login user
 * POST /api/v1/auth/verify-otp
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { error, value } = authValidator.validateVerifyOtp(req.body);

    if (error) {
      const errors = authValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const { phone, otp, sessionId, deviceToken } = value;

    const result = await authService.verifyOtpAndAuthenticate(
      phone,
      otp,
      sessionId
    );

    // Add device token if provided
    if (deviceToken) {
      await authService.addDeviceToken(result.user._id, deviceToken);
    }

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Authentication successful', result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh JWT token
 * POST /api/v1/auth/refresh-token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { error, value } = authValidator.validateRefreshToken(req.body);

    if (error) {
      const errors = authValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const { refreshToken: refreshTokenValue } = value;

    const result = await authService.refreshAccessToken(refreshTokenValue);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Token refreshed successfully', result)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { error, value } = authValidator.validateLogout(req.body);

    if (error) {
      const errors = authValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const userId = req.user.userId;
    const { deviceToken } = value;

    await authService.logout(userId, deviceToken);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Logged out successfully', null)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user profile
 * GET /api/v1/auth/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await authService.getProfile(userId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Profile retrieved successfully', user)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/v1/auth/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { error, value } = authValidator.validateUpdateProfile(req.body);

    if (error) {
      const errors = authValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const userId = req.user.userId;

    const updatedUser = await authService.updateProfile(userId, value);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Profile updated successfully', updatedUser)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 * DELETE /api/v1/auth/delete-account
 */
const deleteAccount = async (req, res, next) => {
  try {
    const { error, value } = authValidator.validateDeleteAccount(req.body);

    if (error) {
      const errors = authValidator.formatValidationErrors(error);
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
    }

    const userId = req.user.userId;
    const { reason } = value;

    await authService.deleteAccount(userId, reason);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Account deleted successfully', null)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Check user account status
 * GET /api/v1/auth/status
 * (Optional endpoint for checking ban/suspend status)
 */
const checkStatus = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const status = await authService.checkUserStatus(userId);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, 'Status retrieved successfully', status)
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  deleteAccount,
  checkStatus,
};
