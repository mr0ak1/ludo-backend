const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const config = require('./config/env');
const swaggerDocs = require('./config/swagger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const walletRoutes = require('./routes/wallet.routes');
const gameRoutes = require('./routes/game.routes');
const matchmakingRoutes = require('./routes/matchmaking.routes');
const botRoutes = require('./routes/bot.routes');
const chatRoutes = require('./routes/chat.routes');
const statsRoutes = require('./routes/stats.routes');
const notificationRoutes = require('./routes/notification.routes');
const reportRoutes = require('./routes/report.routes');
const adminRoutes = require('./routes/admin.routes');

// Import middlewares
const errorMiddleware = require('./middlewares/error.middleware');
const loggingMiddleware = require('./middlewares/logging.middleware');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: [config.clientUrl, config.adminUrl],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Body Parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Data sanitization
app.use(mongoSanitize());
app.use(xss());

// Logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}
app.use(loggingMiddleware);

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/game', gameRoutes);
app.use('/api/v1/matchmaking', matchmakingRoutes);
app.use('/api/v1/bot', botRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/notification', notificationRoutes);
app.use('/api/v1/report', reportRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Error Handler Middleware (Must be last)
app.use(errorMiddleware);

module.exports = app;
