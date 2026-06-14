const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class AdminLog extends Model {}

AdminLog.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    // FK to users.id (admin who performed action)
    adminId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // FK to users.id (target user, nullable)
    targetUserId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    },
    // FK to games.id (target game, nullable)
    targetGameId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    },
    // What changed, stored as JSON
    changes: {
      type: DataTypes.JSON,
      defaultValue: {},
      get() {
        const val = this.getDataValue('changes');
        return typeof val === 'string' ? JSON.parse(val) : (val || {});
      },
      set(val) {
        this.setDataValue('changes', val);
      }
    },
    reason: {
      type: DataTypes.STRING(512),
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'completed',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      defaultValue: null,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: 'AdminLog',
    tableName: 'admin_logs',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
    indexes: [
      { fields: ['adminId', 'createdAt'] },
      { fields: ['targetUserId'] },
      { fields: ['action'] },
      { fields: ['createdAt'] },
    ],
  }
);

module.exports = AdminLog;
