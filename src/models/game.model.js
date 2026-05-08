const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
  {
    gameId: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['practice', 'cash', 'tournament'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'paused', 'completed', 'cancelled', 'reconnecting'],
      default: 'pending',
    },
    players: [
      {
        playerId: mongoose.Schema.Types.ObjectId,
        playerName: String,
        playerColor: String,
        tokens: [
          {
            tokenId: String,
            position: Number,
            isHome: Boolean,
            completed: Boolean,
          },
        ],
        isBot: {
          type: Boolean,
          default: false,
        },
        botDifficulty: {
          type: String,
          enum: ['easy', 'medium', 'hard'],
          default: null,
        },
        joinedAt: Date,
        disconnectedAt: {
          type: Date,
          default: null,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    currentTurn: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    currentTurnCount: {
      type: Number,
      default: 0,
    },
    consecutiveSixes: {
      type: Number,
      default: 0,
    },
    diceValue: {
      type: Number,
      default: 0,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    betAmount: {
      type: Number,
      default: 0,
    },
    totalPool: {
      type: Number,
      default: 0,
    },
    boardState: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    moveHistory: [
      {
        playerId: mongoose.Schema.Types.ObjectId,
        diceValue: Number,
        tokenId: String,
        fromPosition: Number,
        toPosition: Number,
        timestamp: Date,
      },
    ],
    chatMessages: [
      {
        senderId: mongoose.Schema.Types.ObjectId,
        message: String,
        timestamp: Date,
      },
    ],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0, // in milliseconds
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
    collection: 'games',
  }
);

// Indexes
gameSchema.index({ gameId: 1 });
gameSchema.index({ 'players.playerId': 1 });
gameSchema.index({ status: 1 });
gameSchema.index({ createdAt: -1 });
gameSchema.index({ winner: 1 });

module.exports = mongoose.model('Game', gameSchema);
