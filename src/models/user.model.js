const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    firebaseUid: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      default: 'Player',
    },
    email: {
      type: String,
      sparse: true,
      lowercase: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    coins: {
      type: Number,
      default: 500,
      min: 0,
    },
    wins: {
      type: Number,
      default: 0,
      min: 0,
    },
    losses: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalGames: {
      type: Number,
      default: 0,
      min: 0,
    },
    winRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    rankPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    bestWinStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentWinStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCoinsWon: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCoinsLost: {
      type: Number,
      default: 0,
      min: 0,
    },
    favoriteTokenColor: {
      type: String,
      default: null,
    },
    tokenColorWinCounts: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: null,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspendReason: {
      type: String,
      default: null,
    },
    isWithdrawDisabled: {
      type: Boolean,
      default: false,
    },
    isGameplayDisabled: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    deviceTokens: {
      type: [String],
      default: [],
    },
    isBot: {
      type: Boolean,
      default: false,
      index: true,
    },
    botLevel: {
      type: String,
      enum: ['easy', 'medium', 'hard', null],
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    referralEarnings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Indexes
userSchema.index({ phone: 1 });
userSchema.index({ firebaseUid: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isBanned: 1 });
userSchema.index({ isBot: 1, totalGames: -1, winRate: -1, wins: -1 });

module.exports = mongoose.model('User', userSchema);
