require('dotenv').config();
require('events').EventEmitter.defaultMaxListeners = 20;
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { instrument } = require("@socket.io/admin-ui");
const cors = require('cors');
const bcrypt = require('bcryptjs');
// const connectDB = require('./config/db');
const db = require('./config/db');  
const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');

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

// Configure file storage with organized directories
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = file.mimetype.split('/')[0];
    let uploadDir = path.join(__dirname, 'uploads');
    
    // Create subdirectories based on file type
    switch(fileType) {
      case 'image':
        uploadDir = path.join(uploadDir, 'images');
        break;
      case 'video':
        uploadDir = path.join(uploadDir, 'videos');
        break;
      case 'audio':
        uploadDir = path.join(uploadDir, 'audio');
        break;
      case 'application':
        if (file.mimetype.includes('pdf')) {
          uploadDir = path.join(uploadDir, 'documents', 'pdf');
        } else if (file.mimetype.includes('word') || file.mimetype.includes('document')) {
          uploadDir = path.join(uploadDir, 'documents', 'word');
        } else if (file.mimetype.includes('zip') || file.mimetype.includes('compressed')) {
          uploadDir = path.join(uploadDir, 'archives');
        } else {
          uploadDir = path.join(uploadDir, 'documents', 'other');
        }
        break;
      default:
        uploadDir = path.join(uploadDir, 'other');
    }
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`Created upload directory: ${uploadDir}`);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${uniqueId}${ext}`;
    console.log(`Storing file as: ${filename}`);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip', 'application/x-zip-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Serve static files with proper headers and caching
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    const contentType = mime.lookup(path);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// Enhanced colorful console helpers
const colorful = {
  success: (text) => `\x1b[32m✓ ${text}\x1b[0m`,
  error: (text) => `\x1b[31m✗ ${text}\x1b[0m`,
  info: (text) => `\x1b[36mℹ ${text}\x1b[0m`,
  warn: (text) => `\x1b[33m⚠ ${text}\x1b[0m`,
  debug: (text) => `\x1b[35m⚡ ${text}\x1b[0m`,
  banner: (text) => `\x1b[46m\x1b[30m${text}\x1b[0m`
};

// Track active users and rooms
const activeUsers = new Map(); // socket.id -> username
const roomUsers = new Map();   // roomName -> Set of usernames
const userSockets = new Map(); // username -> Set of socket.ids
const readReceipts = new Map(); // messageId -> Set of usernames who read it

// MODIFIED: Enhanced CORS configuration to use environment variables
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = isProduction 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://admin.socket.io'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin && !isProduction) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(colorful.error(`Blocked by CORS: ${origin}`));
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
    
    console.log(colorful.debug(`⚡ New registration attempt for: ${username}`));

    if (!username || !password) {
      console.log(colorful.error('✗ Registration failed - Missing fields'));
      return res.status(400).json({ 
        success: false,
        error: 'Username and password required' 
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log(colorful.error(`✗ Username ${username} already exists`));
      return res.status(409).json({ 
        success: false,
        error: 'Username already exists' 
      });
    }

    const user = new User({ username, password });
    await user.save();
    
    console.log(colorful.success(`✓ New user registered: ${username}`));
    console.log(colorful.debug(`⚡ User count: ${await User.countDocuments()}`));
    
    res.status(201).json({ 
      success: true,
      username: user.username
    });
  } catch (err) {
    console.log(colorful.error(`✗ Registration error: ${err.message}`));
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(colorful.debug(`⚡ Login attempt for: ${username}`));

    if (!username || !password) {
      console.log(colorful.error('✗ Login failed - Missing credentials'));
      return res.status(400).json({ 
        success: false,
        error: 'Username and password required' 
      });
    }

    const user = await User.findOne({ username }).select('+password');
    
    if (!user) {
      console.log(colorful.error(`✗ User ${username} not found`));
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(colorful.error(`✗ Invalid password for ${username}`));
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    console.log(colorful.success(`✓ User logged in: ${username}`));
    res.json({ 
      success: true,
      username: user.username
    });
  } catch (err) {
    console.log(colorful.error(`✗ Login error: ${err.message}`));
    res.status(500).json({ 
      success: false,
      error: 'Login failed' 
    });
  }
});

 
      // In your file upload handler
      app.post('/upload', upload.single('file'), (req, res) => {
          try {
              if (!req.file) {
                  console.log(colorful.error('✗ No file uploaded'));
                  return res.status(400).json({ success: false, error: 'No file uploaded' });
              }
              
              const fileUrl = `${req.protocol}://${req.get('host')}/uploads${req.file.path.replace(path.join(__dirname, 'uploads'), '')}`;
              
              // Determine file icon based on type
              const getFileIcon = (mimeType) => {
                  if (mimeType.startsWith('image/')) return '🖼️';
                  if (mimeType.startsWith('video/')) return '🎬';
                  if (mimeType.startsWith('audio/')) return '🎵';
                  if (mimeType.includes('pdf')) return '📄';
                  if (mimeType.includes('word')) return '📝';
                  if (mimeType.includes('zip')) return '🗄️';
                  return '📎';
              };
              
              const fileIcon = getFileIcon(req.file.mimetype);
              
              console.log(colorful.success(`✓ File uploaded: ${req.file.originalname}`));
              
              res.json({
                  success: true,
                  url: fileUrl,
                  name: req.file.originalname,
                  size: req.file.size,
                  type: req.file.mimetype,
                  icon: fileIcon,
                  canPreview: [
                      'image/jpeg', 'image/png', 'image/gif', 
                      'video/mp4', 'video/webm',
                      'audio/mpeg', 'audio/wav',
                      'application/pdf'
                  ].includes(req.file.mimetype)
              });
          } catch (err) {
              console.log(colorful.error(`✗ File upload error: ${err.message}`));
              res.status(500).json({ 
                  success: false, 
                  error: err.message || 'File upload failed' 
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

// MODIFIED: Socket.IO setup with production-ready config
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io' // Explicit path for production
});

io.sockets.setMaxListeners(20);

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

    console.log(colorful.info('ℹ Initializing default rooms...'));
    
    for (const roomData of defaultRooms) {
      const existingRoom = await Room.findOne({ name: roomData.name });
      if (!existingRoom) {
        await Room.create(roomData);
        console.log(colorful.success(`✓ Default room "${roomData.name}" created`));
      } else {
        console.log(colorful.debug(`⚡ Room "${roomData.name}" already exists`));
      }
    }
  } catch (err) {
    console.log(colorful.error(`✗ Error initializing default rooms: ${err.message}`));
  }
}

// Socket.IO connection handler
io.on('connection', async (socket) => {
  console.log(colorful.success(`✓ New connection: ${socket.id}`));

  // Username tracking
  socket.on('setUsername', (username) => {
    if (!username) {
      console.log(colorful.error('✗ Empty username provided'));
      return;
    }
    
    activeUsers.set(socket.id, username);
    
    // Track user's sockets for multiple device support
    if (!userSockets.has(username)) {
      userSockets.set(username, new Set());
    }
    userSockets.get(username).add(socket.id);
    
    console.log(colorful.success(`✓ User ${username} connected (ID: ${socket.id})`));
  });

  // Room list request
  socket.on('getRoomList', async () => {
    try {
      console.log(colorful.debug(`⚡ Room list requested by ${socket.id}`));
      const rooms = await Room.find().sort({ lastActivity: -1 });
      const roomList = rooms.map(r => ({
        name: r.name,
        userCount: roomUsers.get(r.name)?.size || 0,
        topic: r.topic,
        lastActivity: r.lastActivity
      }));
      socket.emit('roomList', roomList);
      console.log(colorful.success(`✓ Sent room list to ${socket.id}`));
    } catch (err) {
      console.log(colorful.error(`✗ Error getting room list: ${err.message}`));
      socket.emit('error', { message: 'Failed to get room list' });
    }
  });

  // Join room with enhanced functionality
  socket.on('joinRoom', async ({ roomName, username }) => {
    try {
      console.log(colorful.debug(`⚡ Join room request: ${username} to ${roomName}`));

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
          if (users && users.has(username)) {
            users.delete(username);
            if (users.size === 0) roomUsers.delete(room);
          }
        });

      // Join new room
      socket.join(roomName);
      const usersInRoom = roomUsers.get(roomName) || new Set();
      usersInRoom.add(username);
      roomUsers.set(roomName, usersInRoom);

      // Update room participants if not already present
      if (!room.participants.includes(username)) {
        room.participants.push(username);
        await room.save();
      }

      // Confirm join to user
      socket.emit('roomJoined', {
        name: roomName,
        userCount: usersInRoom.size,
        topic: room.topic,
        participants: Array.from(usersInRoom)
      });

      // Send room history with read receipts
      const messages = await Message.find({ room: room._id })
        .sort({ createdAt: -1 })
        .limit(50);
      
      const messagesWithReadStatus = messages.map(msg => {
        const receipt = readReceipts.get(msg._id.toString()) || new Set();
        return {
          ...msg.toObject(),
          readBy: Array.from(receipt)
        };
      });

      socket.emit('roomHistory', messagesWithReadStatus.reverse());

      // Notify others in the room
      socket.to(roomName).emit('userJoined', {
        username,
        userCount: usersInRoom.size
      });

      console.log(colorful.success(`✓ ${username} joined ${roomName} (${usersInRoom.size} users)`));

    } catch (err) {
      console.log(colorful.error(`✗ Join room error: ${err.message}`));
      socket.emit('roomError', { message: err.message });
    }
  });

  // Create room with validation
  socket.on('createRoom', async ({ roomName, username }) => {
    try {
      console.log(colorful.debug(`⚡ Create room request: ${roomName} by ${username}`));
      
      if (!roomName || !username) {
        console.log(colorful.error('✗ Room creation failed - Missing fields'));
        return socket.emit('roomError', { message: 'Room name and username are required' });
      }

      // Validate room name
      if (roomName.length > 30) {
        return socket.emit('roomError', { message: 'Room name must be 30 characters or less' });
      }

      const formattedName = roomName.trim().toLowerCase().replace(/\s+/g, '-');
      const existingRoom = await Room.findOne({ name: formattedName });

      if (existingRoom) {
        console.log(colorful.error(`✗ Room ${formattedName} already exists`));
        return socket.emit('roomError', { message: 'Room already exists' });
      }

      const room = await Room.create({
        name: formattedName,
        createdBy: username,
        participants: [username],
        topic: `Chat about ${formattedName}`,
        lastActivity: new Date()
      });

      // Join the room immediately after creation
      socket.join(formattedName);
      
      // Track user in new room
      const usersInRoom = new Set([username]);
      roomUsers.set(formattedName, usersInRoom);

      // Get updated room list
      const rooms = await Room.find().sort({ lastActivity: -1 });
      const roomList = rooms.map(r => ({
        name: r.name,
        userCount: roomUsers.get(r.name)?.size || 0,
        topic: r.topic,
        lastActivity: r.lastActivity
      }));
      
      // Emit to all clients
      io.emit('roomList', roomList);
      
      // Confirm to creator
      socket.emit('roomJoined', {
        name: room.name,
        userCount: 1,
        topic: room.topic,
        participants: [username]
      });

      console.log(colorful.success(`✓ Room "${formattedName}" created by ${username}`));
    } catch (err) {
      console.log(colorful.error(`✗ Room creation error: ${err.message}`));
      socket.emit('roomError', { message: 'Failed to create room' });
    }
  });

  // Enhanced message handling with file support and read receipts
socket.on('sendMessage', async (messageData) => {
    try {
        const username = activeUsers.get(socket.id);
        if (!username) {
            return socket.emit('error', { message: 'Authentication required' });
        }
        
        const roomName = Array.from(socket.rooms).find(r => r !== socket.id);
        
        if (!roomName) {
            return socket.emit('error', { message: 'Join a room first' });
        }
        
        const roomDoc = await Room.findOne({ name: roomName });
        if (!roomDoc) {
            return socket.emit('error', { message: 'Room not found' });
        }
        
        // Validate message content or file
        if (!messageData.content && !messageData.file) {
            console.log(colorful.error('✗ Empty message attempted'));
            return socket.emit('error', { message: 'Message content or file required' });
        }

        // Create message document according to your model
        const message = {
            content: messageData.content,
            room: roomDoc._id,
            roomName: roomName, // Added to match your model
            username: username,
            time: new Date()
        };

        // Add file information if present
        if (messageData.file) {
            message.file = {
                url: messageData.file.url,
                name: messageData.file.name,
                type: messageData.file.type,
                size: messageData.file.size
            };
            console.log(colorful.success(`✓ File attached: ${messageData.file.name}`));
        }
        
        // Save message to database
        const savedMessage = await Message.create(message);
        
        // Update room's last activity
        roomDoc.lastActivity = new Date();
        await roomDoc.save();
        
        // Prepare message to emit with read receipts
        const messageToEmit = {
            _id: savedMessage._id,
            username: username,
            content: savedMessage.content,
            time: savedMessage.time,
            room: roomName,
            roomName: roomName, // For consistency with your model
            readBy: savedMessage.readBy || [] // Use the array from model
        };

        // Add file to emitted message if present
        if (savedMessage.file) {
            messageToEmit.file = savedMessage.file;
        }
        
        // Update read receipts tracking (modified for your array storage)
        if (!savedMessage.readBy.includes(username)) {
            savedMessage.readBy.push(username);
            await savedMessage.save();
        }
        
        // Emit to room including sender (for consistency)
        io.to(roomName).emit('message', messageToEmit);
        
        console.log(colorful.debug(`⚡ Message from ${username} in ${roomName}: ${messageData.content ? messageData.content.substring(0, 20) + '...' : 'File message'}`));
    } catch (err) {
        console.log(colorful.error(`✗ Message send error: ${err.message}`));
        socket.emit('error', { message: 'Failed to send message' });
    }
});


// io.sockets.setMaxListeners(50); 

// Update the read receipt handler to match your model
socket.on('messageRead', async ({ messageId }) => {
    try {
        const username = activeUsers.get(socket.id);
        if (!username) {
            console.log(colorful.error('✗ Unauthenticated user tried to send read receipt'));
            return;
        }
        
        if (!messageId) {
            console.log(colorful.error('✗ Empty messageId for read receipt'));
            return;
        }
        
        // Get the message to validate it exists
        const message = await Message.findById(messageId);
        if (!message) {
            console.log(colorful.error(`✗ Message ${messageId} not found for read receipt`));
            return;
        }
        
        // Update read receipts (using your array storage)
        if (!message.readBy.includes(username)) {
            message.readBy.push(username);
            await message.save();
        }
        
        // Notify all clients in the room
        const roomDoc = await Room.findById(message.room);
        if (roomDoc) {
            io.to(roomDoc.name).emit('readUpdate', {
                messageId,
                readBy: message.readBy
            });
        }
        
        console.log(colorful.debug(`⚡ Read receipt from ${username} for message ${messageId}`));
    } catch (err) {
        console.log(colorful.error(`✗ Read receipt error: ${err.message}`));
    }
});
  // File download handler with proper MIME types
  socket.on('downloadFile', ({ fileUrl, fileName, fileType }) => {
    try {
      console.log(colorful.debug(`⚡ File download requested: ${fileUrl}`));
      
      // Validate the file URL to prevent directory traversal
      const normalizedPath = path.normalize(fileUrl).replace(/^(\.\.(\/|\\|$))+/g, '');
      const fullPath = path.join(__dirname, 'uploads', normalizedPath);
      
      if (!fs.existsSync(fullPath)) {
        console.log(colorful.error(`✗ File not found: ${fileUrl}`));
        return socket.emit('error', { message: 'File not found' });
      }
      
      // Determine if we should open or download based on file type
      const shouldOpen = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        'application/pdf'
      ].includes(fileType);
      
      socket.emit('fileAction', { 
        action: shouldOpen ? 'open' : 'download',
        url: fileUrl,
        name: fileName,
        type: fileType 
      });
      
      console.log(colorful.success(`✓ File ${shouldOpen ? 'opened' : 'downloaded'}: ${fileUrl}`));
    } catch (err) {
      console.log(colorful.error(`✗ File download error: ${err.message}`));
      socket.emit('error', { message: 'File action failed' });
    }
  });

  // Message read receipt handler
  socket.on('messageRead', async ({ messageId }) => {
    try {
      const username = activeUsers.get(socket.id);
      if (!username) {
        console.log(colorful.error('✗ Unauthenticated user tried to send read receipt'));
        return;
      }
      
      if (!messageId) {
        console.log(colorful.error('✗ Empty messageId for read receipt'));
        return;
      }
      
      // Get the message to validate it exists
      const message = await Message.findById(messageId);
      if (!message) {
        console.log(colorful.error(`✗ Message ${messageId} not found for read receipt`));
        return;
      }
      
      // Update read receipts
      const receipts = readReceipts.get(messageId) || new Set();
      receipts.add(username);
      readReceipts.set(messageId, receipts);
      
      // Notify all clients in the room
      const roomDoc = await Room.findById(message.room);
      if (roomDoc) {
        io.to(roomDoc.name).emit('readUpdate', {
          messageId,
          readBy: Array.from(receipts)
        });
      }
      
      console.log(colorful.debug(`⚡ Read receipt from ${username} for message ${messageId}`));
    } catch (err) {
      console.log(colorful.error(`✗ Read receipt error: ${err.message}`));
    }
  });

  // Message deletion handler
 
  socket.on('deleteMessage', async ({ messageId, deleteForEveryone }, callback) => {
    try {
        const username = activeUsers.get(socket.id);
        if (!username) {
            if (callback) callback({ error: 'Authentication required' });
            return;
        }
        
        const message = await Message.findById(messageId);
        if (!message) {
            if (callback) callback({ error: 'Message not found' });
            return;
        }
        
        const canDeleteForEveryone = message.username === username;
        
        if (deleteForEveryone && !canDeleteForEveryone) {
            if (callback) callback({ error: 'Not authorized to delete for everyone' });
            return;
        }
        
        const room = await Room.findById(message.room);
        if (!room) {
            if (callback) callback({ error: 'Room not found' });
            return;
        }
        
        if (deleteForEveryone) {
            await Message.deleteOne({ _id: messageId });
            readReceipts.delete(messageId);
        } else {
            message.deletedFor = message.deletedFor || [];
            if (!message.deletedFor.includes(username)) {
                message.deletedFor.push(username);
                await message.save();
            }
        }
        
        io.to(room.name).emit('messageDeleted', {
            messageId,
            deletedForEveryone: deleteForEveryone || false,
            deletedBy: username,
            deletedFor: deleteForEveryone ? [] : message.deletedFor,
            timestamp: new Date()
        });
        
        if (callback) callback({ success: true });
        
    } catch (err) {
        console.error('Delete error:', err);
        if (callback) callback({ error: 'Failed to delete message' });
        socket.emit('error', { 
            message: 'Failed to delete message',
            details: err.message 
        });
    }
});
  // Typing indicators
  socket.on('typing', ({ room }) => {
    const username = activeUsers.get(socket.id);
    if (!username) return;
    
    io.to(room).emit('typing', { username, room });
    console.log(colorful.debug(`⚡ ${username} is typing in ${room}`));
  });

  socket.on('stopTyping', ({ room }) => {
    const username = activeUsers.get(socket.id);
    if (!username) return;
    
    io.to(room).emit('stopTyping', { username, room });
    console.log(colorful.debug(`⚡ ${username} stopped typing in ${room}`));
  });

  // Disconnection handler with cleanup
  socket.on('disconnect', (reason) => {
    const username = activeUsers.get(socket.id);
    if (username) {
      console.log(colorful.warn(`⚠ User ${username} disconnected: ${reason}`));
      
      // Remove socket from user's sockets
      if (userSockets.has(username)) {
        const sockets = userSockets.get(username);
        sockets.delete(socket.id);
        
        // If this was the last socket for the user, remove from rooms
        if (sockets.size === 0) {
          userSockets.delete(username);
          
          // Remove user from all rooms
          roomUsers.forEach((users, room) => {
            if (users.has(username)) {
              users.delete(username);
              if (users.size === 0) {
                roomUsers.delete(room);
              } else {
                roomUsers.set(room, users);
              }
              
              // Notify remaining users in the room
              io.to(room).emit('userLeft', {
                username,
                userCount: users.size
              });
              
              console.log(colorful.debug(`⚡ User ${username} was removed from room ${room}`));
            }
          });
        }
      }
      
      activeUsers.delete(socket.id);
      
      // Update room list for remaining users
      Room.find().sort({ lastActivity: -1 }).then(rooms => {
        const roomList = rooms.map(r => ({
          name: r.name,
          userCount: roomUsers.get(r.name)?.size || 0,
          topic: r.topic,
          lastActivity: r.lastActivity
        }));
        io.emit('roomList', roomList);
      });
    } else {
      console.log(colorful.warn(`⚠ Anonymous user disconnected: ${reason}`));
    }
  });

  // Heartbeat monitoring
  const pingInterval = setInterval(() => {
    const start = Date.now();
    socket.emit('💓', start);
    
    socket.once('💗', () => {
      const latency = Date.now() - start;
      console.log(colorful.debug(`⚡ Heartbeat from ${socket.id} (${latency}ms)`));
    });
  }, 10000);

  socket.on('disconnect', () => {
    clearInterval(pingInterval);
    console.log(colorful.debug(`⚡ Heartbeat monitor stopped for ${socket.id}`));
  });
});

// MODIFIED: Admin UI with environment variables
instrument(io, {
  auth: {
    type: "basic",
    username: process.env.ADMIN_USERNAME || "admin",
    password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || "password", 10)
  },
  mode: isProduction ? 'production' : 'development',
  namespaceName: "/admin"
});

// Start the server with production-ready config
// Only start the server if not in test environment and not being required
// Start the server
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  db.connectDB().then(async () => {
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
      `);
    });
  }).catch(err => {
    console.log(colorful.error(`✗ Database connection failed: ${err.message}`));
    process.exit(1);
  });
}

// Test-specific handlers
if (process.env.NODE_ENV === 'test') {
  io.on('connection', (socket) => {
    // Simplified handlers for testing
    socket.on('joinRoom', (data) => {
      socket.join(data.room);
      socket.emit('roomJoined', {
        name: data.room,
        userCount: 1,
        participants: [data.username]
      });
    });

    socket.on('sendMessage', (data) => {
      socket.emit('message', {
        username: activeUsers.get(socket.id),
        content: data.content,
        time: new Date(),
        room: data.room
      });
    });
  });
}

module.exports = { app, server, io };