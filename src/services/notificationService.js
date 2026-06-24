const notificationRepository = require('../repositories/notificationRepository');
const userRepository = require('../repositories/userRepository');
const { sendMulticastNotification } = require('../config/firebase');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_TEMPLATES,
  NOTIFICATION_LIST_DEFAULTS,
  TTL_DAYS,
} = require('../constants/notification.constants');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../constants/http.constants');
const logger = require('../utils/logger');

const msFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

class NotificationService {
  _template(type, vars = {}) {
    const fn = NOTIFICATION_TEMPLATES[type];
    if (typeof fn === 'function') {
      return fn(vars);
    }
    return { title: 'Notice', body: 'You have a new notification.' };
  }

  async _maybeSendPush(userId, notificationDoc, title, body) {
    const user = await userRepository.findById(userId);
    const docId = notificationDoc?.id || notificationDoc?._id;

    if (!user || !user.deviceTokens?.length) {
      if (docId) {
        await notificationRepository.updateDeliveryMeta(docId, {
          isSent: false,
          sentAt: null,
          sendError: null,
        });
      }
      return;
    }

    try {
      const data = {
        type: notificationDoc?.type || '',
        notificationId: docId ? String(docId) : '',
        ...(notificationDoc?.data && typeof notificationDoc.data === 'object' ? notificationDoc.data : {}),
      };
      const { successCount, failureCount, invalidTokens } = await sendMulticastNotification(
        user.deviceTokens,
        { title, body, data }
      );

      for (const bad of invalidTokens) {
        try {
          await userRepository.removeDeviceToken(userId, bad);
        } catch (e) {
          logger.warn(`Failed to prune invalid FCM token for user ${userId}:`, e.message);
        }
      }

      const ok = successCount > 0;
      if (docId) {
        await notificationRepository.updateDeliveryMeta(docId, {
          isSent: ok,
          sentAt: ok ? new Date() : null,
          sendError: failureCount > 0 && successCount === 0 ? 'All FCM deliveries failed' : null,
        });
      }
    } catch (err) {
      logger.error('FCM push failed:', err.message);
      if (docId) {
        await notificationRepository.updateDeliveryMeta(docId, {
          isSent: false,
          sentAt: null,
          sendError: err.message || 'FCM error',
        });
      }
    }
  }

  /**
   * Persist in-app notification and optionally send FCM to registered devices.
   */
  async createNotification(userId, type, { title, body, data = {}, sendPush = true, saveToDb = true } = {}) {
    const t = title && body ? { title, body } : this._template(type, data);
    
    let doc = { type, data, title: t.title, body: t.body };
    if (saveToDb) {
      doc = await notificationRepository.create({
        userId,
        type,
        title: t.title,
        body: t.body,
        data,
        expiresAt: msFromNow(TTL_DAYS),
      });
    }

    if (sendPush) {
      setImmediate(() => {
        this._maybeSendPush(userId, doc, t.title, t.body).catch((e) => {
          logger.error('Background push error:', e);
        });
      });
    }

    return doc;
  }

  async getNotifications(userId, query = {}) {
    const page = Number(query.page) || NOTIFICATION_LIST_DEFAULTS.PAGE;
    const limit = Math.min(
      Number(query.limit) || NOTIFICATION_LIST_DEFAULTS.LIMIT,
      NOTIFICATION_LIST_DEFAULTS.MAX_LIMIT
    );
    const unreadOnly = query.unreadOnly === true || query.unreadOnly === 'true';

    return notificationRepository.findByUserId(userId, { page, limit, unreadOnly });
  }

