const Notification = require('../models/notification.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

class NotificationRepository {
  async create(data) {
    const doc = await Notification.create(data);
    return doc.toObject();
  }

  async findById(notificationId) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return null;
    }
    const doc = await Notification.findById(notificationId).lean();
    return doc;
  }

  /**
   * Paginated list for a user (newest first).
   */
  async findByUserId(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const filter = { userId };
    if (unreadOnly) {
      filter.isRead = false;
    }
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
    ]);

    return {
      notifications: items,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    };
  }

  /**
   * Mark a single notification read if it belongs to the user.
   * @returns {Object|null} updated lean doc
   */
  async markAsRead(userId, notificationId) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return null;
    }
    const updated = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    ).lean();

    return updated;
  }

  /**
   * Manual / job cleanup (Mongo TTL also removes by expiresAt).
   */
  async deleteByExpiresAtBefore(date) {
    const res = await Notification.deleteMany({ expiresAt: { $lt: date } });
    logger.info(`Notification cleanup: removed ${res.deletedCount} documents`);
    return res.deletedCount;
  }

  /**
   * Update push delivery metadata on a notification document.
   */
  async updateDeliveryMeta(notificationId, { isSent, sentAt, sendError } = {}) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return null;
    }
    return Notification.findByIdAndUpdate(
      notificationId,
      { $set: { isSent, sentAt, sendError } },
      { new: true }
    ).lean();
  }
}

module.exports = new NotificationRepository();
