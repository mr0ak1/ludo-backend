const rateLimit = require('express-rate-limit');
const config = require('../config/env');

/**
 * Global Rate Limiter
 */
const globalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.nodeEnv === 'test',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

/**
 * Strict Rate Limiter (for auth endpoints)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later',
  skip: () => config.nodeEnv === 'test',
});

/**
 * Chat Rate Limiter
 */
const chatLimiter = rateLimit({
  windowMs: 2000, // 2 seconds
  max: 1, // 1 message per 2 seconds
  message: 'Please wait before sending another message',
  skip: () => config.nodeEnv === 'test',
});

/**
 * API Rate Limiter
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'API rate limit exceeded',
  skip: () => config.nodeEnv === 'test',
});

module.exports = {
  globalLimiter,
  authLimiter,
  chatLimiter,
  apiLimiter,
};
