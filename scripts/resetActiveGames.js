const mongoose = require('mongoose');
const Game = require('../src/models/game.model');
const config = require('../src/config/env');

const resetActiveGames = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected.');

    const result = await Game.updateMany(
      { status: 'active' },
      { $set: { status: 'cancelled', cancelReason: 'Reset stuck games via admin command' } }
    );

    console.log(`Successfully reset ${result.modifiedCount} stuck active games to cancelled.`);
  } catch (error) {
    console.error('Error resetting games:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
};

resetActiveGames();
