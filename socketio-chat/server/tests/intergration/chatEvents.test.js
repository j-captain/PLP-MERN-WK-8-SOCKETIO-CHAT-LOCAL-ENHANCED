const { setupTestServer } = require('../testUtils');
const socketClient = require('socket.io-client');

describe('Chat Events Integration', () => {
  let httpServer, io, clientSocket, port;

  beforeAll(async () => {
    console.log('[Test] Setting up test server...');
    const testServer = await setupTestServer();
    httpServer = testServer.server;
    io = testServer.io;
    port = testServer.port;
    console.log(`[Test] Server running on port ${port}`);
  }, 30000); // 30s timeout for setup

  afterAll((done) => {
    console.log('[Test] Cleaning up test server...');
    if (io) {
      console.log('[Test] Closing Socket.IO server...');
      io.close();
    }
    if (httpServer) {
      console.log('[Test] Closing HTTP server...');
      httpServer.close(done);
    } else {
      done();
    }
  });

  beforeEach(async () => {
    console.log('[Test] Creating new client connection...');
    clientSocket = socketClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      timeout: 5000
    });

    // Enhanced connection logging
    clientSocket.on('connect', () => {
      console.log(`[Test] Client connected with ID: ${clientSocket.id}`);
    });

    clientSocket.on('disconnect', (reason) => {
      console.log(`[Test] Client disconnected: ${reason}`);
    });

    clientSocket.on('connect_error', (err) => {
      console.error('[Test] Connection error:', err.message);
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[Test] Connection timeout reached');
        reject(new Error('Connection timeout'));
      }, 5000);

      clientSocket.on('connect', () => {
        clearTimeout(timeout);
        console.log('[Test] Client connection established');
        resolve();
      });

      clientSocket.on('connect_error', (err) => {
        clearTimeout(timeout);
        console.error('[Test] Connection failed:', err.message);
        reject(err);
      });
    });
  });

  afterEach(() => {
    console.log('[Test] Cleaning up client connection...');
    if (clientSocket?.connected) {
      console.log(`[Test] Disconnecting client ${clientSocket.id}...`);
      clientSocket.disconnect();
    }
  });

  test('should handle room joining and messaging', async () => {
    jest.setTimeout(15000); // 15s timeout for this test
    console.log('[Test] Starting room joining and messaging test...');

    const testRoom = 'arsenal';
    const testUsername = 'mjkarranja';
    const testMessage = 'Hello world';

    // Set username first (matches your server requirement)
    console.log(`[Test] Setting username to ${testUsername}...`);
    clientSocket.emit('setUsername', testUsername);

    // Debug event listeners
    clientSocket.on('roomJoined', (data) => {
      console.log(`[Test] Received roomJoined:`, JSON.stringify(data, null, 2));
    });

    clientSocket.on('message', (msg) => {
      console.log(`[Test] Received message:`, JSON.stringify(msg, null, 2));
    });

    clientSocket.on('error', (err) => {
      console.error('[Test] Socket error:', err);
    });

    // Setup server-side handlers for test environment
    io.on('connection', (socket) => {
      console.log(`[Server] Test client connected: ${socket.id}`);

      socket.on('joinRoom', (data, callback) => {
        console.log(`[Server] joinRoom received:`, JSON.stringify(data, null, 2));
        socket.join(data.roomName);
        callback({ status: 'success' });
        io.to(data.roomName).emit('roomJoined', { 
          name: data.roomName,
          userCount: 1,
          participants: [data.username]
        });
        console.log(`[Server] Emitted roomJoined for ${data.roomName}`);
      });

      socket.on('sendMessage', (data, callback) => {
        console.log(`[Server] sendMessage received:`, JSON.stringify(data, null, 2));
        const message = {
          content: data.content,
          username: testUsername,
          room: data.room,
          time: new Date()
        };
        io.to(data.room).emit('message', message);
        callback({ status: 'received' });
        console.log(`[Server] Emitted message to ${data.room}`);
      });
    });

    // Test room joining with acknowledgment
    console.log(`[Test] Attempting to join room ${testRoom}...`);
    const joinPromise = new Promise((resolve) => {
      clientSocket.once('roomJoined', (data) => {
        console.log(`[Test] roomJoined event received`);
        resolve(data);
      });
    });

    clientSocket.emit('joinRoom', {
      roomName: testRoom,
      username: testUsername
    }, (ack) => {
      if (!ack || ack.status !== 'success') {
        console.error('[Test] Join room acknowledgment failed:', ack);
        throw new Error('Join room failed');
      }
      console.log('[Test] Join room acknowledgment received');
    });

    const joinData = await joinPromise;
    console.log('[Test] Room joined successfully');
    expect(joinData.name).toBe(testRoom);
    expect(joinData.userCount).toBe(1);

    // Test messaging with acknowledgment
    console.log(`[Test] Sending test message: "${testMessage}"...`);
    const messagePromise = new Promise((resolve) => {
      clientSocket.once('message', (data) => {
        console.log('[Test] Message event received');
        resolve(data);
      });
    });

    clientSocket.emit('sendMessage', {
      content: testMessage,
      room: testRoom
    }, (ack) => {
      if (!ack || ack.status !== 'received') {
        console.error('[Test] Message acknowledgment failed:', ack);
        throw new Error('Message not received');
      }
      console.log('[Test] Message acknowledgment received');
    });

    const messageData = await messagePromise;
    console.log('[Test] Message received successfully');
    expect(messageData.content).toBe(testMessage);
    expect(messageData.username).toBe(testUsername);
    expect(messageData.room).toBe(testRoom);
  });
});