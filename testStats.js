require('dotenv').config();
const mongoose = require('mongoose');

async function testStats() {
  await mongoose.connect('mongodb://localhost:27017/ludo_game');
  console.log('Connected to DB');

  try {
    const User = require('./src/models/user.model');
    const user = await User.findOne();
    if (!user) {
      console.log('No user found');
      process.exit(0);
    }
    const walletService = require('./src/services/walletService');
    const stats = await walletService.getWalletStats(user._id);
    console.log(JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error('Error:', err.message, err.stack);
  }
  process.exit(0);
}

testStats();
