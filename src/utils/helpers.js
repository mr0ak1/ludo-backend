const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

/**
 * Generate UUID
 */
const generateUUID = () => uuidv4();

/**
 * Generate Game ID
 */
const generateGameId = () => `GAME_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Generate Session ID
 */
const generateSessionId = () => `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Generate Transaction ID
 */
const generateTransactionId = () => `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Get current timestamp
 */
const getCurrentTimestamp = () => new Date();

/**
 * Format timestamp to ISO string
 */
const formatToISOString = (date) => dayjs(date).toISOString();

/**
 * Get timestamp difference in milliseconds
 */
const getTimestampDifference = (startTime, endTime = new Date()) => {
  return endTime.getTime() - startTime.getTime();
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if value is empty
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Capitalize first letter
 */
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (obj instanceof Object) {
    const cloned = {};
    Object.keys(obj).forEach((key) => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
};

/**
 * Merge objects
 */
const mergeObjects = (target, source) => {
  return { ...target, ...source };
};

module.exports = {
  generateUUID,
  generateGameId,
  generateSessionId,
  generateTransactionId,
  getCurrentTimestamp,
  formatToISOString,
  getTimestampDifference,
  sleep,
  isEmpty,
  capitalize,
  deepClone,
  mergeObjects,
};
