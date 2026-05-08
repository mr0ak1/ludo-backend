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
      required: true,
      unique: true,
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
    lastActive: {
      type: Date,
      default: Date.now,
    },
    deviceTokens: {
      type: [String],
      default: [],
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
    collection: 'users',
  }
);

// Indexes
userSchema.index({ phone: 1 });
userSchema.index({ firebaseUid: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isBanned: 1 });

module.exports = mongoose.model('User', userSchema);
