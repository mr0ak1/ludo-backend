const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_TYPES } = require('../constants/http.constants');

/**
 * Global Error Handler Middleware
 */
const errorMiddleware = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Default error
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    message = 'Validation error';
  } else if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Invalid ID format';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token expired';
  } else if (err.name === 'MongoError') {
    statusCode = HTTP_STATUS.CONFLICT;
    message = 'Database error';
  }

  // Send error response
  return ApiResponse.error(res, statusCode, message, {
    type: err.type || ERROR_TYPES.INTERNAL_ERROR,
    details: process.env.NODE_ENV === 'development' ? err : {},
  });
};

module.exports = errorMiddleware;
