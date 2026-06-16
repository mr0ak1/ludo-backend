const redis = require('redis');
const config = require('./env');

let redisClient;

const initializeRedis = async () => {
  try {
    if (config.isDevelopment) {
      console.warn('Redis connection skipped in development (optional service).');
      return null;
    }

    if (!redisClient) {
      redisClient = redis.createClient({
        url: config.redisUrl,
        socket: {
          connectTimeout: 2000,
          reconnectStrategy: (retries) => {
            if (config.isDevelopment) {
              return false;
            }
            if (retries > 10) {
              console.error('Redis max retries exceeded');
              return new Error('Redis max retries exceeded');
            }
            return retries * 50;
          },
        },
      });

      redisClient.on('error', (err) => console.error('Redis Client Error', err));
      redisClient.on('connect', () => console.log('Redis connected'));
      redisClient.on('reconnecting', () => console.log('Redis reconnecting'));

      await redisClient.connect();
    }
    return redisClient;
  } catch (error) {
    redisClient = null;
    if (config.isDevelopment) {
      console.warn('Redis connection failed (optional for development):', error.message);
      return null;
    }
    console.error('Redis initialization error:', error.message);
    throw error;
  }
};

const getRedisClient = () => redisClient;

const disconnectRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      console.log('Redis disconnected');
    }
  } catch (error) {
    console.error('Redis disconnection error:', error.message);
  }
};

module.exports = {
  initializeRedis,
  getRedisClient,
  disconnectRedis,
};
