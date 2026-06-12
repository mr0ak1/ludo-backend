const queueRepository = require('../repositories/queueRepository');
const gameService = require('./gameService');
const userRepository = require('../repositories/userRepository');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');
const {
  BOT_NAMES,
  BOT_FAKE_STATS,
  MATCHMAKING_CONFIG,
  BOT_LEVELS,
} = require('../constants/bot.constants');
const BotConfig = require('../models/botConfig.model');

/**
 * Matchmaking Service - Handles queue and bot matching
 */
class MatchmakingService {
  constructor() {
    // Global bot difficulty setting (controlled by admin)
    this.globalBotDifficulty = 'medium'; // Default global difficulty
    this.hardModeThreshold = 450; // Auto hard mode if bet >= threshold
    this._loadConfig();
  }

  async _loadConfig() {
    try {
      let config = await BotConfig.findOne();
      if (!config) {
        config = await BotConfig.create({ globalDifficulty: 'medium', hardModeThreshold: 450 });
      }
      this.globalBotDifficulty = config.globalDifficulty || 'medium';
      this.hardModeThreshold = config.hardModeThreshold ?? 450;
      logger.info(`Loaded BotConfig from DB - Difficulty: ${this.globalBotDifficulty}, Threshold: ${this.hardModeThreshold}`);
    } catch (error) {
      logger.error('Failed to load BotConfig:', error.message);
    }
  }

  /**
   * Set global bot difficulty (admin only)
   * @param {String} difficulty - Bot difficulty (easy, medium, hard)
   */
  async setGlobalBotDifficulty(difficulty) {
    if (BOT_LEVELS.includes(difficulty)) {
      this.globalBotDifficulty = difficulty;
      logger.info(`Global bot difficulty set to: ${difficulty}`);
      try {
        await BotConfig.findOneAndUpdate({}, { globalDifficulty: difficulty }, { upsert: true });
      } catch (e) {
        logger.error('Failed to save globalBotDifficulty to DB:', e.message);
      }
    }
  }

  /**
   * Get current global bot difficulty
   * @returns {String} Current bot difficulty
   */
  getGlobalBotDifficulty() {
    return this.globalBotDifficulty;
  }

  /**
   * Set hard mode threshold (admin only)
   * @param {Number|null} amount - Amount threshold
   */
  async setHardModeThreshold(amount) {
    this.hardModeThreshold = amount;
    logger.info(`Auto hard mode threshold set to: ${amount}`);
    try {
      await BotConfig.findOneAndUpdate({}, { hardModeThreshold: amount }, { upsert: true });
    } catch (e) {
      logger.error('Failed to save hardModeThreshold to DB:', e.message);
    }
  }

  /**
   * Get current hard mode threshold
   * @returns {Number|null} Current threshold
   */
  getHardModeThreshold() {
    return this.hardModeThreshold;
  }

  /**
   * Join matchmaking queue
   * @param {String} userId - User ID
   * @param {Object} options - Queue options
   * @returns {Promise<Object>} Queue entry
   */
  async joinQueue(userId, options = {}) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if already in queue
      const existingQueue = await queueRepository.findByUserId(userId);
      if (existingQueue) {
        throw new Error('Already in queue');
      }

      // Create queue entry
      const queueEntry = await queueRepository.create(userId, {
        gameType: options.gameType || 'cash',
        betAmount: options.betAmount || 0,
        preferences: {
          allowBot: true, // Always allow bots for now
          botDifficulty: this.globalBotDifficulty,
        },
      });

      // Simulate finding match with fake delay
      this._simulateQueueMatch(queueEntry._id, userId, options);

