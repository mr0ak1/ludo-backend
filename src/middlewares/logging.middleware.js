const logger = require('../utils/logger');

/**
 * HTTP Request Logging Middleware
 */
const loggingMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info(`Incoming ${req.method} request`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Override res.send to log response
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - startTime;

    // Log response
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
    });

    originalSend.call(this, data);
  };

  next();
};

module.exports = loggingMiddleware;
