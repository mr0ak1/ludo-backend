const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class MatchHistory extends Model {}

MatchHistory.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    gameId: {
      type: DataTypes.STRING(32), // String gameId to map Game gameId
      allowNull: false,
    },
    gameType: {
      type: DataTypes.ENUM('practice', 'cash', 'tournament'),
      allowNull: false,
    },
    betAmount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    duration: {
      type: DataTypes.INTEGER, // duration in seconds/ms
      defaultValue: 0,
    },
    totalMoves: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    /**
     * participants stored as JSON array:
     * [{ userId, isBot, playerColor, placement, coinsWon, coinsLost }]
     */
    participants: {
      type: DataTypes.JSON,
      allowNull: false,
      get() {
        const val = this.getDataValue('participants');
        return typeof val === 'string' ? JSON.parse(val) : (val || []);
      },
      set(val) {
        this.setDataValue('participants', val);
      }
    },
    winnerId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    },
    startedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    endedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'MatchHistory',
    tableName: 'match_history',
    timestamps: true,
    indexes: [
      { fields: ['winnerId'] },
      { fields: ['gameType', 'endedAt'] },
      { fields: ['endedAt'] },
    ],
  }
);

module.exports = MatchHistory;
