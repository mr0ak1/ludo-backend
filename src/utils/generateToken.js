const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate JWT Token
 * @param {string} userId - User ID
 * @param {object} additionalData - Additional data to include in token
 * @returns {string} JWT Token
 */
const generateToken = (userId, additionalData = {}) => {
  try {
    const payload = {
      userId,
      ...additionalData,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiry,
      algorithm: 'HS256',
    });

    return token;
  } catch (error) {
    throw new Error(`Token generation failed: ${error.message}`);
  }
};

/**
 * Generate Refresh Token
 * @param {string} userId - User ID
 * @param {object} additionalData - Additional data to include in token
 * @returns {string} Refresh Token
 */
const generateRefreshToken = (userId, additionalData = {}) => {
  try {
    const payload = {
      userId,
      ...additionalData,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, config.jwtRefreshSecret || config.jwtSecret, {
      expiresIn: config.jwtRefreshExpiry || '7d',
      algorithm: 'HS256',
    });

    return token;
  } catch (error) {
    throw new Error(`Refresh token generation failed: ${error.message}`);
  }
};

/**
 * Verify JWT Token
 * @param {string} token - JWT Token
 * @param {boolean} isRefreshToken - Whether to verify as refresh token
 * @returns {object} Decoded token
 */
const verifyToken = (token, isRefreshToken = false) => {
  try {
    const secret = isRefreshToken 
      ? (config.jwtRefreshSecret || config.jwtSecret)
      : config.jwtSecret;

    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    });
    return decoded;
  } catch (error) {
    error.message = `Token verification failed: ${error.message}`;
    throw error;
  }
};

/**
 * Decode JWT Token without verification
 * @param {string} token - JWT Token
 * @returns {object} Decoded token
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error(`Token decode failed: ${error.message}`);
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string} Token
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  return null;
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
};
