const mongoose = require('mongoose');
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
      const user = new User(userData);
      await user.save();
      logger.info(`User created: ${user._id}`);
      return user.toObject();
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new ApiError(HTTP_STATUS.CONFLICT, `User with this ${field} already exists`);
      }
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  async findById(userId) {
    try {
      const user = await User.findById(userId).select('-__v');
      return user ? user.toObject() : null;
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
      const user = await User.findOne({ phone: phone.toLowerCase() }).select('-__v');
      return user ? user.toObject() : null;
    } catch (error) {
      logger.error('Error finding user by phone:', error);
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
      const user = await User.findOne({ firebaseUid }).select('-__v');
      return user ? user.toObject() : null;
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
      const user = await User.findOne({ email: email.toLowerCase() }).select('-__v');
      return user ? user.toObject() : null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Update user by ID
   * @param {String} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   */
  async update(userId, updateData) {
    try {
      // Prevent updating sensitive fields
      const restrictedFields = ['firebaseUid', 'isBanned', 'isSuspended'];
      restrictedFields.forEach(field => delete updateData[field]);

      const user = await User.findByIdAndUpdate(
        userId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-__v');

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      logger.info(`User updated: ${userId}`);
      return user.toObject();
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, error.message);
      }
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user by ID
   * @param {String} userId - User ID
   * @returns {Promise<void>}
   */
  async delete(userId) {
    try {
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
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
        query.$or = [
          { phone: { $regex: filters.search, $options: 'i' } },
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
        ];
      }

      let sortOptions = { createdAt: -1 };
      
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'registration_desc':
            sortOptions = { createdAt: -1 };
            break;
          case 'registration_asc':
            sortOptions = { createdAt: 1 };
            break;
        }
      }

      if (filters.sortBy === 'wallet_desc' || filters.sortBy === 'wallet_asc') {
        const sortDirection = filters.sortBy === 'wallet_desc' ? -1 : 1;
        
        const pipeline = [
          { $match: query },
          {
            $lookup: {
              from: 'wallets',
              localField: '_id',
              foreignField: 'userId',
              as: 'wallet'
            }
          },
          {
            $addFields: {
              actualCoins: {
                $cond: {
                  if: { $gt: [{ $size: "$wallet" }, 0] },
                  then: { $arrayElemAt: ["$wallet.coins", 0] },
                  else: "$coins"
                }
              }
            }
          },
          { $sort: { actualCoins: sortDirection } },
          { $skip: skip },
          { $limit: limit },
          { $project: { wallet: 0, actualCoins: 0, __v: 0 } }
        ];
        
        const users = await User.aggregate(pipeline);
        const total = await User.countDocuments(query);
        
        return {
          users,
          total,
          page,
          pages: Math.ceil(total / limit),
        };
      } else {
        const users = await User.find(query)
          .select('-__v')
          .limit(limit)
          .skip(skip)
          .sort(sortOptions);

        const total = await User.countDocuments(query);

        return {
          users: users.map(u => u.toObject ? u.toObject() : u),
          total,
          page,
          pages: Math.ceil(total / limit),
        };
      }
    } catch (error) {
      logger.error('Error finding users:', error);
      throw error;
    }
  }

  /**
   * Ban a user
   * @param {String} userId - User ID
   * @param {String} reason - Ban reason
   * @returns {Promise<Object>} Updated user
   */
  async banUser(userId, reason) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          isBanned: true,
          banReason: reason,
          updatedAt: new Date(),
        },
        { new: true }
      ).select('-__v');

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      logger.warn(`User banned: ${userId}, Reason: ${reason}`);
      return user.toObject();
    } catch (error) {
      logger.error('Error banning user:', error);
      throw error;
    }
  }

  /**
   * Suspend a user
   * @param {String} userId - User ID
   * @param {String} reason - Suspension reason
   * @returns {Promise<Object>} Updated user
   */
  async suspendUser(userId, reason) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          isSuspended: true,
          suspendReason: reason,
          updatedAt: new Date(),
        },
        { new: true }
      ).select('-__v');

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      logger.warn(`User suspended: ${userId}, Reason: ${reason}`);
      return user.toObject();
    } catch (error) {
      logger.error('Error suspending user:', error);
      throw error;
    }
  }

  /**
   * Unban a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  async unbanUser(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          isBanned: false,
          banReason: null,
          updatedAt: new Date(),
        },
        { new: true }
      ).select('-__v');

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      logger.info(`User unbanned: ${userId}`);
      return user.toObject();
    } catch (error) {
      logger.error('Error unbanning user:', error);
      throw error;
    }
  }

  /**
   * Unsuspend a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  async unsuspendUser(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          isSuspended: false,
          suspendReason: null,
          updatedAt: new Date(),
        },
        { new: true }
      ).select('-__v');

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      logger.info(`User unsuspended: ${userId}`);
      return user.toObject();
    } catch (error) {
      logger.error('Error unsuspending user:', error);
      throw error;
    }
  }

  /**
   * Update user's last active timestamp
   * @param {String} userId - User ID
   * @returns {Promise<void>}
   */
  async updateLastActive(userId) {
    try {
      await User.findByIdAndUpdate(userId, { lastActive: new Date() });
    } catch (error) {
      logger.error('Error updating last active:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Add device token to user
   * @param {String} userId - User ID
   * @param {String} deviceToken - Firebase device token
   * @returns {Promise<Object>} Updated user
   */
  async addDeviceToken(userId, deviceToken) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { deviceTokens: deviceToken } },
        { new: true }
      ).select('-__v');

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      return user.toObject();
    } catch (error) {
      logger.error('Error adding device token:', error);
      throw error;
    }
  }

  /**
   * Remove device token from user
   * @param {String} userId - User ID
   * @param {String} deviceToken - Firebase device token
   * @returns {Promise<Object>} Updated user
   */
  async removeDeviceToken(userId, deviceToken) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { deviceTokens: deviceToken } },
        { new: true }
      ).select('-__v');

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      return user.toObject();
    } catch (error) {
      logger.error('Error removing device token:', error);
      throw error;
    }
  }

  /**
   * Find bot users
   * @param {Object} query - MongoDB query filter
   * @param {Number} limit - Max number of bots to return
   * @returns {Promise<Array>} Array of bot users
   */
  async findBots(query = {}, limit = 1) {
    try {
      const defaultQuery = { isBot: true, ...query };
      const bots = await User.find(defaultQuery)
        .select('-__v')
        .limit(limit)
        .sort({ createdAt: 1 });

      return bots.map(bot => bot.toObject());
    } catch (error) {
      logger.error('Error finding bots:', error);
      throw error;
    }
  }

  /**
   * Lightweight lookup: userId -> isBot
   * @param {string[]} userIds
   * @returns {Promise<Record<string, { isBot: boolean }>>}
   */
  async getIsBotMapByIds(userIds) {
    if (!userIds || userIds.length === 0) return {};
    try {
      const oids = userIds.map((id) => new mongoose.Types.ObjectId(id));
      const rows = await User.find({ _id: { $in: oids } })
        .select('_id isBot')
        .lean();
      const map = {};
      for (const r of rows) {
        map[r._id.toString()] = { isBot: !!r.isBot };
      }
      return map;
    } catch (error) {
      logger.error('Error getIsBotMapByIds:', error);
      return {};
    }
  }

  /**
   * Update cumulative stats after a ranked/casual game (Cluster 9).
   * Skips bots.
   * @param {string} userId
   * @param {{ won: boolean, netCoinsWon?: number, netCoinsLost?: number, tokenColor?: string|null, rankPointsDelta: number }} delta
   */
  async updateGameStats(userId, delta, options = {}) {
    try {
      const user = await User.findById(userId).session(options.session).select(
        'wins losses totalGames winRate isBot currentWinStreak bestWinStreak favoriteTokenColor tokenColorWinCounts rankPoints totalCoinsWon totalCoinsLost'
      );
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

      const colorCounts =
        user.tokenColorWinCounts && typeof user.tokenColorWinCounts === 'object'
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

      const updated = await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            wins: won ? 1 : 0,
            losses: won ? 0 : 1,
            totalGames: 1,
            rankPoints: delta.rankPointsDelta || 0,
            totalCoinsWon: incCoinsWon,
            totalCoinsLost: incCoinsLost,
          },
          $set: {
            winRate: newWinRate,
            currentWinStreak: newStreak,
            bestWinStreak: best,
            favoriteTokenColor: favorite,
            tokenColorWinCounts: colorCounts,
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true, ...options }
      ).select('-__v');

      return updated ? updated.toObject() : null;
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
      return await User.countDocuments({ isBot: false });
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
      return await User.countDocuments({ isBanned: true, isBot: false });
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
      return await User.countDocuments({ isSuspended: true, isBot: false });
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
      return await User.countDocuments({
        lastActive: { $gte: oneDayAgo },
        isBot: false,
      });
    } catch (error) {
      logger.error('Error counting daily active users:', error);
      return 0;
    }
  }
}

module.exports = new UserRepository();
