const { HTTP_STATUS, RESPONSE_MESSAGES, API_RESPONSE_CODES } = require('../constants/http.constants');

/**
 * Standard API Response Class
 */
class ApiResponse {
  constructor(statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  /**
   * Send success response
   */
  static success(res, statusCode = HTTP_STATUS.OK, message = RESPONSE_MESSAGES.SUCCESS, data = null) {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send error response
   */
  static error(res, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, message = RESPONSE_MESSAGES.ERROR, error = null) {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error: error || {},
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send created response
   */
  static created(res, message = RESPONSE_MESSAGES.CREATED, data = null) {
    return this.success(res, HTTP_STATUS.CREATED, message, data);
  }

  /**
   * Send validation error
   */
  static validationError(res, message = RESPONSE_MESSAGES.VALIDATION_ERROR, errors = null) {
    return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
      success: false,
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message,
      errors: errors || {},
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send unauthorized error
   */
  static unauthorized(res, message = RESPONSE_MESSAGES.UNAUTHORIZED) {
    return this.error(res, HTTP_STATUS.UNAUTHORIZED, message);
  }

  /**
   * Send forbidden error
   */
  static forbidden(res, message = RESPONSE_MESSAGES.FORBIDDEN) {
    return this.error(res, HTTP_STATUS.FORBIDDEN, message);
  }

  /**
   * Send not found error
   */
  static notFound(res, message = RESPONSE_MESSAGES.NOT_FOUND) {
    return this.error(res, HTTP_STATUS.NOT_FOUND, message);
  }
}

module.exports = ApiResponse;
