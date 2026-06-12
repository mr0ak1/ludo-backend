const { verifyToken } = require('../utils/generateToken');
const logger = require('../utils/logger');

/**
 * Socket.io Authentication Middleware
 * Decodes and verifies the JWT token provided during connection.
 * Binds the decoded user context onto the socket instance.
 */
const socketAuthMiddleware = (socket, next) => {
  try {
    // Try to get token from handshake auth, handshake headers, or handshake query
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization ||
      socket.handshake.query?.token;

    if (!token) {
      logger.warn(`[Socket Auth] Authentication failed for socket ${socket.id}: Token missing`);
      return next(new Error('Authentication error: Token required'));
    }

    let cleanToken = token;
    // Strip "Bearer " prefix if provided
    if (token.startsWith('Bearer ')) {
      cleanToken = token.slice(7);
    }

    const decoded = verifyToken(cleanToken);
    
    // Bind authenticated user context onto the socket
    socket.userId = decoded.userId;
    socket.user = decoded;
    
    logger.info(`[Socket Auth] Socket ${socket.id} authenticated successfully for user ${socket.userId}`);
    next();
  } catch (error) {
    logger.warn(`[Socket Auth] Authentication failed for socket ${socket.id}: ${error.message}`);
    return next(new Error('Authentication error: Invalid or expired token'));
  }
};

module.exports = socketAuthMiddleware;
