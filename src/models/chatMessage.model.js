const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ChatMessage extends Model {}

ChatMessage.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    gameId: {
      type: DataTypes.STRING(32), // String gameId
      allowNull: false,
    },
    senderId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    playerName: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    messageType: {
      type: DataTypes.ENUM('quick_message', 'text_message'),
      defaultValue: 'text_message',
    },
    isBot: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'ChatMessage',
    tableName: 'chat_messages',
    timestamps: true,
    indexes: [
      { fields: ['gameId', 'createdAt'] },
    ],
  }
);

module.exports = ChatMessage;
