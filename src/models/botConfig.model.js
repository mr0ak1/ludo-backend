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
  },
  referrerBonus: {
    type: Number,
    default: 50 // Coins given to the person who shared the code
  },
  referredBonus: {
    type: Number,
    default: 0 // Coins given to the new user who used the code
  },
  paymentGatewayKey: {
    type: String,
    default: '' // EKQR API Key
  },
  upiId: {
    type: String,
    default: '' // Manual UPI ID
  },
  paytmMerchantId: {
    type: String,
    default: '' // Paytm Merchant ID
  }
}, { timestamps: true });

module.exports = mongoose.model('BotConfig', botConfigSchema);
