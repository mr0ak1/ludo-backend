require('dotenv').config();
const mongoose = require('mongoose');

async function testOverride() {
  await mongoose.connect('mongodb://localhost:27017/ludo_game');
  console.log('Connected to DB');

  try {
    const matchmakingService = require('./src/services/matchmakingService');
    const gameService = require('./src/services/gameService');
    const User = require('./src/models/user.model');
    const Wallet = require('./src/models/wallet.model');

    const user = await User.findOne({ isBot: { $ne: true } });
    await Wallet.updateOne({ userId: user._id }, { $set: { isLocked: false, activeGameId: null, coins: 10000 } });
    
    matchmakingService.setGlobalBotDifficulty('easy');
    matchmakingService.setHardModeThreshold(450);

    let globalDifficulty = matchmakingService.getGlobalBotDifficulty();
    
    // Auto hard mode logic based on threshold
    const threshold = matchmakingService.getHardModeThreshold();
    const entryFee = 100; // <--- BELOW THRESHOLD
    if (threshold !== null && entryFee >= threshold) {
      globalDifficulty = 'hard';
    }
    
    const game = await gameService.createCashGame(user._id, entryFee, 2, globalDifficulty, 'red');
    console.log('Game created with players:', JSON.stringify(game.players, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message, err.stack);
  }
  process.exit(0);
}

testOverride();
