const { Sequelize } = require('sequelize');
const config = require('./env');

const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mysql',
    logging: config.isDevelopment ? (msg) => require('../utils/logger').debug(msg) : false,
    pool: {
      max: 15000, // Increased to 15000 as per request for large server
      min: 0,
      acquire: 60000, // Increased to 60s to prevent premature timeout
      idle: 10000,
    },
    define: {
      underscored: false,
      timestamps: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    timezone: '+05:30',
  }
);

// Global Mongoose Compatibility Layer for Sequelize Models
const { Model } = require('sequelize');

Object.defineProperty(Model.prototype, '_id', {
  get() {
    if (this.constructor.name === 'Game') {
      return String(this.gameId || this.id);
    }
    return this.id !== undefined && this.id !== null ? String(this.id) : undefined;
  },
  configurable: true,
  enumerable: true
});

const originalToJSON = Model.prototype.toJSON;
Model.prototype.toJSON = function () {
  const values = originalToJSON.call(this);
  if (values && typeof values === 'object') {
    if (this.constructor.name === 'Game') {
      values._id = String(values.gameId || values.id);
      values.id = String(values.id);
    } else {
      if (values.id !== undefined && values.id !== null) {
        values.id = String(values.id);
        values._id = String(values.id);
      } else if (values._id !== undefined && values._id !== null) {
        values._id = String(values._id);
      }
    }
  }
  return values;
};

const connectDB = async () => {
  try {
    console.log('Connecting to MySQL...');
    await sequelize.authenticate();
    console.log('MySQL connected successfully.');

    try {
      console.log('Altering transactions status ENUM...');
      await sequelize.query("ALTER TABLE transactions MODIFY COLUMN status ENUM('pending', 'processing', 'completed', 'failed', 'reversed') DEFAULT 'completed'");
      console.log('ENUM altered successfully.');
    } catch (err) {
      console.log('Error altering ENUM:', err.message);
    }

    // Sync all models (creates tables if they don't exist)
    if (config.nodeEnv === 'production') {
      await sequelize.sync();
    } else {
      await sequelize.sync({ alter: true });
    }
    console.log('All MySQL tables synced.');

    return sequelize;
  } catch (error) {
    console.error('MySQL connection error:', error.message);
    if (config.isDevelopment) {
      console.log('Retrying MySQL connection in 5 seconds...');
      setTimeout(() => connectDB(), 5000);
    } else {
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  try {
    await sequelize.close();
    console.log('MySQL disconnected');
  } catch (error) {
    console.error('MySQL disconnection error:', error.message);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  connectDB,
  disconnectDB,
};
