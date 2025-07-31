const ioClient = require('socket.io-client');
const { startTestServer, stopTestServer } = require('../testUtils');

describe('Chat Events Integration', () => {
  let testServer, clientSocket, port;

  beforeAll(async () => {
    testServer = await startTestServer();
    port = testServer.port;
  }, 20000);

  afterAll(async () => {
    await stopTestServer();
  }, 20000);

  beforeEach(() => {
    clientSocket = ioClient(`http://localhost:${port}`, {
      reconnection: false,
      timeout: 15000,
      transports: ['websocket'],
      forceNew: true
    });
  });

  afterEach(async () => {
    if (clientSocket.connected) {
      await new Promise(resolve => {
        clientSocket.on('disconnect', resolve);
        clientSocket.disconnect();
      });
    }
  });

  test('should receive message when sent', async () => {
    // Set username first
    clientSocket.emit('setUsername', 'testUser');
    
    // Set up room joined listener
    const roomJoined = new Promise((resolve) => {
      clientSocket.on('roomJoined', resolve);
    });

    // Join room
    clientSocket.emit('joinRoom', { 
      room: 'general',
      username: 'testUser'
    });

    // Wait for join confirmation
    await roomJoined;

    // Set up message listener
    const messageReceived = new Promise((resolve) => {
      clientSocket.on('message', resolve);
    });

    // Send message
    clientSocket.emit('sendMessage', {
      content: 'Hello world',
      room: 'general'
    });

    // Wait for message
    const receivedMessage = await messageReceived;
    
    expect(receivedMessage.username).toBe('testUser');
    expect(receivedMessage.content).toBe('Hello world');
  }, 15000);
});