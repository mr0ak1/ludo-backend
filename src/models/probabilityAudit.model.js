const mongoose = require('mongoose');

const probabilityAuditSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.Mixed, required: true },
  assignedMode: { type: String, required: true },
  betAmount: { type: Number, required: true },
  probability: { type: Number, required: true },
  reason: { type: String, default: 'recalculate' },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'probability_audits' });

module.exports = mongoose.model('ProbabilityAudit', probabilityAuditSchema);
