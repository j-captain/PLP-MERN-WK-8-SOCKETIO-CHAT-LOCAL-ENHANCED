require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { instrument } = require("@socket.io/admin-ui");
const cors = require('cors');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Room = require('./models/Room');
const Messsage = require('./models/Message');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

const app = express();
const server = http.createServer(app);

// ASCII Art Constants
const BANNER = `
\x1b[36m
  ____ _           _   ____ _               _ 
 / ___| |__   __ _| |_/ ___| |__   ___  ___| |
| |   | '_ \\ / _\` | __| |   | '_ \\ / _ \\/ __| |
| |___| | | | (_| | |_| |___| | | |  __/\\__ \\_|
 \\____|_| |_|\\__,_|\\__|\\____|_| |_|\\___||___(_)
\x1b[0m`;

const FILE_UPLOAD_ART = `
\x1b[35m
  _____ _ _      ____  _   _ _   _ _____ ____  
 |  ___| (_) ___|  _ \\| | | | \\ | |_   _|  _ \\ 
 | |_  | | |/ _ \\ |_) | | | |  \\| | | | | |_) |
 |  _| | | |  __/  __/| |_| | |\\  | | | |  __/ 
 |_|   |_|_|\\___|_|    \\___/|_| \\_| |_| |_|    
\x1b[0m`;

// Enhanced colorful console helpers
const colorful = {
  success: (text) => `\x1b[32m✓ ${text}\x1b[0m`,
  error: (text) => `\x1b[31m✗ ${text}\x1b[0m`,
  info: (text) => `\x1b[36mℹ ${text}\x1b[0m`,
  warn: (text) => `\x1b[33m⚠ ${text}\x1b[0m`,
  debug: (text) => `\x1b[35m⚡ ${text}\x1b[0m`,
  banner: (text) => `\x1b[46m\x1b[30m${text}\x1b[0m`
};

// Enhanced file handling configuration
const uploadDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(colorful.success(`Created upload directory: ${uploadDir}`));
}

// Supported file types and their icons
const fileTypes = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  pdf: ['application/pdf'],
  document: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  archive: ['application/zip', 'application/x-rar-compressed'],
  text: ['text/plain']
};

const getFileType = (mimeType) => {
  for (const [type, mimes] of Object.entries(fileTypes)) {
    if (mimes.includes(mimeType)) return type;
  }
  return 'other';
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filename = `${Date.now()}-${originalName}`;
    console.log(colorful.debug(`Storing file as: ${filename}`));
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 25 // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log(colorful.debug(`Uploading file type: ${file.mimetype}`));
    cb(null, true);
  }
});

