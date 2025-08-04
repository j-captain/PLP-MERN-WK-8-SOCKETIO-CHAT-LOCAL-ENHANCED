const { Server } = require('socket.io');
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const socketIOClient = require('socket.io-client');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration with increased timeouts
const TEST_DB_URI = process.env.TEST_DB_URI || 'mongodb://localhost:27017/socketio-chat-test';
const SALT_ROUNDS = process.env.SALT_ROUNDS || 10;
const SOCKET_TIMEOUT = process.env.SOCKET_TIMEOUT || 10000;  // Increased from 5000
const SERVER_TIMEOUT = process.env.SERVER_TIMEOUT || 20000;   // Increased from 10000

// Password hashing with bcrypt
const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// Enhanced logging with colors and timestamps
const colors = {
  reset: '\x1b[0m',
  test: '\x1b[36m',  // cyan
  success: '\x1b[32m', // green
  error: '\x1b[31m',   // red
  warn: '\x1b[33m',    // yellow
  info: '\x1b[34m',    // blue
  debug: '\x1b[35m'    // magenta
};

const log = (level, message) => {
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.reset;
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}]${colors.reset} ${message}`);
};

// Clear database completely (including dropping collections)
const clearDatabase = async () => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    // Skip system collections
    const userCollections = collections.filter(col => !col.name.startsWith('system.'));
    
    for (const col of userCollections) {
      try {
        await mongoose.connection.db.dropCollection(col.name);
        log('debug', `Dropped collection: ${col.name}`);
      } catch (err) {
        log('error', `Error dropping collection ${col.name}: ${err.message}`);
      }
    }
    log('success', 'Database cleared');
  } catch (err) {
    log('error', `Error clearing database: ${err.message}`);
    throw err;
  }
};

// Enhanced test server setup
const setupTestServer = async () => {
  const app = require('../server');
  const httpServer = http.createServer(app);
  
  // Configure Socket.IO with enhanced options
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 30000,
      skipMiddlewares: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: SERVER_TIMEOUT
  });

  return new Promise((resolve, reject) => {
    const testServer = httpServer.listen(0, () => {
      const port = testServer.address().port;
      log('info', `Server running on port ${port}`);
      resolve({
        io,
        server: testServer,
        port
      });
    });

    testServer.on('error', (err) => {
      log('error', `Server error: ${err.message}`);
      reject(err);
    });

    // Set server timeout
    testServer.setTimeout(SERVER_TIMEOUT);
  });
};

// Enhanced database connection
const initializeTestDb = async () => {
  try {
    log('info', 'Connecting to database...');
    
    // Close any existing connections first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(TEST_DB_URI, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      minPoolSize: 1,
      heartbeatFrequencyMS: 2000
    });
    
    log('success', `Connected to database: ${TEST_DB_URI}`);
    return mongoose.connection;
  } catch (err) {
    log('error', `Database connection failed: ${err.message}`);
    throw err;
  }
};

// Enhanced socket connection with retry and better error handling
const connectTestSocket = async (port, credentials = {}, options = {}) => {
  const socket = socketIOClient(`http://localhost:${port}`, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    timeout: SOCKET_TIMEOUT,
    ...options
  });

  // Add debug logging for all socket events
  socket.onAny((event, ...args) => {
    log('debug', `Socket event: ${event}`, args.length > 0 ? args : '');
  });

  try {
    const authResult = await new Promise((resolve, reject) => {
      // Connection timeout
      const connectionTimer = setTimeout(() => {
        socket.disconnect();
        reject(new Error(`Connection timeout after ${SOCKET_TIMEOUT}ms`));
      }, SOCKET_TIMEOUT);

      // Handle successful connection
      const onConnect = () => {
        clearTimeout(connectionTimer);
        log('debug', 'Socket connected successfully');
        
        // Authentication timeout
        const authTimer = setTimeout(() => {
          socket.off('authenticated', onAuthenticated);
          socket.off('auth_error', onAuthError);
          socket.disconnect();
          reject(new Error(`Authentication timeout after ${SOCKET_TIMEOUT}ms`));
        }, SOCKET_TIMEOUT);

        const onAuthenticated = (data) => {
          clearTimeout(authTimer);
          log('debug', 'Authentication successful', data);
          resolve(data);
        };

        const onAuthError = (err) => {
          clearTimeout(authTimer);
          log('debug', 'Authentication error', err);
          reject(err);
        };

        log('debug', `Emitting authenticate with credentials: ${JSON.stringify(credentials)}`);
        socket.emit('authenticate', credentials);
        socket.once('authenticated', onAuthenticated);
        socket.once('auth_error', onAuthError);
      };

      socket.once('connect', onConnect);
      socket.once('connect_error', (err) => {
        clearTimeout(connectionTimer);
        reject(err);
      });
    });

    return { socket, authResult };
  } catch (err) {
    socket.disconnect();
    const errorMsg = `Socket connection failed: ${err.message}. Connection state: ${socket.connected ? 'connected' : 'disconnected'}`;
    log('error', errorMsg);
    throw new Error(errorMsg);
  }
};

