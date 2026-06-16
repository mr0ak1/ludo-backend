const { getRedisClient } = require('../config/redis');
const ApiError = require('./ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');

const LOCK_TTL_SECONDS = 5;

/**
 * Executes a callback with an exclusive Redis lock.
 * If the lock cannot be acquired, it throws a 409 Conflict.
 * @param {string} key - Lock key identifier
 * @param {Function} callback - Function to execute while holding the lock
 * @returns {Promise<any>} Result of the callback
 */
const withRedisLock = async (key, callback) => {
  const client = getRedisClient();
  
  // If Redis is not initialized or not connected, bypass lock
  if (!client || !client.isOpen) {
    return await callback();
  }

  const lockKey = `lock:${key}`;
  let acquired = false;
  
  try {
    // Attempt to acquire lock. NX = Only set if not exists, EX = Expire in seconds
    acquired = await client.set(lockKey, 'locked', {
      NX: true,
      EX: LOCK_TTL_SECONDS,
    });

    if (!acquired) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        'Game state is currently updating. Please wait a moment.'
      );
    }

    // Execute the action
    const result = await callback();
    return result;
  } finally {
    // Release the lock if we acquired it
    if (acquired) {
      try {
        await client.del(lockKey);
      } catch (err) {
        console.error(`Failed to release lock for ${key}:`, err.message);
      }
    }
  }
};

module.exports = {
  withRedisLock,
};
