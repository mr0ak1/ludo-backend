const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ProbabilityConfig extends Model {}

ProbabilityConfig.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    winProbability: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    forceOverrideBotManagement: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'ProbabilityConfig',
    tableName: 'probability_configs',
    timestamps: true,
  }
);

module.exports = ProbabilityConfig;
