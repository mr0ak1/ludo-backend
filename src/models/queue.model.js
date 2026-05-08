const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    gameType: {
      type: String,
      enum: ['practice', 'cash', 'tournament'],
      required: true,
    },
    betAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['waiting', 'matched', 'cancelled', 'expired'],
      default: 'waiting',
    },
    preferences: {
      botDifficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
      },
      allowBot: {
        type: Boolean,
        default: true,
      },
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    matchedAt: {
      type: Date,
      default: null,
    },
    matchedPlayerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    matchedGameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'queues',
  }
);

// TTL Index - Auto delete after expiresAt
queueSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Regular Indexes
queueSchema.index({ userId: 1 });
queueSchema.index({ status: 1 });
queueSchema.index({ gameType: 1, betAmount: 1, status: 1 });
queueSchema.index({ joinedAt: -1 });

module.exports = mongoose.model('Queue', queueSchema);
