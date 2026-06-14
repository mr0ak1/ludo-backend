const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

class UserRepository {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async create(userData) {
    try {
      const user = await User.create(userData);
      logger.info(`User created: ${user.id}`);
      return user.toJSON();
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0]?.path || 'field';
        throw new ApiError(HTTP_STATUS.CONFLICT, `User with this ${field} already exists`);
      }
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {String|Number} userId - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  async findById(userId) {
    try {
      const numericId = parseInt(userId, 10);
      if (isNaN(numericId)) return null;
      const user = await User.findByPk(numericId);
      return user ? user.toJSON() : null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by phone number
   * @param {String} phone - Phone number
   * @returns {Promise<Object|null>} User object or null
   */
  async findByPhone(phone) {
    try {
      const user = await User.findOne({ where: { phone: phone.toLowerCase() } });
      return user ? user.toJSON() : null;
    } catch (error) {
      logger.error('Error finding user by phone:', error);
      throw error;
    }
  }

  /**
   * Find user by referral code
   * @param {String} referralCode - Referral code
   * @returns {Promise<Object|null>} User object or null
   */
  async findByReferralCode(referralCode) {
    try {
      const user = await User.findOne({ where: { referralCode: referralCode.toUpperCase() } });
      return user ? user.toJSON() : null;
    } catch (error) {
      logger.error('Error finding user by referral code:', error);
      throw error;
    }
  }

  /**
   * Find user by Firebase UID
   * @param {String} firebaseUid - Firebase UID
   * @returns {Promise<Object|null>} User object or null
   */
  async findByFirebaseUid(firebaseUid) {
    try {
      const user = await User.findOne({ where: { firebaseUid } });
      return user ? user.toJSON() : null;
    } catch (error) {
      logger.error('Error finding user by Firebase UID:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {String} email - Email address
   * @returns {Promise<Object|null>} User object or null
   */
  async findByEmail(email) {
    try {
      const user = await User.findOne({ where: { email: email.toLowerCase() } });
      return user ? user.toJSON() : null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Update user by ID
   * @param {String|Number} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   */
  async update(userId, updateData) {
    try {
      const numericId = parseInt(userId, 10);
      const user = await User.findByPk(numericId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      // Prevent updating sensitive fields
      const restrictedFields = ['firebaseUid', 'isBanned', 'isSuspended'];
      restrictedFields.forEach(field => delete updateData[field]);

      await user.update(updateData);
      logger.info(`User updated: ${userId}`);
      return user.toJSON();
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, error.message);
      }
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Increment referral earnings
   * @param {String|Number} userId - User ID
   * @param {Number} amount - Amount to increment
   * @returns {Promise<Object>} Updated user
   */
  async incrementReferralEarnings(userId, amount) {
    try {
      const numericId = parseInt(userId, 10);
      const user = await User.findByPk(numericId);
      if (!user) return null;
      await user.increment({ referralEarnings: amount });
      await user.reload();
      return user.toJSON();
    } catch (error) {
      logger.error('Error incrementing referral earnings:', error);
      throw error;
    }
  }

  /**
   * Delete user by ID
   * @param {String|Number} userId - User ID
   * @returns {Promise<void>}
   */
  async delete(userId) {
    try {
      const numericId = parseInt(userId, 10);
      const rowsDeleted = await User.destroy({ where: { id: numericId } });
      if (rowsDeleted === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }
      logger.info(`User deleted: ${userId}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Find all users with filters and pagination
   * @param {Object} filters - Query filters
   * @param {Object} pagination - Pagination options (page, limit)
   * @returns {Promise<Object>} Users and total count
   */
  async findAll(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      const query = { isBot: false };
      if (filters.isBanned !== undefined) query.isBanned = filters.isBanned;
      if (filters.isSuspended !== undefined) query.isSuspended = filters.isSuspended;
      if (filters.search) {
        query[Op.or] = [
          { phone: { [Op.like]: `%${filters.search}%` } },
          { name: { [Op.like]: `%${filters.search}%` } },
          { email: { [Op.like]: `%${filters.search}%` } },
        ];
      }

      let sortDirection = 'DESC';
      let sortField = 'createdAt';
      
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'registration_desc':
            sortField = 'createdAt';
            sortDirection = 'DESC';
            break;
          case 'registration_asc':
            sortField = 'createdAt';
            sortDirection = 'ASC';
            break;
        }
      }

      if (filters.sortBy === 'wallet_desc' || filters.sortBy === 'wallet_asc') {
        const Wallet = require('../models/wallet.model');
        const dir = filters.sortBy === 'wallet_desc' ? 'DESC' : 'ASC';
        
        const { count, rows } = await User.findAndCountAll({
          where: query,
          include: [{
            model: Wallet,
            as: 'wallet',
            required: false,
          }],
          order: [
            [sequelize.literal('COALESCE(`wallet`.`coins`, `User`.`coins`)'), dir]
          ],
          limit,
          offset: skip,
        });
        
        return {
          users: rows.map(u => u.toJSON()),
          total: count,
          page,
          pages: Math.ceil(count / limit) || 1,
        };
      } else {
        const { count, rows } = await User.findAndCountAll({
          where: query,
          limit,
          offset: skip,
          order: [[sortField, sortDirection]],
        });

        return {
          users: rows.map(u => u.toJSON()),
          total: count,
          page,
          pages: Math.ceil(count / limit) || 1,
        };
      }
    } catch (error) {
      logger.error('Error finding users:', error);
      throw error;
    }
  }

  /**
   * Ban a user
   * @param {String|Number} userId - User ID
   * @param {String} reason - Ban reason
   * @returns {Promise<Object>} Updated user
   */
  async banUser(userId, reason) {
    try {
      const numericId = parseInt(userId, 10);
      const user = await User.findByPk(numericId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      await user.update({ isBanned: true, banReason: reason });
      logger.warn(`User banned: ${userId}, Reason: ${reason}`);
      return user.toJSON();
    } catch (error) {
      logger.error('Error banning user:', error);
      throw error;
    }
  }

  /**
   * Suspend a user
   * @param {String|Number} userId - User ID
   * @param {String} reason - Suspension reason
   * @returns {Promise<Object>} Updated user
   */
  async suspendUser(userId, reason) {
    try {
      const numericId = parseInt(userId, 10);
      const user = await User.findByPk(numericId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      await user.update({ isSuspended: true, suspendReason: reason });
      logger.warn(`User suspended: ${userId}, Reason: ${reason}`);
      return user.toJSON();
    } catch (error) {
      logger.error('Error suspending user:', error);
      throw error;
    }
  }

  /**
   * Unban a user
   * @param {String|Number} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  async unbanUser(userId) {
    try {
      const numericId = parseInt(userId, 10);
      const user = await User.findByPk(numericId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      await user.update({ isBanned: false, banReason: null });
      logger.info(`User unbanned: ${userId}`);
      return user.toJSON();
    } catch (error) {
      logger.error('Error unbanning user:', error);
      throw error;
    }
  }

  /**
   * Unsuspend a user
   * @param {String|Number} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  async unsuspendUser(userId) {
    try {
      const numericId = parseInt(userId, 10);
      const user = await User.findByPk(numericId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      await user.update({ isSuspended: false, suspendReason: null });
      logger.info(`User unsuspended: ${userId}`);
      return user.toJSON();
    } catch (error) {
      logger.error('Error unsuspending user:', error);
      throw error;
    }
  }

  /**
   * Update user's last active timestamp
   * @param {String|Number} userId - User ID
   * @returns {Promise<void>}
   */
  async updateLastActive(userId) {
    try {
      const numericId = parseInt(userId, 10);
      await User.update({ lastActive: new Date() }, { where: { id: numericId } });
    } catch (error) {
      logger.error('Error updating last active:', error);
    }
  }

  /**
   * Add device token to user
   * @param {String|Number} userId - User ID
   * @param {String} deviceToken - Firebase device token
   * @returns {Promise<Object>} Updated user
   */
  async addDeviceToken(userId, deviceToken) {
    try {
      const numericId = parseInt(userId, 10);
      const user = await User.findByPk(numericId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      const tokens = Array.isArray(user.deviceTokens) ? [...user.deviceTokens] : [];
      if (!tokens.includes(deviceToken)) {
        tokens.push(deviceToken);
      }

      await user.update({ deviceTokens: tokens });
      return user.toJSON();
    } catch (error) {
      logger.error('Error adding device token:', error);
      throw error;
    }
  }

  /**
   * Remove device token from user
   * @param {String|Number} userId - User ID
   * @param {String} deviceToken - Firebase device token
   * @returns {Promise<Object>} Updated user
   */
  async removeDeviceToken(userId, deviceToken) {
    try {
      const numericId = parseInt(userId, 10);
      const user = await User.findByPk(numericId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      let tokens = Array.isArray(user.deviceTokens) ? [...user.deviceTokens] : [];
      tokens = tokens.filter(t => t !== deviceToken);

      await user.update({ deviceTokens: tokens });
      return user.toJSON();
    } catch (error) {
      logger.error('Error removing device token:', error);
      throw error;
    }
  }

  /**
   * Find bot users
   * @param {Object} query - Sequelize query filter
   * @param {Number} limit - Max number of bots to return
   * @returns {Promise<Array>} Array of bot users
   */
  async findBots(query = {}, limit = 1) {
    try {
      const bots = await User.findAll({
        where: { isBot: true, ...query },
        limit,
        order: [['createdAt', 'ASC']],
      });
      return bots.map(bot => bot.toJSON());
    } catch (error) {
      logger.error('Error finding bots:', error);
      throw error;
    }
  }

  /**
   * Lightweight lookup: userId -> isBot
   * @param {string[]|number[]} userIds
   * @returns {Promise<Record<string, { isBot: boolean }>>}
   */
  async getIsBotMapByIds(userIds) {
    if (!userIds || userIds.length === 0) return {};
    try {
      const numericIds = userIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      const rows = await User.findAll({
        where: { id: { [Op.in]: numericIds } },
        attributes: ['id', 'isBot'],
      });
      const map = {};
      for (const r of rows) {
        map[r.id.toString()] = { isBot: !!r.isBot };
      }
      return map;
    } catch (error) {
      logger.error('Error getIsBotMapByIds:', error);
      return {};
    }
  }

  /**
   * Update cumulative stats after a ranked/casual game.
   * @param {string|number} userId
   * @param {{ won: boolean, netCoinsWon?: number, netCoinsLost?: number, tokenColor?: string|null, rankPointsDelta: number }} delta
   */
  async updateGameStats(userId, delta, options = {}) {
    const t = options.transaction;
    try {
      const numericId = parseInt(userId, 10);
      const user = await User.findByPk(numericId, { transaction: t });
      if (!user || user.isBot) {
        return null;
      }

      const won = !!delta.won;
      const newWins = user.wins + (won ? 1 : 0);
      const newLosses = user.losses + (won ? 0 : 1);
      const newTotal = user.totalGames + 1;
      const newWinRate = newTotal > 0 ? Math.round((newWins / newTotal) * 10000) / 100 : 0;

      const newStreak = won ? (user.currentWinStreak || 0) + 1 : 0;
      const best = Math.max(user.bestWinStreak || 0, newStreak);

      const colorCounts = (user.tokenColorWinCounts && typeof user.tokenColorWinCounts === 'object')
        ? { ...user.tokenColorWinCounts }
        : {};
      if (won && delta.tokenColor) {
        colorCounts[delta.tokenColor] = (colorCounts[delta.tokenColor] || 0) + 1;
      }
      let favorite = user.favoriteTokenColor || null;
      let maxC = 0;
      for (const [c, n] of Object.entries(colorCounts)) {
        if (n > maxC) {
          maxC = n;
          favorite = c;
        }
      }

      const incCoinsWon = Math.max(0, Number(delta.netCoinsWon) || 0);
      const incCoinsLost = Math.max(0, Number(delta.netCoinsLost) || 0);

      await user.update({
        wins: newWins,
        losses: newLosses,
        totalGames: newTotal,
        rankPoints: user.rankPoints + (delta.rankPointsDelta || 0),
        totalCoinsWon: Number(user.totalCoinsWon) + incCoinsWon,
        totalCoinsLost: Number(user.totalCoinsLost) + incCoinsLost,
        winRate: newWinRate,
        currentWinStreak: newStreak,
        bestWinStreak: best,
        favoriteTokenColor: favorite,
        tokenColorWinCounts: colorCounts,
      }, { transaction: t });

      return user.toJSON();
    } catch (error) {
      logger.error('Error updating game stats:', error);
      throw error;
    }
  }

  /**
   * Count total users
   * @returns {Promise<Number>} Total user count
   */
  async countAllUsers() {
    try {
      return await User.count({ where: { isBot: false } });
    } catch (error) {
      logger.error('Error counting users:', error);
      return 0;
    }
  }

  /**
   * Count banned users
   * @returns {Promise<Number>} Banned user count
   */
  async countBannedUsers() {
    try {
      return await User.count({ where: { isBanned: true, isBot: false } });
    } catch (error) {
      logger.error('Error counting banned users:', error);
      return 0;
    }
  }

  /**
   * Count suspended users
   * @returns {Promise<Number>} Suspended user count
   */
  async countSuspendedUsers() {
    try {
      return await User.count({ where: { isSuspended: true, isBot: false } });
    } catch (error) {
      logger.error('Error counting suspended users:', error);
      return 0;
    }
  }

  /**
   * Count daily active users (last 24 hours)
   * @returns {Promise<Number>} Daily active user count
   */
  async countDailyActiveUsers() {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return await User.count({
        where: {
          lastActive: { [Op.gte]: oneDayAgo },
          isBot: false,
        }
      });
    } catch (error) {
      logger.error('Error counting daily active users:', error);
      return 0;
    }
  }
}

module.exports = new UserRepository();
