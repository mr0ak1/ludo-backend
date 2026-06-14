const { Op } = require('sequelize');
const Notification = require('../models/notification.model');
const logger = require('../utils/logger');

class NotificationRepository {
  async create(data) {
    const doc = await Notification.create(data);
    return doc.toJSON();
  }

  async findById(notificationId) {
    const numericId = parseInt(notificationId, 10);
    if (isNaN(numericId)) {
      return null;
    }
    const doc = await Notification.findByPk(numericId);
    return doc ? doc.toJSON() : null;
  }

  /**
   * Paginated list for a user (newest first).
   */
  async findByUserId(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const numericUserId = parseInt(userId, 10);
    const filter = { userId: numericUserId };
    if (unreadOnly) {
      filter.isRead = false;
    }
    const skip = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where: filter,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(skip, 10),
    });

    return {
      notifications: rows.map(r => r.toJSON()),
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit) || 1,
        limit,
      },
    };
  }

  /**
   * Mark a single notification read if it belongs to the user.
   * @returns {Object|null} updated lean doc
   */
  async markAsRead(userId, notificationId) {
    const numericId = parseInt(notificationId, 10);
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericId) || isNaN(numericUserId)) {
      return null;
    }

    const notification = await Notification.findOne({
      where: { id: numericId, userId: numericUserId }
    });
    if (!notification) {
      return null;
    }

    await notification.update({
      isRead: true,
      readAt: new Date()
    });

    return notification.toJSON();
  }

  /**
   * Manual / job cleanup (Mongo TTL also removes by expiresAt).
   */
  async deleteByExpiresAtBefore(date) {
    const deletedCount = await Notification.destroy({
      where: {
        expiresAt: { [Op.lt]: date }
      }
    });
    logger.info(`Notification cleanup: removed ${deletedCount} documents`);
    return deletedCount;
  }

  /**
   * Update push delivery metadata on a notification document.
   */
  async updateDeliveryMeta(notificationId, { isSent, sentAt, sendError } = {}) {
    const numericId = parseInt(notificationId, 10);
    if (isNaN(numericId)) {
      return null;
    }

    const notification = await Notification.findByPk(numericId);
    if (!notification) {
      return null;
    }

    await notification.update({ isSent, sentAt, sendError });
    return notification.toJSON();
  }
}

module.exports = new NotificationRepository();