      return queueEntry;
    } catch (error) {
      logger.error('Error joining queue:', error);
      throw error;
    }
  }

  /**
   * Simulate queue matching with fake delay and bot
   * @private
   * @param {String} queueId - Queue entry ID
   * @param {String} userId - User ID
   * @param {Object} options - Queue options
   */
  _simulateQueueMatch(queueId, userId, options) {
    // Simulate wait time between 2-5 seconds
    const delay =
      Math.random() *
        (MATCHMAKING_CONFIG.FAKE_QUEUE_DELAY_MAX - MATCHMAKING_CONFIG.FAKE_QUEUE_DELAY_MIN) +
      MATCHMAKING_CONFIG.FAKE_QUEUE_DELAY_MIN;

    setTimeout(async () => {
      try {
        const queueEntry = await queueRepository.findById(queueId);

        // Check if user cancelled while waiting
        if (!queueEntry || queueEntry.status !== 'waiting') {
          return;
        }

        // Create game with bot opponent
        await this._matchWithBot(queueEntry, userId, options);
      } catch (error) {
        logger.error('Error in queue matching:', error);
      }
    }, delay);
  }

  /**
   * Match user with bot opponent
   * @private
   * @param {Object} queueEntry - Queue entry
   * @param {String} userId - User ID
   * @param {Object} options - Queue options
   */
  async _matchWithBot(queueEntry, userId, options) {
    try {
      let botDifficulty = this.globalBotDifficulty;
      const entryFee = options.betAmount || 0;

      // Check if it's the user's first match
      let isFirstMatch = false;
      try {
        const userRepository = require('../repositories/userRepository');
        const user = await userRepository.findById(userId);
        if (user && (user.totalGames || 0) === 0) {
          isFirstMatch = true;
        }
      } catch (err) {
        logger.error('Error checking user totalGames for bot difficulty:', err);
      }

      // Priority 2: First match logic (Easy mode)
      if (isFirstMatch) {
        botDifficulty = 'easy';
        logger.info(`Bot difficulty set to easy for first match of user ${userId}`);
      }

      // Priority 1 (Highest): Auto hard mode logic (Threshold overrides everything)
      if (this.hardModeThreshold !== null && entryFee >= this.hardModeThreshold) {
        botDifficulty = 'hard';
        logger.info(`Bot difficulty automatically set to hard due to bet amount (${entryFee} >= ${this.hardModeThreshold})`);
      }

      // Create game with bot
      const game = await gameService.createCashGame(userId, entryFee, 2, botDifficulty);

      let opponentName = 'Opponent';
      try {
        const botPlayer = game.players[1];
        if (botPlayer?.userId) {
          const oid = botPlayer.userId._id
            ? botPlayer.userId._id.toString()
            : botPlayer.userId.toString
              ? botPlayer.userId.toString()
              : String(botPlayer.userId);
          const botUser = await userRepository.findById(oid);
          if (botUser?.name) opponentName = botUser.name;
        }
      } catch (e) {
        logger.warn('Could not resolve opponent name for notification:', e.message);
      }

      setImmediate(() => {
        notificationService
          .notifyMatchFound(userId, { gameId: game._id, opponentName })
          .catch((err) => logger.error('notifyMatchFound failed:', err.message));
      });

      // Update queue entry with match info
      await queueRepository.update(queueEntry._id, {
        status: 'matched',
        matchedAt: new Date(),
        matchedGameId: game._id,
        matchedPlayerId: game.players[1].userId, // Bot user ID
      });

      logger.info(`User ${userId} matched with bot in game ${game._id}`);
    } catch (error) {
      logger.error('Error matching with bot:', error);
      // Cancel queue on error
      await queueRepository.cancel(queueEntry._id, 'Match failed');
    }
  }

  /**
   * Leave matchmaking queue
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Cancelled queue entry
   */
  async leaveQueue(userId) {
    try {
      const queueEntry = await queueRepository.findByUserId(userId);

      if (!queueEntry) {
        throw new Error('Not in queue');
      }

      if (queueEntry.status === 'matched') {
        throw new Error('Already matched, cannot leave');
      }

      return await queueRepository.cancel(queueEntry._id, 'User cancelled');
    } catch (error) {
      logger.error('Error leaving queue:', error);
      throw error;
    }
  }

  /**
   * Get queue status for user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Queue status
   */
  async getQueueStatus(userId) {
    try {
      const queueEntry = await queueRepository.findByUserId(userId);

      if (!queueEntry) {
        return {
          inQueue: false,
          status: null,
          waitTime: null,
          position: null,
        };
      }

      const waitTime = Date.now() - queueEntry.joinedAt.getTime();
      const maxWaitTime = MATCHMAKING_CONFIG.FAKE_QUEUE_DELAY_MAX;

      // Estimate position (fake, for display)
      const allWaiting = await queueRepository.findWaitingByGameType(queueEntry.gameType);
      const position =
        allWaiting.findIndex((q) => q._id.toString() === queueEntry._id.toString()) + 1;

      return {
        inQueue: true,
        status: queueEntry.status,
        waitTime: Math.min(waitTime, maxWaitTime),
        maxWaitTime,
        position: position || 0,
        gameType: queueEntry.gameType,
        betAmount: queueEntry.betAmount,
        matchedGameId: queueEntry.matchedGameId || null,
        matchedPlayerId: queueEntry.matchedPlayerId || null,
      };
    } catch (error) {
      logger.error('Error getting queue status:', error);
      throw error;
    }
  }

  /**
   * Get random Indian bot name
   * @param {String} difficulty - Bot difficulty
   * @returns {String} Bot name
   */
  getRandomBotName(difficulty) {
    const names = BOT_NAMES[difficulty.toUpperCase()] || BOT_NAMES.MEDIUM;
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Generate fake bot stats
   * @param {String} difficulty - Bot difficulty
   * @returns {Object} Bot stats
   */
  generateBotStats(difficulty) {
    const stats = BOT_FAKE_STATS[difficulty.toUpperCase()] || BOT_FAKE_STATS.MEDIUM;
    const wins = stats.wins();
    const losses = stats.losses();

    return {
      wins,
      losses,
      totalGames: wins + losses,
      winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0,
      coins: stats.coins(),
      level: stats.level(),
    };
  }
}

module.exports = new MatchmakingService();
