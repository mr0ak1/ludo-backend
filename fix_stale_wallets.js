/**
 * fix_stale_wallets.js
 *
 * Unlocks wallets that are locked due to a game that is no longer truly active.
 * A game is considered "stale/abandoned" if it is still marked active but has
 * not been updated in the last 30 minutes.
 *
 * Usage:
 *   node fix_stale_wallets.js           → safe mode (skip genuinely active games)
 *   node fix_stale_wallets.js --force   → force-unlock ALL locked wallets (use with care)
 */
require('dotenv').config();
const { sequelize } = require('./src/config/db');
const Wallet = require('./src/models/wallet.model');
const Game = require('./src/models/game.model');
const { Op } = require('sequelize');

const FORCE = process.argv.includes('--force');
// Games not updated in this many minutes are considered abandoned
const STALE_MINUTES = 30;

async function fixStaleWallets() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const lockedWallets = await Wallet.findAll({ where: { isLocked: true } });
    console.log(`🔍 Found ${lockedWallets.length} locked wallet(s).\n`);

    if (lockedWallets.length === 0) {
      console.log('Nothing to fix!');
      process.exit(0);
    }

    let unlocked = 0;
    let skipped = 0;
    let forceUnlocked = 0;

    const staleThreshold = new Date(Date.now() - STALE_MINUTES * 60 * 1000);

    for (const wallet of lockedWallets) {
      const reason = wallet.lockedReason || '';
      const match = reason.match(/Game in progress[:\s]+(\S+)/i);
      const lockedGameId = match ? match[1] : null;

      if (FORCE) {
        await wallet.update({ isLocked: false, lockedReason: null, lockedAt: null });
        console.log(`  💪 User ${wallet.userId}: Force-unlocked (reason was: "${reason}")`);
        forceUnlocked++;
        continue;
      }

      if (!lockedGameId) {
        console.log(`  ⚠️  User ${wallet.userId}: Hard admin lock — "${reason}" — skipping (use --force to override)`);
        skipped++;
        continue;
      }

      // Look up the game
      let game = null;
      try {
        game = await Game.findOne({
          where: {
            [Op.or]: [
              { gameId: String(lockedGameId) },
              ...((/^\d+$/).test(lockedGameId) ? [{ id: parseInt(lockedGameId, 10) }] : []),
            ],
          },
        });
      } catch (e) {
        console.log(`  ⚠️  User ${wallet.userId}: DB error looking up game "${lockedGameId}" — ${e.message}`);
      }

      if (!game) {
        // Game record doesn't exist at all — definitely stale
        await wallet.update({ isLocked: false, lockedReason: null, lockedAt: null });
        console.log(`  ✅ User ${wallet.userId}: Game ${lockedGameId} NOT FOUND in DB — unlocked.`);
        unlocked++;
        continue;
      }

      const isActive = game.status === 'active';
      const lastUpdate = new Date(game.updatedAt || game.createdAt);
      const isStale = lastUpdate < staleThreshold;

      console.log(`  🎮 User ${wallet.userId}: Game ${lockedGameId} → status="${game.status}", last updated=${lastUpdate.toISOString()}, stale=${isStale}`);

      if (!isActive) {
        // Game ended/surrendered/cancelled — unlock
        await wallet.update({ isLocked: false, lockedReason: null, lockedAt: null });
        console.log(`     → Game already ended (${game.status}). Wallet unlocked ✅`);
        unlocked++;
      } else if (isStale) {
        // Game is "active" but hasn't been touched in 30+ minutes — abandoned
        // Mark game as abandoned and unlock wallet
        await game.update({ status: 'abandoned', endedAt: new Date(), endTime: new Date() });
        await wallet.update({ isLocked: false, lockedReason: null, lockedAt: null });
        console.log(`     → Game is STALE (no activity for 30+ min). Marked abandoned + wallet unlocked ✅`);
        unlocked++;
      } else {
        // Genuinely active and recent — skip
        console.log(`     → Game is genuinely active and recent. Skipping (use --force to override).`);
        skipped++;
      }
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`🎉 Done!`);
    if (FORCE) {
      console.log(`   Force-unlocked : ${forceUnlocked}`);
    } else {
      console.log(`   Unlocked       : ${unlocked}`);
      console.log(`   Skipped        : ${skipped}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

fixStaleWallets();
