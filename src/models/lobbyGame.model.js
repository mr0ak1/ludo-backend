const mongoose = require('mongoose');

const lobbyGameSchema = new mongoose.Schema(
  {
    entryFee: {
      type: Number,
      required: true,
      min: 0,
    },
    prizeAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    maxPlayers: {
      type: Number,
      default: 2,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const LobbyGame = mongoose.model('LobbyGame', lobbyGameSchema);

module.exports = LobbyGame;
