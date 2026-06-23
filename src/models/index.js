/**
 * Sequelize Models Index
 * Central file for all model imports and associations
 */
const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// ─── Import Models ────────────────────────────────────────────────────────────
const User            = require('./user.model');
const Wallet          = require('./wallet.model');
const Transaction     = require('./transaction.model');
const Game            = require('./game.model');
const MatchHistory    = require('./matchHistory.model');
const Queue           = require('./queue.model');
const Notification    = require('./notification.model');
const Report          = require('./report.model');
const AdminLog        = require('./adminLog.model');
const BotConfig       = require('./botConfig.model');
const ProbabilityConfig = require('./probabilityConfig.model');
const ChatMessage     = require('./chatMessage.model');
const LobbyGame       = require('./lobbyGame.model');
const ProbabilityAudit = require('./probabilityAudit.model');
const Popup           = require('./popup.model');

// ─── Associations ─────────────────────────────────────────────────────────────

// User → Wallet (1:1)
User.hasOne(Wallet, { foreignKey: 'userId', as: 'wallet', onDelete: 'CASCADE' });
Wallet.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User → Transaction (1:N)
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User → Notification (1:N)
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User → Queue (1:1)
User.hasOne(Queue, { foreignKey: 'userId', as: 'queueEntry', onDelete: 'CASCADE' });
Queue.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User → Report (1:N as reporter)
User.hasMany(Report, { foreignKey: 'reportedBy', as: 'reportsSubmitted' });
Report.belongsTo(User, { foreignKey: 'reportedBy', as: 'reporter' });

// User → AdminLog (1:N as admin)
User.hasMany(AdminLog, { foreignKey: 'adminId', as: 'adminLogs' });
AdminLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

// User → Self-referential (referredBy)
User.belongsTo(User, { foreignKey: 'referredById', as: 'referrer' });
User.hasMany(User, { foreignKey: 'referredById', as: 'referrals' });

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  sequelize,
  DataTypes,
  User,
  Wallet,
  Transaction,
  Game,
  MatchHistory,
  Queue,
  Notification,
  Report,
  AdminLog,
  BotConfig,
  ProbabilityConfig,
  ChatMessage,
  LobbyGame,
  ProbabilityAudit,
  Popup,
};
