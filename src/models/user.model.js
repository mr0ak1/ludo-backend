const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    firebaseUid: {
      type: DataTypes.STRING(128),
      unique: true,
      allowNull: true,
      defaultValue: null,
    },
    name: {
      type: DataTypes.STRING(100),
      defaultValue: 'Player',
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    avatar: {
      type: DataTypes.STRING(512),
      allowNull: true,
      defaultValue: null,
    },
    coins: {
      type: DataTypes.INTEGER,
      defaultValue: 500,
      allowNull: false,
    },
    wins: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    losses: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    totalGames: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    winRate: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    rankPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    bestWinStreak: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    currentWinStreak: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    totalCoinsWon: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    totalCoinsLost: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    favoriteTokenColor: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    // Stored as JSON: { red: 3, blue: 1, ... }
    tokenColorWinCounts: {
      type: DataTypes.JSON,
      defaultValue: {},
      get() {
        const val = this.getDataValue('tokenColorWinCounts');
        return typeof val === 'string' ? JSON.parse(val) : (val || {});
      },
      set(val) {
        this.setDataValue('tokenColorWinCounts', val);
      }
    },
    isBanned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    banReason: {
      type: DataTypes.STRING(512),
      allowNull: true,
      defaultValue: null,
    },
    isSuspended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    suspendReason: {
      type: DataTypes.STRING(512),
      allowNull: true,
      defaultValue: null,
    },
    isWithdrawDisabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isGameplayDisabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lastActive: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    // Array of FCM device tokens stored as JSON
    deviceTokens: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const val = this.getDataValue('deviceTokens');
        return typeof val === 'string' ? JSON.parse(val) : (val || []);
      },
      set(val) {
        this.setDataValue('deviceTokens', val);
      }
    },
    isBot: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    botLevel: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      allowNull: true,
      defaultValue: null,
    },
    referralCode: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true,
      defaultValue: null,
    },
    referredById: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    },
    referralEarnings: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true, // createdAt, updatedAt auto-managed
    indexes: [
      { fields: ['phone'] },
      { fields: ['firebaseUid'] },
      { fields: ['isAdmin'] },
      { fields: ['isBot'] },
      { fields: ['isBanned'] },
      { fields: ['createdAt'] },
    ],
  }
);

module.exports = User;
