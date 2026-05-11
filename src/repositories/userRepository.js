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

      const query = {};
      if (filters.isBanned !== undefined) query.isBanned = filters.isBanned;
      if (filters.isSuspended !== undefined) query.isSuspended = filters.isSuspended;
      if (filters.search) {
        query.$or = [
          { phone: { $regex: filters.search, $options: 'i' } },
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const users = await User.find(query)
        .select('-__v')
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      return {
        users: users.map(u => u.toObject()),
        total,
        page,
        pages: Math.ceil(total / limit),
      };
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
}

module.exports = new UserRepository();
