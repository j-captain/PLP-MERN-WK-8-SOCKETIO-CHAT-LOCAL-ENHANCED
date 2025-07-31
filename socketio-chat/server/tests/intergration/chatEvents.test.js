const { setupTestServer } = require('../testUtils');
const socketClient = require('socket.io-client');
const User = require('../../models/User');
const Room = require('../../models/Room');
const fetch = require('node-fetch');
const mongoose = require('mongoose');

describe('Chat Events Integration (socketioChat DB)', () => {
  let httpServer, io, clientSocket, port;
  const testUser = {
    username: 'testuser',
    password: 'testpass',
    room: 'general'
  };

  beforeAll(async () => {
    console.log('[Test] Initializing test environment for socketioChat DB...');
    
    // Connect to test database
    await mongoose.connect('mongodb://localhost:27017/socketioChat', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('[Test] Connected to socketioChat database');

    // Setup test server
    const testServer = await setupTestServer();
    httpServer = testServer.server;
    io = testServer.io;
    port = testServer.port;
    console.log(`[Test] Test server running on port ${port}`);

    // Initialize test data
    try {
      // Clear existing test data
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
      console.error('[Test] Database initialization failed:', err);
      throw err;
    }
  }, 30000);

  afterAll(async () => {
    console.log('[Test] Cleaning up socketioChat test environment...');
    
    // Clean test data
    await User.deleteMany({ username: testUser.username });
    await Room.deleteMany({ name: testUser.room });
    
    // Close database connection
    await mongoose.disconnect();
    console.log('[Test] Disconnected from socketioChat DB');

    // Close servers
    return new Promise((resolve) => {
      if (io) io.close();
      if (httpServer) httpServer.close(() => {
        console.log('[Test] Test server closed');
        resolve();
      });
    });
  });

  beforeEach(async () => {
    console.log('[Test] Establishing socket connection...');
    clientSocket = socketClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      timeout: 5000,
      query: {
        username: testUser.username,
        room: testUser.room
      }
    });

    // Connection handlers with enhanced logging
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        console.error('[Test] Socket connection timeout');
        reject(new Error('Connection timeout'));
      }, 5000);

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
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
      console.log('[Test] Socket disconnected from socketioChat');
    }
  });

  test('should authenticate and interact with socketioChat DB', async () => {
    jest.setTimeout(30000);
    console.log('[Test] Starting socketioChat DB integration test...');

    // 1. HTTP Authentication
    console.log('[Test] Authenticating via HTTP against socketioChat DB...');
    const authResponse = await fetch(`http://localhost:${port}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUser.username,
        password: testUser.password
      })
    });

    if (!authResponse.ok) {
      const error = await authResponse.json();
      throw new Error(`socketioChat authentication failed: ${error.message || error}`);
    }
    const authData = await authResponse.json();
    console.log('[Test] socketioChat authentication successful:', authData);

    // 2. Verify User in Database
    console.log('[Test] Verifying user in socketioChat DB...');
    const dbUser = await User.findOne({ username: testUser.username });
    expect(dbUser).toBeTruthy();
    expect(dbUser.room).toBe(testUser.room);

    // 3. Socket Authentication
    console.log('[Test] Authenticating socket connection...');
    const authSocket = new Promise((resolve) => {
      clientSocket.once('authenticated', (userData) => {
        console.log('[Test] Socket authenticated with socketioChat:', userData);
        resolve(userData);
      });
    });

    clientSocket.emit('authenticate', {
      username: testUser.username,
      room: testUser.room
    });

    const socketAuthData = await authSocket;
    expect(socketAuthData.username).toBe(testUser.username);
    expect(socketAuthData.room).toBe(testUser.room);

    // 4. Verify Room in Database
    console.log('[Test] Verifying room in socketioChat DB...');
    const dbRoom = await Room.findOne({ name: testUser.room });
    expect(dbRoom).toBeTruthy();
    expect(dbRoom.participants).toContain(testUser.username);

    // 5. Test Room Join
    console.log('[Test] Testing room join...');
    const roomJoinPromise = new Promise((resolve) => {
      clientSocket.once('roomJoined', (roomData) => {
        console.log('[Test] Room joined in socketioChat:', roomData);
        resolve(roomData);
      });
    });

    clientSocket.emit('joinRoom', {
      roomName: testUser.room,
      username: testUser.username
    });

    const joinData = await roomJoinPromise;
    expect(joinData.name).toBe(testUser.room);
    expect(joinData.participants).toContain(testUser.username);

    // 6. Verify Room Update in Database
    console.log('[Test] Verifying room update in socketioChat DB...');
    const updatedRoom = await Room.findOne({ name: testUser.room });
    expect(updatedRoom.lastActivity).toBeDefined();

    // 7. Test Messaging
    console.log('[Test] Testing messaging in socketioChat...');
    const testMessage = 'Testing socketioChat DB integration';
    const messagePromise = new Promise((resolve) => {
      clientSocket.once('message', (msg) => {
        console.log('[Test] Message received in socketioChat:', msg);
        resolve(msg);
      });
    });

    clientSocket.emit('sendMessage', {
      content: testMessage,
      room: testUser.room
    });

    const receivedMessage = await messagePromise;
    expect(receivedMessage.content).toBe(testMessage);
    expect(receivedMessage.username).toBe(testUser.username);
    expect(receivedMessage.room).toBe(testUser.room);

    // 8. Verify Message in Database
    console.log('[Test] Verifying message in socketioChat DB...');
    const dbMessage = await Message.findOne({
      room: dbRoom._id,
      content: testMessage
    });
    expect(dbMessage).toBeTruthy();
  });
});