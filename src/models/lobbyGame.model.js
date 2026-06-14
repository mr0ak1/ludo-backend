const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class LobbyGame extends Model {}

LobbyGame.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    entryFee: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    prizeAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    maxPlayers: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'LobbyGame',
    tableName: 'lobby_games',
    timestamps: true,
  }
);

module.exports = LobbyGame;
