const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class BotConfig extends Model {}

BotConfig.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    globalDifficulty: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      defaultValue: 'medium',
    },
    hardModeThreshold: {
      type: DataTypes.INTEGER,
      defaultValue: 450,
    },
    minimumBet: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    referrerBonus: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
    },
    referredBonus: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    signUpBonus: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    paymentGatewayKey: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    upiId: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    paytmMerchantId: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
  },
  {
    sequelize,
    modelName: 'BotConfig',
    tableName: 'bot_configs',
    timestamps: true,
  }
);

module.exports = BotConfig;
