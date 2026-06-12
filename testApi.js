require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/ludo_game');
  const User = require('./src/models/user.model');
  const Wallet = require('./src/models/wallet.model');
  const user = await User.findOne({ role: 'admin' });
  if (!user) {
    console.log("NO ADMIN FOUND!");
    process.exit(1);
  }
  
  await Wallet.updateOne({ userId: user._id }, { $set: { isLocked: false, activeGameId: null, coins: 10000 } });

  const token = jwt.sign({ userId: user._id, role: 'admin' }, process.env.JWT_SECRET || 'ludo_super_secret_key_2023', { expiresIn: '1d' });
  
  const http = require('http');

  // Let's set difficulty first
  await new Promise((resolve) => {
    const reqDiff = http.request('http://localhost:5000/api/v1/admin/set-difficulty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        console.log('Set Diff:', data);
        resolve();
      });
    });
    reqDiff.write(JSON.stringify({ difficulty: 'easy' }));
    reqDiff.end();
  });

  await new Promise((resolve) => {
    const reqThresh = http.request('http://localhost:5000/api/v1/admin/set-hard-mode-threshold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
    }, (res) => { 
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        console.log('Set Thresh:', data);
        resolve();
      });
    });
    reqThresh.write(JSON.stringify({ threshold: 450 }));
    reqThresh.end();
  });

  // Test cash create
  const req = http.request('http://localhost:5000/api/v1/game/cash/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Response:', data);
      process.exit(0);
    });
  });

  req.write(JSON.stringify({
    entryFee: 100,
    maxPlayers: 2
  }));
  req.end();
}

run();
