const { extractTokenFromHeader, verifyToken } = require('../utils/generateToken');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');

/**
 * Auth Middleware - Verify JWT Token
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Authorization header missing');
    }

    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid token format');
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional Auth Middleware - Verify JWT if provided
 */
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);

      if (token) {
        try {
          const decoded = verifyToken(token);
          req.user = decoded;
          req.token = token;
        } catch (error) {
          // Token is invalid but auth is optional, so continue
          console.warn('Invalid token provided but auth is optional');
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
};
