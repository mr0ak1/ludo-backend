const mongoose = require('mongoose');

const matchHistorySchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    player1Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    player2Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    loser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    coinsWon: {
      type: Number,
      default: 0,
    },
    coinsLost: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      default: 0, // in milliseconds
    },
    totalMoves: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'match_history',
  }
);

// Indexes
matchHistorySchema.index({ player1Id: 1, createdAt: -1 });
matchHistorySchema.index({ player2Id: 1, createdAt: -1 });
matchHistorySchema.index({ winner: 1 });
matchHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('MatchHistory', matchHistorySchema);
