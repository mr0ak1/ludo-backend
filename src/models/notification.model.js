const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        // Roadmap 8.2
        'match_found',
        'game_started',
        'your_turn',
        'game_ended',
        'wallet_update',
        'achievement',
        'bonus',
        'system_alert',
        // Legacy / extended
        'opponent_joined',
        'wallet_credited',
        'daily_reward',
        'tournament_started',
        'game_invitation',
        'system_message',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isSent: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    sendError: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

// TTL Index - Auto delete after expiresAt
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Regular Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
