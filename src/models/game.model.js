const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');
const { GAME_STATUS, GAME_TYPE } = require('../constants/game.constants');

class Game extends Model {}

Game.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    gameId: {
      type: DataTypes.STRING(32),
      unique: true,
      allowNull: false,
      defaultValue: () => require('crypto').randomBytes(8).toString('hex'),
    },
    type: {
      type: DataTypes.ENUM(...Object.values(GAME_TYPE)),
      allowNull: false,
      defaultValue: 'practice',
    },
    gameType: {
      type: DataTypes.ENUM(...Object.values(GAME_TYPE)),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(GAME_STATUS)),
      defaultValue: 'pending',
    },
    /**
     * players stored as JSON:
     * [{ userId, playerName, playerColor, preferredColor, position, tokens, isHome, isBot, botDifficulty, placement, joinedAt, disconnectedAt, isActive, consecutiveSixes, missedTurns }]
     */
    players: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const val = this.getDataValue('players');
        return typeof val === 'string' ? JSON.parse(val) : (val || []);
      },
      set(val) {
        this.setDataValue('players', val);
      }
    },
    currentTurn: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    turnStartedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    currentTurnCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    diceValue: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    winner: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    },
    results: {
      type: DataTypes.JSON,
      defaultValue: {},
      get() {
        const val = this.getDataValue('results');
        return typeof val === 'string' ? JSON.parse(val) : (val || {});
      },
      set(val) {
        this.setDataValue('results', val);
      }
    },
    betAmount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalPool: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    boardState: {
      type: DataTypes.JSON,
      defaultValue: {},
      get() {
        const val = this.getDataValue('boardState');
        return typeof val === 'string' ? JSON.parse(val) : (val || {});
      },
      set(val) {
        this.setDataValue('boardState', val);
      }
    },
    moves: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const val = this.getDataValue('moves');
        return typeof val === 'string' ? JSON.parse(val) : (val || []);
      },
      set(val) {
        this.setDataValue('moves', val);
      }
    },
    chatMessages: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const val = this.getDataValue('chatMessages');
        return typeof val === 'string' ? JSON.parse(val) : (val || []);
      },
      set(val) {
        this.setDataValue('chatMessages', val);
      }
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    duration: {
      type: DataTypes.BIGINT, // in milliseconds
      defaultValue: 0,
    },
    maxPlayers: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
    },
    isBotProcessing: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Game',
    tableName: 'games',
    timestamps: true,
    hooks: {
      beforeValidate(game) {
        if (game.type && !game.gameType) game.gameType = game.type;
        if (game.gameType) game.type = game.gameType;
      },
    },
    indexes: [
      { fields: ['gameId'] },
      { fields: ['status'] },
      { fields: ['winner'] },
      { fields: ['createdAt'] },
    ],
  }
);

module.exports = Game;
