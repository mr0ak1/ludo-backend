require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const Game = require('./src/models/game.model');
const env = require('./src/config/env');

mongoose.connect(env.mongoUri || 'mongodb://127.0.0.1:27017/ludo').then(async () => {
  const activeGames = await Game.find({ status: 'active' });
  console.log('Active Games:', activeGames.length);

  activeGames.forEach(g => {
    console.log(`Game ID: ${g._id}, startedAt: ${g.startedAt}`);
    g.players.forEach(p => {
      if (!p.isBot) {
        console.log(`  Human Player: ${p.userId}, isActive: ${p.isActive}, disconnectedAt: ${p.disconnectedAt}`);
      }
    });
  });

  process.exit(0);
}).catch(console.error);
