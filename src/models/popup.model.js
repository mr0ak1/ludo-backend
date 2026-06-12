const mongoose = require('mongoose');

const popupSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Popup', popupSchema);
