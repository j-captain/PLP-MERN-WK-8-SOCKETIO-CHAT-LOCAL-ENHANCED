const mongoose = require('mongoose');
const User = require('../models/User');

module.exports = async () => {
  // Create test user
  try {
    await User.deleteMany({}); // Clean existing users
    await User.create({
      username: 'testuser',
      password: 'testpass'
    });
    console.log('[Global Setup] Test user created');
  } catch (err) {
    console.error('[Global Setup] Error creating test user:', err);
    throw err;
  }
};