  async markAsRead(userId, notificationId) {
    const updated = await notificationRepository.markAsRead(userId, notificationId);
    if (!updated) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Notification not found');
    }
    return updated;
  }

  /**
   * Register or refresh FCM device token (roadmap 8.4).
   */
  async registerDeviceToken(userId, deviceToken, oldDeviceToken) {
    if (!deviceToken || typeof deviceToken !== 'string') {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'deviceToken is required');
    }
    if (oldDeviceToken && oldDeviceToken !== deviceToken) {
      await userRepository.removeDeviceToken(userId, oldDeviceToken);
    }
    await userRepository.addDeviceToken(userId, deviceToken);
    return { registered: true };
  }

  async notifyMatchFound(userId, { gameId, opponentName } = {}) {
    const { title, body } = this._template(NOTIFICATION_TYPES.MATCH_FOUND, {
      opponentName,
    });
    return this.createNotification(userId, NOTIFICATION_TYPES.MATCH_FOUND, {
      title,
      body,
      data: { gameId: String(gameId), opponentName: opponentName || '' },
      saveToDb: false,
    });
  }

  async notifyGameStarted(userId, { gameId } = {}) {
    return this.createNotification(userId, NOTIFICATION_TYPES.GAME_STARTED, {
      data: { gameId: String(gameId) },
      saveToDb: false,
    });
  }

  async notifyYourTurn(userId, { gameId } = {}) {
    return this.createNotification(userId, NOTIFICATION_TYPES.YOUR_TURN, {
      data: { gameId: String(gameId) },
      sendPush: false,
      saveToDb: false,
    });
  }

  async notifyGameEnded(userId, { gameId, isWinner } = {}) {
    return this.createNotification(userId, NOTIFICATION_TYPES.GAME_ENDED, {
      data: { gameId: String(gameId), isWinner: String(!!isWinner) },
      saveToDb: false,
    });
  }

  async notifyWalletUpdate(userId, { amount, direction, balanceAfter, reason, refId } = {}) {
    const { title, body } = this._template(NOTIFICATION_TYPES.WALLET_UPDATE, {
      direction,
      amount: Math.abs(amount || 0),
      reason,
    });
    return this.createNotification(userId, NOTIFICATION_TYPES.WALLET_UPDATE, {
      title,
      body,
      data: {
        amount: String(amount ?? ''),
        direction: direction || '',
        balanceAfter: String(balanceAfter ?? ''),
        reason: reason || '',
        refId: refId ? String(refId) : '',
      },
    });
  }

  async notifyAchievement(userId, { title, body, meta = {} } = {}) {
    return this.createNotification(userId, NOTIFICATION_TYPES.ACHIEVEMENT, {
      title,
      body,
      data: meta,
    });
  }

  async notifyBonus(userId, { title, body, data = {} } = {}) {
    const t = title && body ? { title, body } : this._template(NOTIFICATION_TYPES.BONUS);
    return this.createNotification(userId, NOTIFICATION_TYPES.BONUS, {
      title: t.title,
      body: t.body,
      data,
    });
  }

  async notifySystemAlert(userId, { title, body, data = {} } = {}) {
    const t = title && body ? { title, body } : this._template(NOTIFICATION_TYPES.SYSTEM_ALERT, {});
    return this.createNotification(userId, NOTIFICATION_TYPES.SYSTEM_ALERT, {
      title: t.title,
      body: t.body,
      data,
    });
  }

  async notifyAllUsers(title, body, type = NOTIFICATION_TYPES.SYSTEM_ALERT, data = {}) {
    try {
      const User = require('../models/user.model');
      const users = await User.findAll({ attributes: ['id', 'deviceTokens'] });
      const notificationPromises = users.map(user => 
        this.createNotification(user.id, type, { title, body, data })
      );
      await Promise.all(notificationPromises);
      logger.info(`Sent notification "${title}" to ${users.length} users`);
      return { success: true, count: users.length };
    } catch (err) {
      logger.error('Error sending notification to all users:', err);
      return { success: false, error: err.message };
    }
  }

  /** For tests / maintenance jobs (TTL also removes rows). */
  async cleanupExpiredBefore(date = new Date()) {
    return notificationRepository.deleteByExpiresAtBefore(date);
  }
}

module.exports = new NotificationService();
