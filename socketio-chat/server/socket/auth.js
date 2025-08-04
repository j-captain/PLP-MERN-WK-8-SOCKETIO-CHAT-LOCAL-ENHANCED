const mongoose = require('mongoose');
const crypto = require('crypto');

const TEST_DB_URI = 'mongodb://localhost:27017/socketio-chat-test';

// Reusable password hasher
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

async function createTestDatabase() {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(TEST_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`Connected to test database: ${TEST_DB_URI}`);

    // 2. Drop existing collections if they exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`Dropped collection: ${collection.name}`);
    }

    // 3. Create collections
    await mongoose.connection.db.createCollection('users');
    await mongoose.connection.db.createCollection('rooms');
    await mongoose.connection.db.createCollection('messages');
    console.log('Created collections');

    // 4. Define schemas programmatically
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true },
      password: { type: String, required: true },
      isVerified: { type: Boolean, default: false }
    });

    const roomSchema = new mongoose.Schema({
      name: { type: String, required: true, minlength: 3 },
      description: String,
      topic: String,
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    });

    const messageSchema = new mongoose.Schema({
      content: String,
      file: Object,
      room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: String,
      createdAt: { type: Date, default: Date.now }
    });

    // 5. Create models
    const User = mongoose.model('User', userSchema);
    const Room = mongoose.model('Room', roomSchema);
    const Message = mongoose.model('Message', messageSchema);

    // 6. Create indexes
    await User.createIndexes();
    await Room.createIndexes();
    await Message.createIndexes();
    console.log('Created indexes');

    // 7. Insert test data
    const testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashPassword('testpassword123'), // Hashed password
      isVerified: true
    });

    const testRoom = await Room.create({
      name: 'test-room',
      description: 'Default test room',
      createdBy: testUser._id,
      participants: [testUser._id]
    });

    console.log('Inserted test data:');
    console.log(`- User: ${testUser.username} (${testUser._id})`);
    console.log(`- Room: ${testRoom.name} (${testRoom._id})`);

  } catch (err) {
    console.error('Database setup failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
    process.exit(0);
  }
}

createTestDatabase();