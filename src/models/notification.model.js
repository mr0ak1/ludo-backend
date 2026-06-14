const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Notification extends Model {}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        'match_found',
        'game_started',
        'your_turn',
        'game_ended',
        'wallet_update',
        'achievement',
        'bonus',
        'system_alert',
        'opponent_joined',
        'wallet_credited',
        'daily_reward',
        'tournament_started',
        'game_invitation',
        'system_message'
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSON,
      defaultValue: {},
      get() {
        const val = this.getDataValue('data');
        return typeof val === 'string' ? JSON.parse(val) : (val || {});
      },
      set(val) {
        this.setDataValue('data', val);
      }
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    isSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    sendError: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    expiresAt: {
      type: DataTypes.DATE,
      defaultValue: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'createdAt'] },
      { fields: ['isRead'] },
    ],
  }
);

module.exports = Notification;
