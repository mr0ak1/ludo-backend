const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isBot: {
      type: Boolean,
      default: false,
    },
    playerColor: {
      type: String,
      default: null,
    },
    placement: {
      type: Number,
      required: true,
      min: 1,
    },
    coinsWon: {
      type: Number,
      default: 0,
      min: 0,
    },
    coinsLost: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const matchHistorySchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
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
      min: 0,
    },
    duration: {
      type: Number,
      default: 0,
    },
    totalMoves: {
      type: Number,
      default: 0,
    },
    participants: {
      type: [participantSchema],
      required: true,
      validate: [(v) => Array.isArray(v) && v.length >= 1, 'participants required'],
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'match_history',
  }
);

matchHistorySchema.index({ 'participants.userId': 1, endedAt: -1 });
matchHistorySchema.index({ winnerId: 1 });
matchHistorySchema.index({ gameType: 1, endedAt: -1 });
matchHistorySchema.index({ endedAt: -1 });

module.exports = mongoose.model('MatchHistory', matchHistorySchema);