// Serve static files with proper headers
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res, filePath) => {
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    const viewableTypes = [
      ...fileTypes.image,
      ...fileTypes.audio,
      ...fileTypes.video,
      ...fileTypes.pdf,
      ...fileTypes.text
    ];
    
    if (viewableTypes.includes(contentType)) {
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// Enhanced file upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      console.log(colorful.error('No file received'));
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded or file too large' 
      });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    const fileType = getFileType(req.file.mimetype);

    console.log(FILE_UPLOAD_ART);
    console.log(colorful.success(`File uploaded: ${req.file.originalname}`));
    console.log(colorful.debug(`File saved at: ${req.file.path}`));
    console.log(colorful.debug(`File details: ${JSON.stringify({
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      url: fileUrl
    }, null, 2)}`));

    res.json({
      success: true,
      url: fileUrl,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      fileType
    });
  } catch (err) {
    console.log(colorful.error(`Upload error: ${err.message}`));
    res.status(500).json({ 
      success: false, 
      error: 'File upload failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Enhanced file download endpoint
app.get('/download/:filename', (req, res) => {
  try {
    const filePath = path.join(uploadDir, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(colorful.error(`File not found: ${req.params.filename}`));
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const originalName = req.params.filename.split('-').slice(1).join('-');
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Content-Type', contentType);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
      console.log(colorful.error(`File stream error: ${err.message}`));
      res.status(500).end();
    });
    
    console.log(colorful.success(`Serving file: ${originalName}`));
    fileStream.pipe(res);
  } catch (err) {
    console.log(colorful.error(`Download error: ${err.message}`));
    res.status(500).json({ success: false, error: 'File download failed' });
  }
});

// Enhanced file deletion endpoint
app.delete('/delete-file/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(colorful.error(`File not found: ${filename}`));
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${filename}`;

    await Messsage.updateMany(
      { 'file.url': fileUrl },
      { $set: { 'file.deleted': true } }
    );

    fs.unlinkSync(filePath);
    console.log(colorful.success(`File deleted: ${filename}`));

    res.json({ 
      success: true, 
      message: 'File deleted successfully',
      deletedUrl: fileUrl
    });
  } catch (err) {
    console.log(colorful.error(`Deletion error: ${err.message}`));
    res.status(500).json({ success: false, error: 'File deletion failed' });
  }
});

// Add error handling middleware for file uploads
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.log(colorful.error(`Multer error: ${err.message}`));
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      details: err.message
    });
  }
  next(err);
});

// Track active users and rooms
const activeUsers = new Map();
const roomUsers = new Map();
const userSockets = new Map();

// Enhanced CORS configuration for development
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = isProduction 
  ? [
      'https://plp-mern-wk-5-web-sockets.onrender.com',
      'https://plp-mern-wk-5-web-sockets-frontend-4.onrender.com',
      'https://admin.socket.io'
    ]
  : [
      'http://localhost:5173', 
      'http://127.0.0.1:5173',
      'http://localhost:5000', 
      'https://admin.socket.io'
    ];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin && !isProduction) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log(colorful.success(`Allowed origin: ${origin}`));
      return callback(null, true);
    } else {
      console.log(colorful.error(`Blocked origin: ${origin}`));
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connection attempt tracker
let connectionAttempts = 0;
const trackConnection = (socket, status) => {
  connectionAttempts++;
  const colors = {
    success: '\x1b[42m\x1b[30m',
    failed: '\x1b[41m\x1b[30m',
    pending: '\x1b[43m\x1b[30m',
    reset: '\x1b[0m'
  };
  
  const statusColor = status === 'success' ? colors.success : 
                     status === 'failed' ? colors.failed : colors.pending;
  
  console.log(`
  ${colors.success}┌─────────────────────────────────────┐${colors.reset}
  ${statusColor}│ ${status.toUpperCase().padEnd(33)}│${colors.reset}
  ${colors.success}├─────────────────────────────────────┤${colors.reset}
  │ ${colorful.info(`Attempt: #${connectionAttempts}`)}
  │ ${colorful.info(`Origin: ${socket.handshake.headers.origin}`)}
  │ ${colorful.info(`IP: ${socket.handshake.address}`)}
  │ ${colorful.info(`Socket ID: ${socket.id}`)}
  │ ${colorful.info(`Time: ${new Date().toISOString()}`)}
  ${colors.success}└─────────────────────────────────────┘${colors.reset}
  `);
};

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log(colorful.debug(`New registration attempt for: ${username}`));

    if (!username || !password) {
      console.log(colorful.error('Registration failed - Missing fields'));
      return res.status(400).json({ 
        success: false,
        error: 'Username and password required' 
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log(colorful.error(`Username ${username} already exists`));
      return res.status(409).json({ 
        success: false,
        error: 'Username already exists' 
      });
    }

    const user = new User({ username, password });
    await user.save();
    
    console.log(colorful.success(`New user registered: ${username}`));
    console.log(colorful.debug(`User count: ${await User.countDocuments()}`));
    
    res.status(201).json({ 
      success: true,
      username: user.username
    });
  } catch (err) {
    console.log(colorful.error(`Registration error: ${err.message}`));
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(colorful.debug(`Login attempt for: ${username}`));

    if (!username || !password) {
      console.log(colorful.error('Login failed - Missing credentials'));
      return res.status(400).json({ 
        success: false,
        error: 'Username and password required' 
      });
    }

    const user = await User.findOne({ username }).select('+password');
    
    if (!user) {
      console.log(colorful.error(`User ${username} not found`));
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(colorful.error(`Invalid password for ${username}`));
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    console.log(colorful.success(`User logged in: ${username}`));
    res.json({ 
      success: true,
      username: user.username
    });
  } catch (err) {
    console.log(colorful.error(`Login error: ${err.message}`));
    res.status(500).json({ 
      success: false,
      error: 'Login failed' 
    });
  }
});

// Root route 
app.get('/', (req, res) => {
  const serverStatus = {
    status: 'running',
    time: new Date().toISOString(),
    port: process.env.PORT || 5000,
    connectionAttempts: connectionAttempts,
    allowedOrigins: allowedOrigins
  };

  console.log(`
    \x1b[46m\x1b[30m┌─────────────────────────────────────┐\x1b[0m
    \x1b[46m\x1b[30m│ 🏰 SERVER STATUS REPORT              │\x1b[0m
    \x1b[46m\x1b[30m├─────────────────────────────────────┤\x1b[0m
    │ ${colorful.info(`Port: ${serverStatus.port}`)}
    │ ${colorful.info(`Connection Attempts: ${serverStatus.connectionAttempts}`)}
    \x1b[46m\x1b[30m└─────────────────────────────────────┘\x1b[0m
    `);
    
    res.send(`
      <h1>🌈 Chat Server Running</h1>
      <pre>${JSON.stringify(serverStatus, null, 2)}</pre>
      <h2>Recent Activity</h2>
      <div id="connections"></div>
    `);
});

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: isProduction 
      ? ['https://plp-mern-wk-5-web-sockets-backened.onrender.com', 'https://plp-mern-wk-5-web-sockets-frontend-4.onrender.com', 'https://admin.socket.io']
      : ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://admin.socket.io'],
    methods: ["GET", "POST"],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true
  },
  transports: ['websocket', 'polling']
});

// Socket.IO middleware
io.use((socket, next) => {
  const attempt = {
    status: 'pending',
    timestamp: new Date().toISOString(),
    origin: socket.handshake.headers.origin,
    ip: socket.handshake.address,
    socketId: socket.id
  };
  
  trackConnection(socket, attempt.status);
  next();
});

// Initialize default rooms on startup
async function initializeDefaultRooms() {
  try {
    const defaultRooms = [
      { name: 'general', topic: 'General Chat' },
      { name: 'arsenal', topic: 'Arsenal FC Discussions' },
      { name: 'man-u', topic: 'Manchester United FC' },
      { name: 'liverpool', topic: 'Liverpool FC Fan Club' },
      { name: 'bedsa', topic: 'BEDSA Community' }
    ];

    console.log(colorful.info('Initializing default rooms...'));
    
    for (const roomData of defaultRooms) {
      const existingRoom = await Room.findOne({ name: roomData.name });
      if (!existingRoom) {
        await Room.create(roomData);
        console.log(colorful.success(`Default room "${roomData.name}" created`));
      } else {
        console.log(colorful.debug(`Room "${roomData.name}" already exists`));
      }
    }
  } catch (err) {
    console.log(colorful.error(`Error initializing default rooms: ${err.message}`));
  }
}

// Socket.IO connection handler
io.on('connection', async (socket) => {
  console.log(colorful.success(`New connection: ${socket.id}`));

  // Username tracking
  socket.on('setUsername', (username) => {
    activeUsers.set(socket.id, username);
    
    if (!userSockets.has(username)) {
      userSockets.set(username, new Set());
    }
    userSockets.get(username).add(socket.id);
    
    console.log(colorful.success(`User ${username} connected (ID: ${socket.id})`));
  });

  // Room list request
  socket.on('getRoomList', async () => {
    try {
      console.log(colorful.debug(`Room list requested by ${socket.id}`));
      const rooms = await Room.find();
      const roomList = rooms.map(r => ({
        name: r.name,
        userCount: roomUsers.get(r.name)?.size || 0,
        topic: r.topic
      }));
      socket.emit('roomList', roomList);
      console.log(colorful.success(`Sent room list to ${socket.id}`));
    } catch (err) {
      console.log(colorful.error(`Error getting room list: ${err.message}`));
    }
  });

  // Join room
  socket.on('joinRoom', async ({ roomName, username }) => {
    try {
      console.log(colorful.debug(`Join room request: ${username} to ${roomName}`));

      if (!roomName || !username) {
        throw new Error('Missing room name or username');
      }

      const room = await Room.findOne({ name: roomName });
      if (!room) {
        throw new Error('Room does not exist');
      }

      // Leave previous rooms
      Array.from(socket.rooms)
        .filter(r => r !== socket.id)
        .forEach(room => {
          socket.leave(room);
          const users = roomUsers.get(room);
          if (users) {
            users.delete(username);
            if (users.size === 0) {
              roomUsers.delete(room);
            }
          }
        });

      // Join new room
      socket.join(roomName);
      const usersInRoom = roomUsers.get(roomName) || new Set();
      usersInRoom.add(username);
      roomUsers.set(roomName, usersInRoom);

      // Confirm join to user
      socket.emit('roomJoined', {
        name: roomName,
        userCount: usersInRoom.size,
        topic: room.topic
      });

      // Send room history
      const messages = await Messsage.find({ room: room._id })
        .sort({ createdAt: 1 })
        .limit(50);
      socket.emit('roomHistory', messages);

      console.log(colorful.success(`${username} joined ${roomName} (${usersInRoom.size} users)`));

    } catch (err) {
      console.log(colorful.error(`Join room error: ${err.message}`));
      socket.emit('roomError', { message: err.message });
    }
  });

  socket.on('createRoom', async ({ roomName, username }) => {
    try {
      console.log(colorful.debug(`Create room request: ${roomName} by ${username}`));
      
      if (!roomName || !username) {
        console.log(colorful.error('Room creation failed - Missing fields'));
        return socket.emit('roomError', { message: 'Room name and username are required' });
      }

      const formattedName = roomName.trim().toLowerCase().replace(/\s+/g, '-');
      const existingRoom = await Room.findOne({ name: formattedName });

      if (existingRoom) {
        console.log(colorful.error(`Room ${formattedName} already exists`));
        return socket.emit('roomError', { message: 'Room already exists' });
      }

      const room = await Room.create({
        name: formattedName,
        createdBy: username,
        participants: [username],
        topic: `Chat about ${formattedName}`
      });

      // Join the room immediately after creation
      socket.join(formattedName);
      
      // Track user in new room
      const usersInRoom = new Set([username]);
      roomUsers.set(formattedName, usersInRoom);

      // Get updated room list
      const rooms = await Room.find();
      const roomList = rooms.map(r => ({
        name: r.name,
        userCount: roomUsers.get(r.name)?.size || 0,
        topic: r.topic
      }));
      
      // Emit to all clients
      io.emit('roomList', roomList);
      
      // Confirm to creator
      socket.emit('roomJoined', {
        name: room.name,
        userCount: 1,
        topic: room.topic
      });

      console.log(colorful.success(`Room "${formattedName}" created by ${username}`));
    } catch (err) {
      console.log(colorful.error(`Room creation error: ${err.message}`));
      socket.emit('roomError', { message: 'Failed to create room' });
    }
  });

  // Enhanced message handling with file support
  socket.on('sendMessage', async (message) => {
    try {
      const username = activeUsers.get(socket.id) || 'Anonymous';
      const roomName = Array.from(socket.rooms).find(r => r !== socket.id);
      
      if (!roomName) {
        console.log(colorful.warn(`User ${username} tried to send message without joining a room`));
        return;
      }
      
      const roomDoc = await Room.findOne({ name: roomName });
      if (!roomDoc) {
        console.log(colorful.error(`Room ${roomName} not found in database`));
        return;
      }
      
      // Create message document with proper fields
      const messageData = {
        content: message.content,
        room: roomDoc._id,
        roomName: roomName,
        username: username,
        time: new Date(),
        readBy: [username],
        deletedFor: []
      };

      // Add file information if present
      if (message.file) {
        messageData.file = {
          url: message.file.url,
          name: message.file.name,
          type: message.file.type,
          size: message.file.size,
          fileType: getFileType(message.file.type),
          deleted: false
        };
        console.log(colorful.success(`File attached: ${message.file.name}`));
        console.log(colorful.debug(`File type: ${message.file.type}, size: ${message.file.size} bytes`));
      }
      
      // Save message to database
      const savedMessage = await Messsage.create(messageData);
      
      // Update room's last activity
      roomDoc.lastActivity = new Date();
      await roomDoc.save();
      
      // Emit message with consistent field names
      const messageToEmit = {
        _id: savedMessage._id,
        username: username,
        content: message.content,
        time: savedMessage.time,
        room: roomName,
        readBy: savedMessage.readBy,
        file: savedMessage.file
      };

      io.to(roomName).emit('message', messageToEmit);
      
      console.log(colorful.debug(`Message from ${username} in ${roomName}: ${message.content ? message.content.substring(0, 20) + '...' : 'File message'}`));
    } catch (err) {
      console.log(colorful.error(`Message send error: ${err.message}`));
    }
  });

  // File download request handler
  socket.on('downloadFile', async ({ messageId }) => {
    try {
      const message = await Messsage.findById(messageId);
      if (!message || !message.file || message.file.deleted) {
        return socket.emit('fileError', { message: 'File not available' });
      }

      const filename = message.file.url.split('/').pop();
      const downloadUrl = `http://${socket.handshake.headers.host}/download/${filename}`;
      
      socket.emit('fileDownloadReady', { 
        url: downloadUrl,
        filename: filename,
        originalName: message.file.name
      });
      
      console.log(colorful.success(`File download prepared: ${message.file.name}`));
    } catch (err) {
      console.log(colorful.error(`File download error: ${err.message}`));
      socket.emit('fileError', { message: 'Download failed' });
    }
  });

  // File deletion handler
  socket.on('deleteFile', async ({ messageId }) => {
    try {
      const message = await Messsage.findById(messageId);
      if (!message?.file) return;

      const filename = message.file.url.split('/').pop();
      const filePath = path.join(uploadDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      message.file.deleted = true;
      await message.save();

      io.to(message.roomName).emit('fileDeleted', { messageId });
    } catch (err) {
      console.log(colorful.error(`File deletion error: ${err.message}`));
    }
  });

  // Mark message as read
  socket.on('markAsRead', async ({ messageId, username }) => {
    try {
      console.log(colorful.debug(`Marking message ${messageId} as read by ${username}`));
      const message = await Messsage.findById(messageId);
      if (!message) {
        console.log(colorful.error(`Message ${messageId} not found`));
        return;
      }
      
      if (!message.readBy.includes(username)) {
        message.readBy.push(username);
        await message.save();
        
        const senderSockets = userSockets.get(message.username);
        if (senderSockets) {
          senderSockets.forEach(sockId => {
            io.to(sockId).emit('messageRead', { messageId, readBy: message.readBy });
          });
        }
        
        console.log(colorful.success(`Message ${messageId} marked as read by ${username}`));
      }
    } catch (err) {
      console.log(colorful.error(`Error marking message as read: ${err.message}`));
    }
  });

  // Delete message
  socket.on('deleteMessage', async ({ messageId, deleteForAll, username }) => {
    try {
      console.log(colorful.debug(`Deleting message ${messageId} (for all: ${deleteForAll}) by ${username}`));
      const message = await Messsage.findById(messageId);
      if (!message) {
        console.log(colorful.error(`Message ${messageId} not found`));
        return;
      }
      
      if (deleteForAll) {
        await Messsage.deleteOne({ _id: messageId });
        io.to(message.roomName).emit('messageDeleted', { messageId });
        console.log(colorful.success(`Message ${messageId} deleted for everyone by ${username}`));
      } else {
        if (!message.deletedFor.includes(username)) {
          message.deletedFor.push(username);
          await message.save();
          socket.emit('messageDeletedForMe', { messageId });
          console.log(colorful.success(`Message ${messageId} deleted for ${username}`));
        }
      }
    } catch (err) {
      console.log(colorful.error(`Error deleting message: ${err.message}`));
    }
  });

  // Typing indicators
  socket.on('typing', ({ room }) => {
    const username = activeUsers.get(socket.id) || 'Anonymous';
    io.to(room).emit('typing', { username, room });
    console.log(colorful.debug(`${username} is typing in ${room}`));
  });

  socket.on('stopTyping', ({ room }) => {
    const username = activeUsers.get(socket.id) || 'Anonymous';
    io.to(room).emit('stopTyping', { username, room });
    console.log(colorful.debug(`${username} stopped typing in ${room}`));
  });

  // Disconnection handler
  socket.on('disconnect', (reason) => {
    const username = activeUsers.get(socket.id);
    if (username) {
      console.log(colorful.warn(`User ${username} disconnected: ${reason}`));
      
      // Remove user from all rooms
      roomUsers.forEach((users, room) => {
        if (users.has(username)) {
          users.delete(username);
          if (users.size === 0) {
            roomUsers.delete(room);
          } else {
            roomUsers.set(room, users);
          }
          console.log(colorful.debug(`User ${username} was removed from room ${room}`));
        }
      });
      
      // Remove socket from userSockets
      if (userSockets.has(username)) {
        const sockets = userSockets.get(username);
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(username);
        }
      }
      
      activeUsers.delete(socket.id);
      
      // Update room list for remaining users
      Room.find().then(rooms => {
        const roomList = rooms.map(r => ({
          name: r.name,
          userCount: roomUsers.get(r.name)?.size || 0,
          topic: r.topic
        }));
        io.emit('roomList', roomList);
      });
    } else {
      console.log(colorful.warn(`Anonymous user disconnected: ${reason}`));
    }
  });

  // Heartbeat monitoring
  const pingInterval = setInterval(() => {
    const start = Date.now();
    socket.emit('💓', start);
    
    socket.once('💗', () => {
      const latency = Date.now() - start;
      console.log(colorful.debug(`Heartbeat from ${socket.id} (${latency}ms)`));
    });
  }, 10000);

  socket.on('disconnect', () => {
    clearInterval(pingInterval);
    console.log(colorful.debug(`Heartbeat monitor stopped for ${socket.id}`));
  });
});

// Admin UI
instrument(io, {
  auth: {
    type: "basic",
    username: "admin",
    password: bcrypt.hashSync("password", 10)
  },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  namespaceName: "/admin"
});

// Start the server
connectDB().then(async () => {
  await initializeDefaultRooms();
  
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(BANNER);
    console.log(`
    \x1b[45m\x1b[30m┌─────────────────────────────────────┐\x1b[0m
    \x1b[45m\x1b[30m│ 🚀 SERVER LAUNCH SUCCESSFUL          │\x1b[0m
    \x1b[45m\x1b[30m├─────────────────────────────────────┤\x1b[0m
    │ ${colorful.success(`Port: ${PORT}`)}
    │ ${colorful.success(`Database: Connected`)}
    │ ${colorful.info(`Host: 0.0.0.0`)}
    │ ${colorful.info(`Ready for connections`)}
    \x1b[45m\x1b[30m└─────────────────────────────────────┘\x1b[0m
    
    \x1b[32m     .d8888b.  888     888 
    d88P  Y88b 888     888 
    888    888 888     888 
    888        888     888 
    888  88888 888     888 
    888    888 888     888 
    Y88b  d88P Y88b. .d88P 
     "Y8888P88  "Y88888P"  \x1b[0m
    `);
  });
}).catch(err => {
  console.log(colorful.error(`Database connection failed: ${err.message}`));
  process.exit(1);
});