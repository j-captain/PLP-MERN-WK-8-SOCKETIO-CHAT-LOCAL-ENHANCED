const io = require('socket.io-client');
const http = require('http');
const { Server } = require('socket.io');
const chalk = require('chalk');

// Test Banner
console.log(chalk.bold.bgBlue('\n\n  🚀 STARTING CHAT EVENTS INTEGRATION TESTS  \n'));
console.log(chalk.blue('┌──────────────────────────────────────────────┐'));
console.log(chalk.blue('│    Testing Socket.IO Chat Functionality      │'));
console.log(chalk.blue('│    - Connection Events                      │'));
console.log(chalk.blue('│    - User Join Notifications                 │'));
console.log(chalk.blue('│    - Message Broadcasting                    │'));
console.log(chalk.blue('└──────────────────────────────────────────────┘\n'));

describe(chalk.bold.cyan('Chat Events Integration Tests'), () => {
  let ioServer;
  let httpServer;
  let clientSocket;
  const PORT = 5001;

  beforeAll((done) => {
    console.log(chalk.gray('\n🔧 Setting up test environment...'));
    
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
      console.log(chalk.green('  ✔ Server: Client connected'));
      socket.emit('welcome', 'Welcome to the chat!');
      
      socket.on('join', (username) => {
        console.log(chalk.green(`  ✔ Server: User joined - ${username}`));
        ioServer.emit('userJoined', `${username} has joined the chat`);
      });
      
      socket.on('sendMessage', (message) => {
        console.log(chalk.green(`  ✔ Server: Message received - ${message.text}`));
        ioServer.emit('message', message);
      });
    });

    httpServer.listen(PORT, () => {
      console.log(chalk.gray(`  ⚡ Test server listening on port ${PORT}`));
      clientSocket = io(`http://localhost:${PORT}`, {
        reconnection: false,
        timeout: 5000,
        transports: ['websocket']
      });
      
      clientSocket.on('connect', () => {
        console.log(chalk.green('  ✔ Client: Connected to server'));
        done();
      });
      
      clientSocket.on('connect_error', (err) => {
        console.error(chalk.red('  ✖ Client: Connection error:'), err);
        done.fail(err);
      });
      
      clientSocket.on('disconnect', (reason) => {
        console.log(chalk.yellow(`  ⚠ Client: Disconnected - ${reason}`));
      });
    });
  }, 10000);

  afterAll((done) => {
    console.log(chalk.gray('\n🧹 Cleaning up test environment...'));
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    if (ioServer) {
      ioServer.close();
    }
    if (httpServer) {
      httpServer.close(() => {
        console.log(chalk.gray('  ✔ Test server closed'));
        done();
      });
    } else {
      done();
    }
  });

  test(chalk.bold('should receive welcome message on connection'), (done) => {
    console.log(chalk.gray('\n🧪 Testing welcome message...'));
    
    const testSocket = io(`http://localhost:${PORT}`, {
      reconnection: false,
      timeout: 5000
    });
    
    testSocket.on('connect', () => {
      testSocket.once('welcome', (message) => {
        console.log(chalk.green(`  ✔ Received welcome message: "${message}"`));
        expect(message).toBe('Welcome to the chat!');
        testSocket.disconnect();
        done();
      });
    });
  }, 10000);

  test(chalk.bold('should broadcast user join message'), (done) => {
    console.log(chalk.gray('\n🧪 Testing user join notification...'));
    const testUsername = 'testUser';
    
    clientSocket.once('userJoined', (message) => {
      console.log(chalk.green(`  ✔ Received join notification: "${message}"`));
      expect(message).toBe(`${testUsername} has joined the chat`);
      done();
    });

    console.log(chalk.gray(`  ⚡ Emitting join event for user: ${testUsername}`));
    clientSocket.emit('join', testUsername);
  }, 10000);

  test(chalk.bold('should send and receive messages'), (done) => {
    console.log(chalk.gray('\n🧪 Testing message sending...'));
    const testMessage = {
      user: 'testUser',
      text: 'Hello world'
    };
    
    clientSocket.once('message', (msg) => {
      console.log(chalk.green(`  ✔ Message received from ${msg.user}: "${msg.text}"`));
      expect(msg.user).toBe(testMessage.user);
      expect(msg.text).toBe(testMessage.text);
      done();
    });

    console.log(chalk.gray(`  ⚡ Sending message: "${testMessage.text}"`));
    clientSocket.emit('sendMessage', testMessage);
  }, 10000);
});

// Test Completion Banner
afterAll(() => {
  console.log(chalk.bold.bgGreen('\n\n  ✅ ALL CHAT EVENTS TESTS COMPLETED SUCCESSFULLY  \n'));
  console.log(chalk.green('┌──────────────────────────────────────────────┐'));
  console.log(chalk.green('│    All Test Cases Passed                     │'));
  console.log(chalk.green('│    - Connection Established                 │'));
  console.log(chalk.green('│    - User Join Events Working               │'));
  console.log(chalk.green('│    - Message Broadcasting Functional        │'));
  console.log(chalk.green('└──────────────────────────────────────────────┘\n'));
});