// Enhanced test user creation with username validation
const createTestUser = async (userData) => {
  const User = mongoose.model('User');
  
  // Ensure username meets requirements
  const username = userData.username.replace(/[^a-zA-Z0-9_]/g, '_');
  if (username !== userData.username) {
    log('warn', `Sanitized username from '${userData.username}' to '${username}'`);
  }

  try {
    const user = await User.create({
      ...userData,
      username, // Use sanitized username
      password: await hashPassword(userData.password),
      isVerified: true,
      lastActive: new Date()
    });
    log('success', `User created: ${user.username}`);
    return user;
  } catch (err) {
    log('error', `Error creating user ${userData.username}: ${err.message}`);
    throw err;
  }
};

// Enhanced test room creation
const createTestRoom = async (roomData, createdBy) => {
  const Room = mongoose.model('Room');
  try {
    const room = await Room.create({
      ...roomData,
      createdBy,
      participants: [createdBy],
      activeUsers: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    log('success', `Room created: ${room.name}`);
    return room;
  } catch (err) {
    log('error', `Error creating room ${roomData.name}: ${err.message}`);
    throw err;
  }
};

// Enhanced test message creation
const createTestMessage = async (messageData) => {
  const Message = mongoose.model('Message');
  try {
    const message = await Message.create({
      ...messageData,
      timestamp: new Date(),
      readBy: []
    });
    log('debug', `Message created by ${message.sender}`);
    return message;
  } catch (err) {
    log('error', `Error creating message: ${err.message}`);
    throw err;
  }
};

// Enhanced socket disconnection
const disconnectTestSocket = (socket) => {
  if (socket && socket.connected) {
    socket.disconnect();
    log('debug', 'Socket disconnected');
  }
};

// Cleanup utility
const cleanup = async (io, server, sockets = []) => {
  try {
    // Disconnect all sockets
    if (io) {
      io.sockets.sockets.forEach(socket => socket.disconnect(true));
    }
    
    // Disconnect test sockets
    sockets.forEach(disconnectTestSocket);
    
    // Clear database
    await clearDatabase();
    
    // Close server if provided
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          log('info', 'Test server closed');
          resolve();
        });
      });
    }
  } catch (err) {
    log('error', `Cleanup error: ${err.message}`);
    throw err;
  }
};

module.exports = {
  log,
  setupTestServer,
  initializeTestDb,
  clearDatabase,
  closeDatabase: async () => {
    await mongoose.disconnect();
    log('info', 'Database connection closed');
  },
  createTestUser,
  createTestRoom,
  createTestMessage,
  connectTestSocket,
  disconnectTestSocket,
  cleanup,
  hashPassword
};