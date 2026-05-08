const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { initializeFirebase } = require('./config/firebase');
const { initializeRedis } = require('./config/redis');
const { configureSocket } = require('./config/socket');
const config = require('./config/env');

// Import socket handlers
const gameSocket = require('./sockets/game.socket');
const chatSocket = require('./sockets/chat.socket');
const botSocket = require('./sockets/bot.socket');

const server = http.createServer(app);

// Socket.io Configuration
const io = new Server(server, configureSocket({}));

// Socket event handlers
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Game events
  gameSocket(socket, io);
  
  // Chat events
  chatSocket(socket, io);
  
  // Bot events
  botSocket(socket, io);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Global error handling for socket
io.engine.on('connection_error', (err) => {
  console.error('Socket connection error:', err);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\nShutting down gracefully...');
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      await disconnectDB();
      console.log('Database disconnected');
    } catch (error) {
      console.error('Error disconnecting database:', error.message);
    }
    
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Server startup
const startServer = async () => {
  try {
    console.log(`Starting server in ${config.nodeEnv} environment...`);

    // Connect to database
    await connectDB();

    // Initialize Firebase
    initializeFirebase();

    // Initialize Redis (optional)
    try {
      await initializeRedis();
    } catch (error) {
      console.warn('Redis initialization failed, continuing without Redis');
    }

    // Start server
    server.listen(config.port, () => {
      console.log(`✓ Server running on port ${config.port}`);
      console.log(`✓ Socket.io listening on port ${config.socketPort}`);
      console.log(`✓ API Base URL: http://localhost:${config.port}/api/v1`);
      console.log(`✓ Health Check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    console.error('Server startup error:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = server;
