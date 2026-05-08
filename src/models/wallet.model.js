const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    coins: {
      type: Number,
      default: 500,
      min: 0,
    },
    lockedCoins: {
      type: Number,
      default: 0,
      min: 0,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedReason: {
      type: String,
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'frozen', 'locked'],
      default: 'active',
    },
    totalEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'wallets',
  }
);

// Indexes
walletSchema.index({ userId: 1 });
walletSchema.index({ isLocked: 1 });

module.exports = mongoose.model('Wallet', walletSchema);
