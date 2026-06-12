const mongoose = require('mongoose');

const probabilityConfigSchema = new mongoose.Schema({
  winProbability: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 30,
  },
  enabled: {
    type: Boolean,
    required: true,
    default: false,
  },
  forceOverrideBotManagement: {
    type: Boolean,
    required: true,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('ProbabilityConfig', probabilityConfigSchema);
