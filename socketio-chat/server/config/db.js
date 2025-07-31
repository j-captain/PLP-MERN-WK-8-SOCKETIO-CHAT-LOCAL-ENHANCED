const mongoose = require('mongoose');
const colorful = require('../utils/colorful'); // Assuming you have this colorful logger

const connectDB = async () => {
  try {
    // Determine which database to use based on environment
    const mongoURI = process.env.NODE_ENV === 'test'
      ? process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/chat-app-test'
      : process.env.MONGO_URI || 'mongodb://localhost:27017/chat-app';

    if (!mongoURI) {
      throw new Error('MongoDB URI not configured in environment variables');
    }

    // Enhanced connection options
    const connectionOptions = {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    // In test environment, use shorter timeouts
    if (process.env.NODE_ENV === 'test') {
      connectionOptions.serverSelectionTimeoutMS = 3000;
      connectionOptions.socketTimeoutMS = 10000;
    }

    console.log(colorful.info('\n🔌 Attempting to connect to MongoDB...'));
    console.log(colorful.info('⏳ Please wait...\n'));
    
    await mongoose.connect(mongoURI, connectionOptions);
    
    console.log(colorful.success('┌──────────────────────────────────────────────┐'));
    console.log(colorful.success('│ ✅  SUCCESS: Connected to MongoDB            │'));
    console.log(colorful.success(`│ 🔗  Using: ${process.env.NODE_ENV === 'test' ? 'Test DB: SochetioChat DB' : mongoURI.includes('localhost') ? 'Local DB: SochetioChat DB' : 'Production DB'.padEnd(28)}│`));
    console.log(colorful.success('└──────────────────────────────────────────────┘\n'));
  } catch (error) {
    console.log(colorful.error('\n┌──────────────────────────────────────────────┐'));
    console.log(colorful.error('│ ❌  MONGODB CONNECTION ERROR                 │'));
    console.log(colorful.error('├──────────────────────────────────────────────┤'));
    console.log(colorful.error(`│ ${error.message.padEnd(44)}│`));
    console.log(colorful.error('└──────────────────────────────────────────────┘\n'));
    process.exit(1);
  }
};

// Add test-specific functions
const dbUtils = {
  connectDB,
  clearDatabase: async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      console.log(colorful.info('Test database cleared'));
    }
  },
  closeConnection: async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log(colorful.info('Database connection closed'));
    }
  }
};

module.exports = dbUtils;