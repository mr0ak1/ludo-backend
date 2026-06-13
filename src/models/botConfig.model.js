const mongoose = require('mongoose');

const botConfigSchema = new mongoose.Schema({
  globalDifficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  hardModeThreshold: {
    type: Number,
    default: 450
  },
  minimumBet: {
    type: Number,
    default: 10
  }
}, { timestamps: true });

module.exports = mongoose.model('BotConfig', botConfigSchema);
