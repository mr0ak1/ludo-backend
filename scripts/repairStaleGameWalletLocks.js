require('dotenv').config();
const mongoose = require('mongoose');

const Wallet = require('../src/models/wallet.model');
const Game = require('../src/models/game.model');

async function repairStaleGameWalletLocks() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('ERROR: MONGO_URI is missing in .env');
      process.exit(1);
    }

    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const staleReason = 'Game in progress: null';
    const lockedWallets = await Wallet.find({
      isLocked: true,
      lockedReason: staleReason,
    }).select('_id userId lockedReason');

    console.log(`Found ${lockedWallets.length} wallet(s) with the stale lock reason.`);

    let unlockedCount = 0;
    let skippedCount = 0;

    for (const wallet of lockedWallets) {
      const activeGame = await Game.findOne({
        'players.userId': wallet.userId,
        status: 'active',
      }).select('_id gameId status');

      if (activeGame) {
        skippedCount += 1;
        console.log(`Skipping user ${wallet.userId}: active game ${activeGame._id} still exists.`);
        continue;
      }

      await Wallet.updateOne(
        { _id: wallet._id },
        {
          $set: {
            isLocked: false,
            lockedReason: null,
            lockedAt: null,
            updatedAt: new Date(),
          },
        }
      );

      unlockedCount += 1;
      console.log(`Unlocked wallet for user ${wallet.userId}.`);
    }

    console.log(`Done. Unlocked ${unlockedCount}, skipped ${skippedCount}.`);
    process.exit(0);
  } catch (error) {
    console.error('Repair failed:', error);
    process.exit(1);
  }
}

repairStaleGameWalletLocks();