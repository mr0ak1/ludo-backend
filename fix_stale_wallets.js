/**
 * fix_stale_wallets.js
 * 
 * Unlocks all wallets that are locked due to a game that is no longer active.
 * Run with: node fix_stale_wallets.js
 */
require('dotenv').config();
const { sequelize } = require('./src/config/db');
const Wallet = require('./src/models/wallet.model');
const Game = require('./src/models/game.model');

async function fixStaleWallets() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const lockedWallets = await Wallet.findAll({ where: { isLocked: true } });
    console.log(`🔍 Found ${lockedWallets.length} locked wallet(s).`);

    let unlocked = 0;
    let skipped = 0;

    for (const wallet of lockedWallets) {
      const reason = wallet.lockedReason || '';
      const match = reason.match(/Game in progress[:\s]+(\S+)/i);
      const lockedGameId = match ? match[1] : null;

      if (!lockedGameId) {
        // Hard lock (admin freeze etc.) — skip
        console.log(`  ⚠️  User ${wallet.userId}: Hard lock "${reason}" — skipping.`);
        skipped++;
        continue;
      }

      // Check if game is still active
      let game = null;
      try {
        const { Op } = require('sequelize');
        game = await Game.findOne({
          where: {
            [Op.or]: [
              { gameId: lockedGameId },
              ...((/^\d+$/).test(lockedGameId) ? [{ id: parseInt(lockedGameId, 10) }] : []),
            ],
          },
        });
      } catch (e) {
        console.log(`  ⚠️  User ${wallet.userId}: Could not look up game "${lockedGameId}" — ${e.message}`);
      }

      const isStillActive = game && game.status === 'active';

      if (isStillActive) {
        console.log(`  🎮 User ${wallet.userId}: Game ${lockedGameId} still active — skipping.`);
        skipped++;
      } else {
        await wallet.update({ isLocked: false, lockedReason: null, lockedAt: null });
        console.log(`  ✅ User ${wallet.userId}: Unlocked (game ${lockedGameId} status: ${game?.status ?? 'not found'}).`);
        unlocked++;
      }
    }

    console.log(`\n🎉 Done! Unlocked: ${unlocked} | Skipped: ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixStaleWallets();
