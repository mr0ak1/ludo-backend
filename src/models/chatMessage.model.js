const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    gameId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    playerName: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ['quick_message', 'text_message'],
      default: 'text_message',
    },
    isBot: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'chatmessages',
  }
);

chatMessageSchema.index({ gameId: 1, createdAt: -1 });
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
