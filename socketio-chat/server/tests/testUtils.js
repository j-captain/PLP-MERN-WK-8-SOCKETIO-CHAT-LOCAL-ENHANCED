const { Server } = require('socket.io');
const http = require('http');
const app = require('../server');

module.exports = {
  setupTestServer: async () => {
    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
      pingTimeout: 60000,
      pingInterval: 25000
    });

    return new Promise((resolve) => {
      const testServer = httpServer.listen(0, () => {
        console.log(`[Test] Server running on port ${testServer.address().port}`);
        resolve({
          io,
          server: testServer,
          port: testServer.address().port
        });
      });
    });
  }
};