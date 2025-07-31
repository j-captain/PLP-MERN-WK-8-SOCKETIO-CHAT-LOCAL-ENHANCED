const { Server } = require('http');
const socketio = require('socket.io');
const app = require('../server');
const db = require('../config/db');

let testServer, testIo;

async function startTestServer() {
  try {
    await db.connectDB();
    
    return new Promise((resolve, reject) => {
      testServer = Server(app);
      
      // Enhanced Socket.IO config for testing
      testIo = socketio(testServer, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        },
        connectionStateRecovery: {
          maxDisconnectionDuration: 2000,
          skipMiddlewares: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket']
      });
      
      testServer.listen(0, () => {
        const port = testServer.address().port;
        console.log(`Test server running on port ${port}`);
        resolve({ 
          io: testIo,
          server: testServer,
          port 
        });
      });
      
      testServer.on('error', reject);
    });
  } catch (err) {
    console.error('Failed to start test server:', err);
    throw err;
  }
}

async function stopTestServer() {
  try {
    if (testIo) {
      testIo.close();
      await new Promise(resolve => testIo.of('/').adapter.once('close', resolve));
    }
    if (testServer) {
      await new Promise(resolve => testServer.close(resolve));
    }
    await db.clearDatabase();
    await db.closeConnection();
  } catch (err) {
    console.error('Error stopping test server:', err);
    throw err;
  }
}

module.exports = {
  startTestServer,
  stopTestServer
};