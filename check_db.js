require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const Game = require('./src/models/game.model');
const User = require('./src/models/user.model');
const env = require('./src/config/env');

mongoose.connect(env.mongoUri || 'mongodb://127.0.0.1:27017/ludo').then(async () => {
  const users = await User.countDocuments();
  console.log('Total Users:', users);

  const activeGames = await Game.find({ status: 'active' });
  console.log('Active Games:', activeGames.length);

  let humanCount = 0;
  const humanUsers = new Set();
  
  activeGames.forEach(g => {
    g.players.forEach(p => {
      if (!p.isBot) {
        humanCount++;
        humanUsers.add(p.userId ? p.userId.toString() : 'unknown');
      }
    });
  });

  console.log('Total human player instances in active games:', humanCount);
  console.log('Unique human players in active games:', humanUsers.size);

  process.exit(0);
}).catch(console.error);
