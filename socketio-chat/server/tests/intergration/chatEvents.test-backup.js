const io = require('socket.io-client');
const http = require('http');
const { Server } = require('socket.io');

describe('Chat Events Integration Tests', () => {
  let ioServer;
  let httpServer;
  let clientSocket;
  const PORT = 5001;

  beforeAll((done) => {
    // Create HTTP server
    httpServer = http.createServer();
    
    // Set up Socket.IO server
    ioServer = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      connectTimeout: 5000
    });

    // Set up your socket event handlers
    ioServer.on('connection', (socket) => {
      console.log('Server: Client connected');
      socket.emit('welcome', 'Welcome to the chat!');
      
      socket.on('join', (username) => {
        console.log(`Server: User joined - ${username}`);
        ioServer.emit('userJoined', `${username} has joined the chat`);
      });
      
      socket.on('sendMessage', (message) => {
        console.log(`Server: Message received - ${message.text}`);
        ioServer.emit('message', message);
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`Test server listening on port ${PORT}`);
      clientSocket = io(`http://localhost:${PORT}`, {
        reconnection: false,
        timeout: 5000,
        transports: ['websocket']
      });
      
      clientSocket.on('connect', () => {
        console.log('Client: Connected to server');
        done();
      });
      
      clientSocket.on('connect_error', (err) => {
        console.error('Client: Connection error:', err);
        done.fail(err);
      });
      
      clientSocket.on('disconnect', (reason) => {
        console.log('Client: Disconnected -', reason);
      });
    });
  }, 10000); // Increased setup timeout

  afterAll((done) => {
    console.log('Cleaning up test environment');
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    if (ioServer) {
      ioServer.close();
    }
    if (httpServer) {
      httpServer.close(() => {
        console.log('Test server closed');
        done();
      });
    } else {
      done();
    }
  });

  test('should receive welcome message on connection', (done) => {
  // Create a new client connection specifically for this test
  const testSocket = io(`http://localhost:${PORT}`, {
    reconnection: false,
    timeout: 5000
  });
  
  testSocket.on('connect', () => {
    testSocket.once('welcome', (message) => {
      expect(message).toBe('Welcome to the chat!');
      testSocket.disconnect();
      done();
    });
  });
}, 10000);

  test('should broadcast user join message', (done) => {
    const testUsername = 'testUser';
    
    clientSocket.once('userJoined', (message) => {
      console.log('Client: Received user joined message');
      expect(message).toBe(`${testUsername} has joined the chat`);
      done();
    });

    clientSocket.emit('join', testUsername);
  }, 10000); // 10 second timeout

  test('should send and receive messages', (done) => {
    const testMessage = {
      user: 'testUser',
      text: 'Hello world'
    };
    
    clientSocket.once('message', (msg) => {
      console.log('Client: Received message');
      expect(msg.user).toBe(testMessage.user);
      expect(msg.text).toBe(testMessage.text);
      done();
    });

    clientSocket.emit('sendMessage', testMessage);
  }, 10000); // 10 second timeout
});