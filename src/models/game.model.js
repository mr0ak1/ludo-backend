const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
  {
    gameId: {
      type: String,
      required: true,
      unique: true,
      default: () => require('crypto').randomBytes(8).toString('hex'),
    },
    type: {
      type: String,
      enum: ['practice', 'cash', 'tournament'],
      required: true,
      default: 'practice',
    },
    gameType: {
      type: String,
      enum: ['practice', 'cash', 'tournament'],
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'paused', 'completed', 'cancelled', 'reconnecting'],
      default: 'pending',
    },
    players: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
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
        isHome: {
          type: [Boolean],
          default: [false, false, false, false],
        },
        isBot: {
          type: Boolean,
          default: false,
        },
        botDifficulty: {
          type: String,
          enum: ['easy', 'medium', 'hard', null],
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
      type: Number,
      default: 0,
    },
    turnStartedAt: {
      type: Date,
      default: Date.now,
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
    moves: [
      {
        userId: mongoose.Schema.Types.ObjectId,
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
    isBotProcessing: {
      type: Boolean,
      default: false,
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

gameSchema.pre('validate', function (next) {
  if (this.gameType && !this.type) {
    this.type = this.gameType;
  }
  next();
});

// Indexes
gameSchema.index({ gameId: 1 });
gameSchema.index({ 'players.userId': 1 });
gameSchema.index({ status: 1 });
gameSchema.index({ createdAt: -1 });
gameSchema.index({ winner: 1 });

module.exports = mongoose.model('Game', gameSchema);
