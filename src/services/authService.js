const axios = require('axios');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');
const walletService = require('./walletService');
const config = require('../config/env');
const { generateToken, verifyToken, generateRefreshToken } = require('../utils/generateToken');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.otpSessions = new Map();
  }

  _buildDvHostingSmsSendUrl(phone, otp) {
    const digits = String(phone).replace(/\D/g, '').slice(-10); // Extract 10-digit mobile
    return `https://dvhosting.in/api-sms-v3.php?api_key=${config.otp.apiKey}&number=${digits}&otp=${otp}`;
  }

  _normalizePhone(phone) {
    const raw = String(phone || '').trim();
    if (!raw) return '';

    if (raw.startsWith('+')) {
      return raw.replace(/\s+/g, '');
    }

    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+${config.otp.countryCode}${digits}`;
    }
    return `+${digits}`;
  }

  _cleanupExpiredOtpSessions() {
    const now = Date.now();
    for (const [phone, record] of this.otpSessions.entries()) {
      if (!record || record.expiresAt <= now) {
        this.otpSessions.delete(phone);
      }
    }
  }

  /**
   * Send OTP via DV Hosting
   * @param {String} phone - User phone in E.164
   * @returns {Promise<Object>}
   */
  async sendOtp(phone) {
    try {
      this._cleanupExpiredOtpSessions();

      const normalizedPhone = this._normalizePhone(phone);

      const isTestNumber = normalizedPhone === '+916388073500' || normalizedPhone === '+6388073500' || normalizedPhone === '+919876543210';
      const noApiKey = !config.otp.apiKey || config.otp.apiKey.trim() === '';

      // Generate 6-digit OTP locally
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const sessionId = crypto.randomBytes(16).toString('hex'); // Mock session ID for frontend compatibility

      // Bypass SMS API for test account or if no API key is configured
      if (isTestNumber || noApiKey) {
        const now = Date.now();
        this.otpSessions.set(normalizedPhone, {
          sessionId,
          otp: isTestNumber ? '000000' : generatedOtp,
          requestedAt: now,
          expiresAt: now + config.otp.sessionTtlSeconds * 1000,
        });

        return {
          phone: normalizedPhone,
          sessionId,
          expiresInSeconds: config.otp.sessionTtlSeconds,
          resendAfterSeconds: config.otp.resendCooldownSeconds,
        };
      }

      const now = Date.now();
      const existing = this.otpSessions.get(normalizedPhone);

      if (
        existing &&
        now - existing.requestedAt < config.otp.resendCooldownSeconds * 1000
      ) {
        const retryAfterSeconds = Math.ceil(
          (config.otp.resendCooldownSeconds * 1000 - (now - existing.requestedAt)) / 1000
        );
        throw new ApiError(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          `Please wait ${retryAfterSeconds}s before requesting another OTP`
        );
      }

      const endpoint = this._buildDvHostingSmsSendUrl(normalizedPhone, generatedOtp);
      logger.info(`[OTP] Sending OTP via DV Hosting to ${normalizedPhone}`);
      logger.info(`[OTP] Generated OTP: ${generatedOtp}`);
      
      const response = await axios.get(endpoint, { timeout: 10000 });
      // DV Hosting usually returns success JSON or text, depending on the response we just log it
      logger.info(`[OTP] DV Hosting API Status Code: ${response.status}`);
      logger.info(`[OTP] DV Hosting SMS response data: ${JSON.stringify(response.data)}`);

      this.otpSessions.set(normalizedPhone, {
        sessionId,
        otp: generatedOtp,
        requestedAt: now,
        expiresAt: now + config.otp.sessionTtlSeconds * 1000,
      });

      return {
        phone: normalizedPhone,
        sessionId,
        expiresInSeconds: config.otp.sessionTtlSeconds,
        resendAfterSeconds: config.otp.resendCooldownSeconds,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      
      logger.error(`[OTP] Error sending OTP via DV Hosting: ${error.message}`);
      if (error.response) {
        logger.error(`[OTP] DV Hosting API Error Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new ApiError(HTTP_STATUS.BAD_GATEWAY, 'Unable to send OTP right now');
    }
  }

  /**
   * Verify OTP and login/register user
   * @param {String} phone - User phone number
   * @param {String} otp - OTP entered by user
   * @param {String} providedSessionId - Optional session ID from client
   * @returns {Promise<Object>} User object and tokens
   */
  async verifyOtpAndAuthenticate(phone, otp, providedSessionId = null, referralCode = null) {
    try {
      this._cleanupExpiredOtpSessions();

      const normalizedPhone = this._normalizePhone(phone);
      const otpSession = this.otpSessions.get(normalizedPhone);

      if (!otpSession || otpSession.expiresAt <= Date.now()) {
        this.otpSessions.delete(normalizedPhone);
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'OTP session expired. Please request OTP again');
      }

      if (providedSessionId && otpSession.sessionId !== providedSessionId) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'OTP session mismatch');
      }

      // Verify locally generated OTP
      if (String(otpSession.otp) !== String(otp)) {
        logger.warn(`[OTP] Invalid OTP attempt for ${normalizedPhone}. Expected: ${otpSession.otp}, Got: ${otp}`);
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid OTP');
      }

      logger.info(`[OTP] OTP successfully verified for ${normalizedPhone}`);

      let user = await userRepository.findByPhone(normalizedPhone);
      const welcomeBonus = Number(config.welcomeBonus);
      const initialCoins = Number.isFinite(welcomeBonus) && welcomeBonus >= 0
        ? welcomeBonus
        : config.defaultCoins;
      const isNewUser = !user;

      if (isNewUser) {
        const phoneDigits = normalizedPhone.replace(/\D/g, '');
        const newReferralCode = require('crypto').randomBytes(3).toString('hex').toUpperCase();

        let referringUser = null;
        if (referralCode) {
          referringUser = await userRepository.findByReferralCode(referralCode);
        }

        user = await userRepository.create({
          phone: normalizedPhone,
          firebaseUid: `otp_${phoneDigits}`,
          name: `Player${crypto.randomInt(1000, 9999)}`,
          email: null,
          avatar: null,
          coins: initialCoins,
          wins: 0,
          losses: 0,
          totalGames: 0,
          winRate: 0,
          referralCode: newReferralCode,
          referredById: referringUser ? referringUser.id : null,
        });

        await walletService.initializeWallet(user.id, initialCoins);
        logger.info(`New OTP user created: ${user.id}`);

        if (referringUser) {
          const BotConfig = require('../models/botConfig.model');
          let configObj = await BotConfig.findOne();
          const referrerBonusAmount = configObj?.referrerBonus ?? 50;
          const referredBonusAmount = configObj?.referredBonus ?? 0;
          
          if (referrerBonusAmount > 0) {
            await walletService.addCoins(referringUser.id, referrerBonusAmount, `Referral bonus for user ${user.phone}`);
            await userRepository.incrementReferralEarnings(referringUser.id, referrerBonusAmount);
            logger.info(`Referral bonus of ${referrerBonusAmount} awarded to user ${referringUser.id}`);
          }
          
          if (referredBonusAmount > 0) {
            // Give bonus to the new user who signed up using referral
            await walletService.addCoins(user.id, referredBonusAmount, 'referral_signup_bonus');
            logger.info(`Referral signup bonus of ${referredBonusAmount} awarded to new user ${user.id}`);
          }
        }
      } else {
        await userRepository.updateLastActive(user.id);

        // Ensure wallet exists for existing users as many flows expect wallet upfront
        const existingWallet = await walletRepository.findByUserId(user.id);
        if (!existingWallet) {
          await walletService.initializeWallet(user.id, user.coins || config.defaultCoins);
        }

        if (user.isBanned) {
          throw new ApiError(HTTP_STATUS.FORBIDDEN, `Account banned: ${user.banReason || 'No reason provided'}`);
        }

        if (user.isSuspended) {
          throw new ApiError(HTTP_STATUS.FORBIDDEN, `Account suspended: ${user.suspendReason || 'No reason provided'}`);
        }

        logger.info(`OTP user login: ${user._id}`);
      }

      this.otpSessions.delete(normalizedPhone);

      // Generate JWT tokens
      const accessToken = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      return {
        user,
        accessToken,
        refreshToken,
        isNewUser,
        message: 'Authentication successful',
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('OTP verification/login failed:', error);
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'OTP authentication failed');
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

      // Generate referral code for older users if they don't have one
      if (!user.referralCode && !user.isBot) {
        const newReferralCode = require('crypto').randomBytes(3).toString('hex').toUpperCase();
        await userRepository.update(user._id, { referralCode: newReferralCode });
        user.referralCode = newReferralCode;
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
  /**
   * Get referral history
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Referral history
   */
  async getReferralHistory(userId) {
    try {
      const { Op } = require('sequelize');
      const User = require('../models/user.model');
      const Transaction = require('../models/transaction.model');
      
      const referredUsers = await User.findAll({
        where: { referredById: userId },
        attributes: ['phone', 'name', 'createdAt', 'id']
      });
      
      const transactions = await Transaction.findAll({
        where: {
          userId,
          reason: {
            [Op.like]: '%referral%'
          }
        }
      });
      
      const history = referredUsers.map(u => {
        let tx = transactions.find(t => t.reason && t.reason.includes(u.phone));
        let amount = tx ? tx.amount : 0;
        
        const obfuscatedPhone = u.phone ? u.phone.substring(0, u.phone.length - 4) + '****' : 'Unknown';
        
        return {
          userId: u.id,
          name: u.name,
          phone: obfuscatedPhone,
          joinedAt: u.createdAt,
          bonusReceived: amount
        };
      });
      
      const user = await User.findByPk(userId, {
        attributes: ['referralEarnings', 'referralCode']
      });
      
      return {
        referralCode: user?.referralCode || '',
        totalEarnings: user?.referralEarnings || 0,
        history
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting referral history:', error);
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to get referral history');
    }
  }
}

module.exports = new AuthService();
