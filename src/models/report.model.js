const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Report extends Model {}

Report.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    reportedBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    reportedUser: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    },
    gameId: {
      type: DataTypes.STRING(32), // String gameId
      allowNull: true,
      defaultValue: null,
    },
    type: {
      type: DataTypes.ENUM('user', 'match'),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    status: {
      type: DataTypes.ENUM('open', 'under_review', 'resolved', 'closed', 'rejected'),
      defaultValue: 'open',
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
    },
    actionTaken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    reviewedBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: 'Report',
    tableName: 'reports',
    timestamps: true,
    indexes: [
      { fields: ['reportedBy', 'createdAt'] },
      { fields: ['reportedUser'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
    ],
  }
);

module.exports = Report;
