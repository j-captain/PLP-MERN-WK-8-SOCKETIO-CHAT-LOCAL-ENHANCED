const { setupTestServer } = require('../testUtils');
const socketClient = require('socket.io-client');
const User = require('../../models/User');
const Room = require('../../models/Room');
const Message = require('../../models/Message');
const mongoose = require('mongoose');

describe('Chat Events Integration (socketioChat DB)', () => {
  let httpServer, io, clientSocket, port;
  const testUser = {
    username: 'testuser',
    room: 'general'
  };

  // Set higher timeout for all tests in this suite
  jest.setTimeout(60000);

  beforeAll(async () => {
    console.log('[Test] Initializing test environment for socketioChat DB...');
    
    try {
      // Connect to test database with timeout settings
      await mongoose.connect('mongodb://localhost:27017/socketioChat', {
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('[Test] Connected to socketioChat database');

      // Setup test server
      const testServer = await setupTestServer();
      httpServer = testServer.server;
      io = testServer.io;
      port = testServer.port;
      console.log(`[Test] Test server running on port ${port}`);

      // Initialize test data
      await User.deleteMany({ username: testUser.username });
      await Room.deleteMany({ name: testUser.room });
      
      // Create test user with room association
      const user = await User.create(testUser);
      console.log(`[Test] Test user created in socketioChat DB: ${user.username}`);

      // Create default room
      const room = await Room.create({
        name: testUser.room,
        createdBy: testUser.username,
        participants: [testUser.username]
      });
      console.log(`[Test] Test room created in socketioChat DB: ${room.name}`);

    } catch (err) {
      console.error('[Test] Initialization failed:', err);
      throw err;
    }
  });

  afterAll(async () => {
    console.log('[Test] Cleaning up socketioChat test environment...');
    
    try {
      // Close socket if still connected
      if (clientSocket?.connected) {
        clientSocket.disconnect();
        console.log('[Test] Socket disconnected from socketioChat');
      }

      // First find the room to get its ID
      const room = await Room.findOne({ name: testUser.room });
      const roomId = room?._id;

      // Clean test data
      await User.deleteMany({ username: testUser.username });
      await Room.deleteMany({ name: testUser.room });
      
      // Only try to delete messages if we found the room
      if (roomId) {
        await Message.deleteMany({ room: roomId });
      }
      
      // Close database connection
      await mongoose.disconnect();
      console.log('[Test] Disconnected from socketioChat DB');

      // Close servers with timeout
      await new Promise((resolve) => {
        if (io) io.close();
        if (httpServer) {
          httpServer.close(() => {
            console.log('[Test] Test server closed');
            resolve();
          });
          // Force close after 5 seconds if not closed
          setTimeout(resolve, 5000);
        } else {
          resolve();
        }
      });
    } catch (err) {
      console.error('[Test] Cleanup failed:', err);
      throw err;
    }
  });

  beforeEach(async () => {
    console.log('[Test] Establishing socket connection...');
    
    try {
      clientSocket = socketClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        timeout: 10000,
        query: {
          username: testUser.username,
          room: testUser.room
        }
      });

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          console.error('[Test] Socket connection timeout');
          reject(new Error('Connection timeout'));
        }, 10000);

        clientSocket.on('connect', () => {
          clearTimeout(timer);
          console.log(`[Test] Socket connected to socketioChat (ID: ${clientSocket.id})`);
          resolve();
        });

        clientSocket.on('connect_error', (err) => {
          clearTimeout(timer);
          console.error('[Test] Socket connection error:', err.message);
          reject(err);
        });

        clientSocket.on('error', (err) => {
          console.error('[Test] Socket error:', err);
        });
      });
    } catch (err) {
      console.error('[Test] Socket connection failed:', err);
      throw err;
    }
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
      console.log('[Test] Socket disconnected from socketioChat');
    }
  });

  test('should interact with socketioChat DB', async () => {
    console.log('[Test] Starting socketioChat DB integration test...');

    // 1. Verify User in Database
    console.log('[Test] Verifying user in socketioChat DB...');
    const dbUser = await User.findOne({ username: testUser.username });
    expect(dbUser).toBeTruthy();
    expect(dbUser.username).toBe(testUser.username);
    expect(dbUser.room).toBe(testUser.room);

    // 2. Socket Authentication
    console.log('[Test] Authenticating socket connection...');
    const authSocket = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Socket authentication timeout'));
      }, 10000);

      clientSocket.once('authenticated', (userData) => {
        clearTimeout(timer);
        console.log('[Test] Socket authenticated:', userData);
        resolve(userData);
      });

      clientSocket.once('authentication_error', (err) => {
        clearTimeout(timer);
        reject(new Error(err.message));
      });
    });

    clientSocket.emit('authenticate', {
      username: testUser.username,
      room: testUser.room
    });

    const socketAuthData = await authSocket;
    expect(socketAuthData.username).toBe(testUser.username);
    expect(socketAuthData.room).toBe(testUser.room);

    // 3. Verify Room in Database
    console.log('[Test] Verifying room in socketioChat DB...');
    const dbRoom = await Room.findOne({ name: testUser.room });
    expect(dbRoom).toBeTruthy();
    expect(dbRoom.participants).toContain(testUser.username);

    // 4. Test Room Join
    console.log('[Test] Testing room join...');
    const roomJoinPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Room join timeout'));
      }, 10000);

      clientSocket.once('roomJoined', (roomData) => {
        clearTimeout(timer);
        console.log('[Test] Room joined:', roomData);
        resolve(roomData);
      });

      clientSocket.once('join_error', (err) => {
        clearTimeout(timer);
        reject(new Error(err.message));
      });
    });

    clientSocket.emit('joinRoom', {
      roomName: testUser.room,
      username: testUser.username
    });

    const joinData = await roomJoinPromise;
    expect(joinData.name).toBe(testUser.room);
    expect(joinData.participants).toContain(testUser.username);

    // 5. Verify Room Update in Database
    console.log('[Test] Verifying room update in socketioChat DB...');
    const updatedRoom = await Room.findOne({ name: testUser.room });
    expect(updatedRoom.lastActivity).toBeDefined();

    // 6. Test Messaging
    console.log('[Test] Testing messaging in socketioChat...');
    const testMessage = 'Testing socketioChat DB integration';
    const messagePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, 10000);

      clientSocket.once('message', (msg) => {
        clearTimeout(timer);
        console.log('[Test] Message received:', msg);
        resolve(msg);
      });

      clientSocket.once('message_error', (err) => {
        clearTimeout(timer);
        reject(new Error(err.message));
      });
    });

    clientSocket.emit('sendMessage', {
      content: testMessage,
      room: testUser.room,
      username: testUser.username
    });

    const receivedMessage = await messagePromise;
    expect(receivedMessage.content).toBe(testMessage);
    expect(receivedMessage.username).toBe(testUser.username);
    expect(receivedMessage.room).toBe(testUser.room);

    // 7. Verify Message in Database
    console.log('[Test] Verifying message in socketioChat DB...');
    const dbMessage = await Message.findOne({
      room: dbRoom._id,
      content: testMessage
    });
    expect(dbMessage).toBeTruthy();
    expect(dbMessage.content).toBe(testMessage);
    expect(dbMessage.sender).toBe(testUser.username);
  });
});