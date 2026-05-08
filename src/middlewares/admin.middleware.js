const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');

/**
 * Admin Middleware - Verify Admin Role
 */
const adminMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin Middleware - Verify Super Admin Role
 */
const superAdminMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    if (req.user.role !== 'super_admin') {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Super admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminMiddleware,
  superAdminMiddleware,
};
