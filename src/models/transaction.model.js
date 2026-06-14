const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Transaction extends Model {}

Transaction.init(
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
    transactionId: {
      type: DataTypes.STRING(64),
      unique: true,
      allowNull: false,
      defaultValue: () => 'tx_' + require('crypto').randomBytes(12).toString('hex'),
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        'debit',
        'credit',
        'reward',
        'refund',
        'admin_adjustment',
        'sign_up_bonus',
        'admin_add',
        'admin_deduct',
        'game_entry',
        'game_reward',
        'deposit',
        'withdrawal'
      ),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    gameId: {
      type: DataTypes.STRING(32), // Maps to Game gameId string
      allowNull: true,
      defaultValue: null,
    },
    opposingPlayerId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    },
    previousBalance: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    newBalance: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    beforeBalance: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    afterBalance: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      get() {
        const val = this.getDataValue('metadata');
        return typeof val === 'string' ? JSON.parse(val) : (val || {});
      },
      set(val) {
        this.setDataValue('metadata', val);
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'reversed'),
      defaultValue: 'completed',
    },
  },
  {
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'createdAt'] },
      { fields: ['gameId'] },
      { fields: ['transactionId'] },
      { fields: ['createdAt'] },
    ],
  }
);

module.exports = Transaction;
