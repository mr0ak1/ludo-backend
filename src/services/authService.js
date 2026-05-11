const admin = require('firebase-admin');
const userRepository = require('../repositories/userRepository');
const { generateToken, verifyToken, generateRefreshToken } = require('../utils/generateToken');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Verify Firebase token and create/update user
   * @param {String} firebaseToken - Firebase ID token
   * @param {String} phone - User phone number
   * @returns {Promise<Object>} User object and tokens
   */
  async verifyFirebaseTokenAndCreateUser(firebaseToken, phone) {
    try {
      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      const firebaseUid = decodedToken.uid;

      logger.info(`Firebase token verified for UID: ${firebaseUid}`);

      // Check if user already exists
      let user = await userRepository.findByFirebaseUid(firebaseUid);

      if (user) {
        // Update last active
        await userRepository.updateLastActive(user._id);
        logger.info(`User logged in: ${user._id}`);
      } else {
        // Create new user on first login
        user = await userRepository.create({
          phone,
          firebaseUid,
          name: decodedToken.name || 'Player',
          email: decodedToken.email || null,
          avatar: decodedToken.picture || null,
          coins: 500, // Default starting coins
          wins: 0,
          losses: 0,
          totalGames: 0,
          winRate: 0,
        });

        logger.info(`New user created: ${user._id}`);
      }

      // Generate JWT tokens
      const accessToken = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      return {
        user,
        accessToken,
        refreshToken,
        message: 'Authentication successful',
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('Firebase token verification failed:', error);
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid Firebase token');
    }
  }

  /**
   * Refresh JWT token
   * @param {String} refreshToken - Refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = verifyToken(refreshToken, true); // Verify as refresh token

      if (!decoded || !decoded.userId) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid refresh token');
      }

      // Verify user still exists
      const user = await userRepository.findById(decoded.userId);

      if (!user) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User not found');
      }

      // Check if user is banned or suspended
      if (user.isBanned) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, `Account banned: ${user.banReason || 'No reason provided'}`);
      }

      if (user.isSuspended) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, `Account suspended: ${user.suspendReason || 'No reason provided'}`);
      }

      // Generate new tokens
      const newAccessToken = generateToken(user._id);
      const newRefreshToken = generateRefreshToken(user._id);

      logger.info(`Token refreshed for user: ${user._id}`);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('Token refresh failed:', error);
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Token refresh failed');
    }
  }

  /**
   * Logout user (remove device token)
   * @param {String} userId - User ID
   * @param {String} deviceToken - Device token to remove
   * @returns {Promise<void>}
   */
  async logout(userId, deviceToken) {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      if (deviceToken) {
        await userRepository.removeDeviceToken(userId, deviceToken);
      }

      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   * @param {String} userId - User ID
   * @returns {Promise<Object>} User profile
   */
  async getProfile(userId) {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      // Check ban/suspend status
      if (user.isBanned) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, `Account banned: ${user.banReason || 'No reason provided'}`);
      }

      if (user.isSuspended) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, `Account suspended: ${user.suspendReason || 'No reason provided'}`);
      }

      return user;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('Error getting profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {String} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user profile
   */
  async updateProfile(userId, updateData) {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      // Check ban/suspend status
      if (user.isBanned) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, `Account banned: ${user.banReason || 'No reason provided'}`);
      }

      if (user.isSuspended) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, `Account suspended: ${user.suspendReason || 'No reason provided'}`);
      }

      // Check if phone or email already exists (if being updated)
      if (updateData.phone && updateData.phone !== user.phone) {
        const existingPhone = await userRepository.findByPhone(updateData.phone);
        if (existingPhone) {
          throw new ApiError(HTTP_STATUS.CONFLICT, 'Phone number already in use');
        }
      }

      if (updateData.email && updateData.email !== user.email) {
        const existingEmail = await userRepository.findByEmail(updateData.email);
        if (existingEmail) {
          throw new ApiError(HTTP_STATUS.CONFLICT, 'Email already in use');
        }
      }

      // Update user
      const updatedUser = await userRepository.update(userId, updateData);

      logger.info(`User profile updated: ${userId}`);

      return updatedUser;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   * @param {String} userId - User ID
   * @param {String} reason - Deletion reason (optional)
   * @returns {Promise<void>}
   */
  async deleteAccount(userId, reason = 'User requested deletion') {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      // Log the deletion
      logger.warn(`User account deleted: ${userId}, Reason: ${reason}`);

      // Delete user
      await userRepository.delete(userId);

      // TODO: Archive user data if required by GDPR
      // TODO: Cleanup related data (games, transactions, etc.)

      logger.info(`User account and data deleted: ${userId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('Error deleting account:', error);
      throw error;
    }
  }

  /**
   * Add device token for push notifications
   * @param {String} userId - User ID
   * @param {String} deviceToken - Firebase device token
   * @returns {Promise<void>}
   */
  async addDeviceToken(userId, deviceToken) {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      await userRepository.addDeviceToken(userId, deviceToken);

      logger.info(`Device token added for user: ${userId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('Error adding device token:', error);
      throw error;
    }
  }

  /**
   * Verify if user is banned or suspended
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Ban/suspend status
   */
  async checkUserStatus(userId) {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      return {
        isBanned: user.isBanned,
        banReason: user.banReason,
        isSuspended: user.isSuspended,
        suspendReason: user.suspendReason,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('Error checking user status:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
