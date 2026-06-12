const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
      default: () => 'tx_' + new mongoose.Types.ObjectId().toString(),
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'debit',
        'credit',
        'reward',
        'refund',
        'admin_adjustment',
        'sign_up_bonus',
        'admin_add',
        'admin_deduct',
        'game_entry',
        'game_reward',
        'deposit',
        'withdrawal',
      ],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      default: null,
    },
    opposingPlayerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    previousBalance: {
      type: Number,
      default: 0,
    },
    newBalance: {
      type: Number,
      default: 0,
    },
    beforeBalance: {
      type: Number,
      default: 0,
    },
    afterBalance: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'completed',
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
    collection: 'transactions',
  }
);

// Indexes
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ gameId: 1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
