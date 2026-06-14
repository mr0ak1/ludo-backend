const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Queue extends Model {}

Queue.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
    },
    gameType: {
      type: DataTypes.ENUM('practice', 'cash', 'tournament'),
      allowNull: false,
    },
    betAmount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('waiting', 'matched', 'cancelled', 'expired'),
      defaultValue: 'waiting',
    },
    /**
     * preferences stored as JSON:
     * { botDifficulty, allowBot }
     */
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {},
      get() {
        const val = this.getDataValue('preferences');
        return typeof val === 'string' ? JSON.parse(val) : (val || {});
      },
      set(val) {
        this.setDataValue('preferences', val);
      }
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    matchedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    matchedPlayerId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    },
    matchedGameId: {
      type: DataTypes.STRING(32), // String gameId
      allowNull: true,
      defaultValue: null,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    cancelReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    expiresAt: {
      type: DataTypes.DATE,
      defaultValue: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  },
  {
    sequelize,
    modelName: 'Queue',
    tableName: 'queues',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['gameType', 'betAmount', 'status'] },
    ],
  }
);

module.exports = Queue;
