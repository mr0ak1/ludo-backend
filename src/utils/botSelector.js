const userRepository = require('../repositories/userRepository');
const logger = require('./logger');
const { BOT_LEVELS, BOT_NAMES, getRandomUniqueBotName } = require('../constants/bot.constants');

/**
 * Get available bot users from database
 * @param {Number} count - Number of bots to fetch
 * @param {String} level - Bot difficulty level (optional)
 * @returns {Promise<Array>} Array of bot user documents
 */
async function getAvailableBots(count = 1, level = null) {
  try {
    const query = { isBot: true };
    
    if (level && BOT_LEVELS.includes(level)) {
      query.botLevel = level;
    }

    const bots = await userRepository.findBots(query, count);
    
    if (!bots || !Array.isArray(bots)) {
      logger.warn('No bots returned from database');
      return [];
    }

    if (bots.length < count) {
      logger.warn(`Requested ${count} bots but only ${bots.length} available`);
    }

    return bots;
  } catch (error) {
    logger.error('Error fetching available bots:', error);
    return [];
  }
}

/**
 * Select random bots for a game
 * @param {Number} count - Number of bots to select
 * @param {String} level - Bot difficulty level
 * @returns {Promise<Array>} Array of bot user objects with random unique names
 */
async function selectRandomBots(count = 1, level = 'easy') {
  try {
    let bots = await getAvailableBots(count, level);
    
    if (!bots || bots.length === 0) {
      logger.warn(`No bots available at level ${level}, trying without level filter`);
      // Fallback: try without level filter
      bots = await getAvailableBots(count, null);
    }

    // Assign random unique names to bots
    if (bots && Array.isArray(bots)) {
      bots = bots.map(bot => ({
        ...bot,
        name: getRandomUniqueBotName(),
      }));
    }

    return bots && Array.isArray(bots) ? bots : [];
  } catch (error) {
    logger.error('Error selecting random bots:', error);
    return [];
  }
}

/**
 * Create bot player object for game
 * Mimics real player structure to hide bot identity
 * @param {Object} bot - Bot user document (with assigned name)
 * @param {Number} position - Player position (0-3)
 * @param {String} difficulty - Intended bot difficulty
 * @returns {Object} Player object for game
 */
function createBotPlayerObject(bot, position, difficulty) {
  const colors = ['red', 'green', 'yellow', 'blue'];
  const color = colors[position];
  
  return {
    userId: bot._id.toString(),
    position,
    playerColor: color,
    preferredColor: color,
    isBot: true,
    playerName: bot.name, // Use randomly-assigned bot name from selectRandomBots
    botDifficulty: difficulty || bot.botLevel || 'easy',
    tokens: [
      { position: -1, active: false },
      { position: -1, active: false },
      { position: -1, active: false },
      { position: -1, active: false },
    ],
    diceCount: 0,
    consecutiveSixes: 0,
    isHome: [false, false, false, false],
  };
}

/**
 * Ensure bot users exist in database
 * Creates default bots if they don't exist
 * @returns {Promise<void>}
 */
async function ensureBotsExist() {
  try {
    const existingBots = await userRepository.findBots({ isBot: true }, 10);
    
    const botCount = existingBots && Array.isArray(existingBots) ? existingBots.length : 0;
    
    // If we have at least 5 bots, we're good
    if (botCount >= 5) {
      logger.info(`Bot users exist: ${botCount} bots found`);
      return;
    }

    // Create default bots
    const botsToCreate = [
      {
        phone: 'bot.easy.1@game.local',
        firebaseUid: 'bot_easy_1_' + Date.now(),
        name: 'Bot Easy 1',
        isBot: true,
        botLevel: 'easy',
        avatar: 'https://api.example.com/avatars/bot-easy-1.png',
      },
      {
        phone: 'bot.easy.2@game.local',
        firebaseUid: 'bot_easy_2_' + Date.now(),
        name: 'Bot Easy 2',
        isBot: true,
        botLevel: 'easy',
        avatar: 'https://api.example.com/avatars/bot-easy-2.png',
      },
      {
        phone: 'bot.medium.1@game.local',
        firebaseUid: 'bot_medium_1_' + Date.now(),
        name: 'Bot Medium 1',
        isBot: true,
        botLevel: 'medium',
        avatar: 'https://api.example.com/avatars/bot-medium-1.png',
      },
      {
        phone: 'bot.hard.1@game.local',
        firebaseUid: 'bot_hard_1_' + Date.now(),
        name: 'Bot Hard 1',
        isBot: true,
        botLevel: 'hard',
        avatar: 'https://api.example.com/avatars/bot-hard-1.png',
      },
      {
        phone: 'bot.hard.2@game.local',
        firebaseUid: 'bot_hard_2_' + Date.now(),
        name: 'Bot Hard 2',
        isBot: true,
        botLevel: 'hard',
        avatar: 'https://api.example.com/avatars/bot-hard-2.png',
      },
    ];

    for (const botData of botsToCreate) {
      try {
        await userRepository.create(botData);
        logger.info(`Created bot: ${botData.name}`);
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error - bot might already exist
          logger.info(`Bot already exists: ${botData.phone}`);
        } else {
          logger.error(`Failed to create bot ${botData.name}:`, error);
        }
      }
    }
  } catch (error) {
    logger.error('Error ensuring bots exist:', error);
  }
}

module.exports = {
  getAvailableBots,
  selectRandomBots,
  createBotPlayerObject,
  ensureBotsExist,
};
