const mongoose = require('mongoose');

async function testReject() {
  await mongoose.connect('mongodb://localhost:27017/ludo_game');
  console.log('Connected to DB');

  const Transaction = require('./src/models/transaction.model');
  const tx = await Transaction.findOne({ type: 'withdrawal', status: 'pending' });
  
  if (!tx) {
    console.log('No pending withdrawal found');
    process.exit(0);
  }

  console.log('Found tx:', tx._id, 'amount:', tx.amount, 'userId:', tx.userId);

  try {
    const walletService = require('./src/services/walletService');
    await walletService.addCoins(tx.userId, Math.abs(tx.amount), 'Withdrawal Rejected Refund');
    console.log('addCoins successful');
    
    tx.status = 'failed';
    tx.reason = tx.reason + ' (Rejected by Admin)';
    await tx.save();
    console.log('tx saved successful');
  } catch (err) {
    console.error('Error during reject:', err.message, err.stack);
  }
  process.exit(0);
}

testReject();
