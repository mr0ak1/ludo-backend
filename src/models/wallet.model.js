const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Wallet extends Model {}

Wallet.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    // FK to users.id
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
    },
    coins: {
      type: DataTypes.INTEGER,
      defaultValue: 500,
      allowNull: false,
    },
    lockedCoins: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lockedReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    lockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('active', 'frozen', 'locked'),
      defaultValue: 'active',
    },
    totalEarned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalSpent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Wallet',
    tableName: 'wallets',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['isLocked'] },
    ],
  }
);

module.exports = Wallet;
