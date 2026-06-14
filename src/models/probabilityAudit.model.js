const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ProbabilityAudit extends Model {}

ProbabilityAudit.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    gameId: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    assignedMode: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    betAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    probability: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(255),
      defaultValue: 'recalculate',
    },
  },
  {
    sequelize,
    modelName: 'ProbabilityAudit',
    tableName: 'probability_audits',
    timestamps: true, // handles createdAt, updatedAt
  }
);

module.exports = ProbabilityAudit;
