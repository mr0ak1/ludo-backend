const userRepository = require('../repositories/userRepository');
const gameRepository = require('../repositories/gameRepository');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { BOT_THINKING_TIME } = require('../constants/bot.constants');

/**
 * Bot AI Service - Handles autonomous bot moves
 */
class BotService {
  /**
   * Check if player at given index is a bot
   * @param {Object} game - Game object
   * @param {Number} playerIndex - Player index (0-3)
   * @returns {Promise<Boolean>} True if bot
   */
  async isPlayerBot(game, playerIndex) {
    try {
      const player = game.players[playerIndex];
      return player ? !!player.isBot : false;
    } catch (error) {
      logger.error('Error checking if player is bot:', error);
      return false;
    }
  }

  /**
   * Get bot difficulty level
   * @param {Object} game - Game object
   * @param {Number} playerIndex - Player index
   * @returns {Promise<String>} Bot difficulty level
   */
  async getBotLevel(game, playerIndex) {
    try {
      const player = game.players[playerIndex];
      return player?.botDifficulty || 'easy';
    } catch (error) {
      logger.error('Error getting bot level:', error);
      return 'easy';
    }
  }

  /**
   * Get valid moves for a player given dice value
   * @param {Object} player - Player object
   * @param {Number} diceValue - Dice value (1-6)
   * @returns {Array} Array of valid token indices
   */
  getValidMoves(player, diceValue) {
    const validMoves = [];
    const HOME_ENTRY_END = 57;

    for (let i = 0; i < 4; i++) {
      const token = player.tokens[i];
      const currentPos = token.position;

      if (currentPos === -1) {
        if (diceValue === 6) validMoves.push(i);
      } else if (currentPos >= 0 && currentPos + diceValue <= HOME_ENTRY_END && !player.isHome[i]) {
        validMoves.push(i);
      }
    }

    return validMoves;
  }

  _isSafeZone(localPos, playerIndex) {
    if (localPos < 0 || localPos > 50) return false;
    const globalPos = (localPos + playerIndex * 13 + 1) % 52;
    const GLOBAL_SAFE_ZONES = [1, 9, 14, 22, 27, 35, 40, 48];
    return GLOBAL_SAFE_ZONES.includes(globalPos);
  }

  /**
   * Easy bot strategy - random valid move
   * @param {Object} player - Player object
   * @param {Array} validMoves - Valid move indices
   * @returns {Number} Token index to move
   */
  _easyStrategy(player, validMoves) {
    if (validMoves.length === 0) return -1;
    return validMoves[crypto.randomInt(0, validMoves.length)];
  }

  /**
   * Medium bot strategy - balanced approach
   * @param {Object} player - Player object
   * @param {Array} validMoves - Valid move indices
   * @param {Number} diceValue - Dice value
   * @returns {Number} Token index to move
   */
  _mediumStrategy(player, playerIndex, validMoves, diceValue) {
    if (validMoves.length === 0) return -1;

    const HOME_ENTRY_START = 50;

    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const tokenIndex of validMoves) {
      let score = 0;
      const token = player.tokens[tokenIndex];
      const currentPos = token.position;

      if (currentPos >= 0) {
        const newPos = currentPos + diceValue;
        
        if (newPos > currentPos) {
          score += 10;
        }

        if (this._isSafeZone(newPos, playerIndex)) {
          score += 5;
        }
      } else if (currentPos === -1 && diceValue === 6) {
        // Starting token - reasonable move
        score += 3;
      }

      // Small randomness to vary moves (0-2)
      score += crypto.randomInt(0, 200) / 100;

      if (score > bestScore) {
        bestScore = score;
        bestMove = tokenIndex;
      }
    }

    return bestMove;
  }

  /**
   * Hard bot strategy - advanced planning
   * @param {Object} player - Player object
   * @param {Object} game - Game object
   * @param {Array} validMoves - Valid move indices
   * @param {Number} diceValue - Dice value
   * @returns {Number} Token index to move
   */
  _hardStrategy(player, game, playerIndex, validMoves, diceValue) {
    if (validMoves.length === 0) return -1;

    const HOME_ENTRY_START = 50;

    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const tokenIndex of validMoves) {
      let score = 0;
      const token = player.tokens[tokenIndex];
      const currentPos = token.position;
      const isHome = player.isHome[tokenIndex];

      // Strategy 1: Prioritize moving tokens home
      if (!isHome) {
        const progress = currentPos >= 0 ? 
          (currentPos / 57) : 0;
        score += progress * 20;

        // Extra bonus for being close to home
        if (currentPos >= HOME_ENTRY_START - 10) {
          score += 15;
        }
      }

      // Strategy 2: Protect tokens in safe zones
      const newPos = currentPos + diceValue;

      if (this._isSafeZone(newPos, playerIndex)) {
        score += 8;
      }

      // Strategy 3: Avoid moving into danger
      let opponentNearby = 0;
      if (newPos >= 0 && newPos <= 51 && !this._isSafeZone(newPos, playerIndex)) {
        const newGlobalPos = (newPos + playerIndex * 13 + 1) % 52;
        for (let i = 0; i < game.players.length; i++) {
          if (i === game.currentTurn) continue;
          const oppPlayer = game.players[i];
          for (const oppToken of oppPlayer.tokens) {
            if (oppToken.position >= 0 && oppToken.position <= 51) {
                const oppGlobalPos = (oppToken.position + i * 13 + 1) % 52;
                if (oppGlobalPos === newGlobalPos) opponentNearby++;
            }
          }
        }
      }
      score -= opponentNearby * 5;

      // Strategy 4: Prefer advancing an already advanced token
      if (currentPos > 30 && currentPos !== -1) {
        score += 3;
      }

      // Slight randomness to keep it interesting (0-1)
      score += crypto.randomInt(0, 100) / 100;

      if (score > bestScore) {
        bestScore = score;
        bestMove = tokenIndex;
      }
    }

    return bestMove;
  }

  /**
   * Decide which token to move based on difficulty
   * @param {Object} game - Game object
   * @param {Number} playerIndex - Player index
   * @param {Array} validMoves - Valid move indices
   * @param {Number} diceValue - Dice value
   * @returns {Promise<Number>} Token index to move (-1 if none)
   */
  async decideMove(game, playerIndex, validMoves, diceValue) {
    try {
      if (!validMoves || validMoves.length === 0) {
        return -1;
      }

      const level = await this.getBotLevel(game, playerIndex);
      const player = game.players[playerIndex];

      switch (level) {
        case 'easy':
          return this._easyStrategy(player, validMoves);
        case 'medium':
          return this._mediumStrategy(player, playerIndex, validMoves, diceValue);
        case 'hard':
          return this._hardStrategy(player, game, playerIndex, validMoves, diceValue);
        default:
          return this._easyStrategy(player, validMoves);
      }
    } catch (error) {
      logger.error('Error deciding bot move:', error);
      return validMoves.length > 0 ? validMoves[0] : -1;
    }
  }

  /**
   * Get thinking time delay based on difficulty
   * @param {String} level - Bot difficulty level
   * @returns {Number} Delay in milliseconds
   */
  getThinkingDelay(level = 'easy') {
    const normalizedLevel = String(level || 'easy').toUpperCase();
    const baseDelay = BOT_THINKING_TIME[normalizedLevel] || BOT_THINKING_TIME.EASY;
    // Add jitter (±20% randomness)
    const jitter = Math.floor(baseDelay * 0.2);
    return baseDelay + crypto.randomInt(-jitter, jitter + 1);
  }

  /**
   * Sleep for specified milliseconds
   * @param {Number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new BotService();
