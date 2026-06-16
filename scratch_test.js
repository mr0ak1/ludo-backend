const { connectDB } = require('./src/config/db');
const Game = require('./src/models/game.model');

async function test() {
  try {
    await connectDB();
    const game = await Game.findOne({ order: [['createdAt', 'DESC']] });
    if (game) {
      console.log('--- DB Checker ---');
      console.log('game.players type:', typeof game.players);
      console.log('game.players raw:', game.players);
      console.log('game.players isArray:', Array.isArray(game.players));
      console.log('game.toJSON().players type:', typeof game.toJSON().players);
      console.log('game.toJSON().players isArray:', Array.isArray(game.toJSON().players));
    } else {
      console.log('No games found in the database');
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
  process.exit(0);
}

test();


