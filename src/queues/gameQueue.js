const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const config = require('../config/env');
const logger = require('../utils/logger');

const GAME_QUEUE_NAME = 'game-actions';

const createNoopQueue = () => ({
  add: async () => null,
  remove: async () => null,
});

let connection = null;
let gameQueue = createNoopQueue();

if (!config.isDevelopment) {
  // Redis connection for BullMQ
  connection = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
  });

  gameQueue = new Queue(GAME_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 100,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });
}

/**
 * Initialize Queue Workers
 * @param {Object} gameService - Injected gameService to avoid circular dependency
 */
const initializeGameWorkers = (gameService) => {
  if (config.isDevelopment) {
    logger.warn('Game action workers skipped in development because Redis queueing is disabled.');
    return null;
  }

  const worker = new Worker(
    GAME_QUEUE_NAME,
    async (job) => {
      const { type, gameId, userId } = job.data;
      logger.info(`Processing queue job: ${type} for game ${gameId}`);

      try {
        switch (type) {
          case 'bot-turn':
            await gameService._triggerBotTurnInternal(gameId);
            break;

          case 'turn-timeout':
            await gameService._handleTurnTimeoutInternal(gameId);
            break;

          case 'afk-check':
            await gameService._handleAfkTimeoutInternal(gameId, userId);
            break;

          default:
            logger.warn(`Unknown job type: ${type}`);
        }
      } catch (error) {
        logger.error(`Error processing job ${type}:`, error);
        throw error; // Let BullMQ handle retry
      }
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed:`, err);
  });

  logger.info('Game action workers initialized');
};

module.exports = {
  gameQueue,
  initializeGameWorkers,
};
