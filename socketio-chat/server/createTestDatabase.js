const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Configuration
const config = {
  DB_URI: 'mongodb://localhost:27017/socketio-chat-test',
  PERSIST_CONNECTION: false,
  CLEAN_DATABASE: true,
  SALT_ROUNDS: 10,
  ADMIN_CREDENTIALS: {
    username: 'testadmin',
    email: 'admin@example.com',
    password: 'adminpassword123'
  },
  TEST_ROOM: {
    name: 'test-room',
    description: 'Default test room'
  }
};

// Color formatting
const colors = {
  reset: '\x1b[0m',
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  }
};

const colorLog = (message, color = 'fg.white') => {
  const colorCode = color.includes('.') ? 
    color.split('.').reduce((o, i) => o[i], colors) : 
    colors[color];
  console.log(`${colorCode}${message}${colors.reset}`);
};

// Password hashing
const hashPassword = async (password) => {
  return await bcrypt.hash(password, config.SALT_ROUNDS);
};

// Schema definitions
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, minlength: 3 },
  description: String,
  topic: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  activeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPrivate: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  content: String,
  file: {
    url: String,
    name: String,
    type: String,
    size: Number
  },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  createdAt: { type: Date, default: Date.now }
});

async function setupDatabase() {
  try {
    // 1. Connect to MongoDB
    colorLog('🛠️  Connecting to database...', 'fg.blue');
    await mongoose.connect(config.DB_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000
    });
    colorLog('✅ Connected to MongoDB', 'fg.green');

    // 2. Clean existing data
    if (config.CLEAN_DATABASE) {
      colorLog('🧹 Cleaning existing collections...', 'fg.blue');
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      if (collections.length === 0) {
        colorLog('   ▸ No collections to drop', 'fg.yellow');
      } else {
        for (const col of collections) {
          await mongoose.connection.db.dropCollection(col.name);
          colorLog(`   ▸ Dropped collection: ${col.name}`, 'fg.yellow');
        }
      }
    }

    // 3. Compile models
    colorLog('📝 Creating models...', 'fg.blue');
    const User = mongoose.model('User', UserSchema);
    const Room = mongoose.model('Room', RoomSchema);
    const Message = mongoose.model('Message', MessageSchema);

    // 4. Create indexes
    colorLog('🔍 Creating indexes...', 'fg.blue');
    await User.createIndexes();
    await Room.createIndexes();
    await Message.createIndexes();

    // 5. Create test data
    colorLog('🧪 Creating test data...', 'fg.blue');
    
    // Admin User
    const adminUser = await User.create({
      username: config.ADMIN_CREDENTIALS.username,
      email: config.ADMIN_CREDENTIALS.email,
      password: await hashPassword(config.ADMIN_CREDENTIALS.password),
      isAdmin: true
    });
    colorLog(`   ▸ Admin user created: ${adminUser.username}`, 'fg.green');

    // Test Room
    const testRoom = await Room.create({
      name: config.TEST_ROOM.name,
      description: config.TEST_ROOM.description,
      createdBy: adminUser._id,
      participants: [adminUser._id]
    });
    colorLog(`   ▸ Room created: ${testRoom.name}`, 'fg.green');

    // Test Messages
    const messages = await Message.create([
      {
        content: 'Hello world! Welcome to our chat system.',
        room: testRoom._id,
        user: adminUser._id,
        username: adminUser.username
      },
      {
        content: 'This is a test message to demonstrate functionality.',
        room: testRoom._id,
        user: adminUser._id,
        username: adminUser.username
      },
      {
        content: 'You can modify this script to create more test data.',
        room: testRoom._id,
        user: adminUser._id,
        username: adminUser.username
      }
    ]);
    colorLog(`   ▸ ${messages.length} sample messages created`, 'fg.green');

    // Summary
    colorLog('\n🎉 Database setup completed successfully!', 'fg.cyan');
    colorLog('\n🔹 Test Credentials:', 'fg.blue');
    colorLog(`   - Username: ${adminUser.username}`, 'fg.white');
    colorLog(`   - Email: ${adminUser.email}`, 'fg.white');
    colorLog(`   - Password: ${config.ADMIN_CREDENTIALS.password}`, 'fg.white');
    colorLog('\n🔹 Test Room:', 'fg.blue');
    colorLog(`   - Name: ${testRoom.name}`, 'fg.white');
    colorLog(`   - Description: ${testRoom.description}`, 'fg.white');

  } catch (err) {
    colorLog('\n❌ Database setup failed:', 'fg.red');
    colorLog(`   ${err.message}`, 'fg.red');
    
    if (err.code === 'ETIMEOUT') {
      colorLog('   ➤ Check if MongoDB is running and accessible', 'fg.yellow');
    }
    
    process.exit(1);
  } finally {
    if (!config.PERSIST_CONNECTION) {
      await mongoose.disconnect();
      colorLog('\n🔌 Disconnected from database', 'fg.blue');
    } else {
      colorLog('\n⚠️  Connection left open (PERSIST_CONNECTION=true)', 'fg.yellow');
    }
    
    if (!config.PERSIST_CONNECTION) {
      process.exit(0);
    }
  }
}

// Execute the setup
setupDatabase();

// Handle process termination
process.on('SIGINT', async () => {
  if (config.PERSIST_CONNECTION) {
    colorLog('\n🔌 Closing database connection...', 'fg.blue');
    await mongoose.disconnect();
    colorLog('✅ Connection closed gracefully', 'fg.green');
  }
  process.exit(0);
});