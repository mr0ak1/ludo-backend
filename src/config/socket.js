const config = require('./env');

const getSocketOptions = () => ({
  cors: {
    origin: [config.clientUrl, config.adminUrl],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 1e6,
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024,
  },
});

const configureSocket = (io) => {
  io.use((socket, next) => {
    // Socket authentication middleware
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token && config.isProduction) {
      return next(new Error('Authentication error'));
    }
    
    if (token) {
      try {
        const { verifyToken } = require('../utils/generateToken');
        const decoded = verifyToken(token);
        socket.userId = decoded.userId;
      } catch (err) {
        if (config.isProduction) return next(new Error('Authentication error'));
      }
    }
    
    next();
  });

  // CORS configuration
  io.engine.on('initial_headers', (headers, req) => {
    headers['Access-Control-Allow-Origin'] = config.clientUrl;
    headers['Access-Control-Allow-Credentials'] = 'true';
  });

  return io;
};

module.exports = {
  configureSocket,
  getSocketOptions,
};
