const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const userRepository = require('../repositories/userRepository');

/**
 * Admin Middleware - Verify Admin Role
 */
const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    // Check if user has admin role in token
    if (req.user.role === 'admin' || req.user.isAdmin === true) {
      return next();
    }

    // Verify from database as well for additional security
    const user = await userRepository.findById(req.user.userId);
    if (!user || !user.isAdmin) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Admin access required');
    }

    // Update req.user with isAdmin flag
    req.user.isAdmin = true;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin Middleware - Verify Super Admin Role
 */
const superAdminMiddleware = async (req, res, next) => {
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
