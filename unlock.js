const mongoose = require('mongoose');
const db = require('./src/config/env');
mongoose.connect(db.mongoUri).then(async () => {
  const res = await mongoose.connection.collection('wallets').updateMany({}, { $set: { isLocked: false, lockedReason: null } });
  console.log('Unlocked wallets:', res.modifiedCount);
  process.exit(0);
}).catch(console.error);
