const { Server } = require('http');
const socketio = require('socket.io');
const app = require('../server');

module.exports = async () => {
  const httpServer = new Server(app);
  const io = socketio(httpServer);
  
  await new Promise((resolve) => {
    httpServer.listen(0, resolve);
  });
  
  const port = httpServer.address().port;
  
  return {
    io,
    httpServer,
    port,
    close: () => new Promise((resolve) => httpServer.close(resolve))
  };
};