const dotenv = require('dotenv');

dotenv.config();

const requiredEnvVars = [
  'PORT',
  'NODE_ENV',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRE',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'CLIENT_URL',
  'ADMIN_URL',
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

module.exports = {
  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  socketPort: parseInt(process.env.SOCKET_PORT, 10) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Database
  mongoUri: process.env.MONGO_URI,

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRE || '7d',

  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // URLs
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,

  // Game Config
  defaultCoins: parseInt(process.env.DEFAULT_COINS, 10) || 500,
  defaultBetAmount: parseInt(process.env.DEFAULT_BET_AMOUNT, 10) || 100,
  turnTimeoutSeconds: parseInt(process.env.TURN_TIMEOUT_SECONDS, 10) || 20,
  queueTimeoutSeconds: parseInt(process.env.QUEUE_TIMEOUT_SECONDS, 10) || 10,
  disconnectTimeoutSeconds: parseInt(process.env.DISCONNECT_TIMEOUT_SECONDS, 10) || 30,

  // SMTP (Optional)
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
  },

  // Sentry
  sentryDsn: process.env.SENTRY_DSN,

  // Environment
  environment: process.env.ENVIRONMENT || 'development',
};
