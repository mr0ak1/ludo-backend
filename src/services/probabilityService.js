const ProbabilityConfig = require('../models/probabilityConfig.model');
const Game = require('../models/game.model');
const logger = require('../utils/logger');
const ProbabilityAudit = require('../models/probabilityAudit.model');
const mongoose = require('mongoose');

class ProbabilityService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    if (this.intervalId) return;
    // Run recalculation every 10 seconds
    this.intervalId = setInterval(() => this.recalculate(), 10000);
    logger.info('Probability Service started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async getConfig() {
    let config = await ProbabilityConfig.findOne();
    if (!config) {
      config = await ProbabilityConfig.create({
        winProbability: 30,
        enabled: false,
        forceOverrideBotManagement: true,
      });
    }
    return config;
  }

  async setConfig(data) {
    let config = await ProbabilityConfig.findOne();
    if (config) {
      Object.assign(config, data);
      await config.save();
    } else {
      config = await ProbabilityConfig.create(data);
    }
    // Trigger immediate recalculation on config change
    setImmediate(() => this.recalculate());
    return config;
  }

  async recalculate() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const config = await this.getConfig();
      if (!config.enabled) {
        this.isRunning = false;
        return;
      }

      // Step 1: Fetch all active user-vs-bot games
      // Active games where at least one player is a bot
      const activeGames = await Game.find({
        status: { $in: ['active', 'ongoing'] },
        'players.isBot': true
      }).select('_id betAmount createdAt players').lean();

      const totalActiveGames = activeGames.length;
      
      // Case 1: No Active Games
      if (totalActiveGames === 0) {
        this.isRunning = false;
        return;
      }

      // Step 2: Sort by bet amount (asc), createdAt (asc), _id (asc)
      activeGames.sort((a, b) => {
        const betA = a.betAmount || 0;
        const betB = b.betAmount || 0;
        if (betA !== betB) return betA - betB;
        
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        
        return a._id.toString().localeCompare(b._id.toString());
      });

      // Step 3: Calculate Easy game count
      let easyCount = 0;
      if (config.winProbability === 100) {
        easyCount = totalActiveGames;
      } else if (config.winProbability === 0) {
        easyCount = 0;
      } else {
        easyCount = Math.floor((totalActiveGames * config.winProbability) / 100);
      }

      // Step 4: Assign Easy Mode to lowest bet games, Hard to rest
      const bulkOps = [];
      const auditEntries = [];

      for (let i = 0; i < totalActiveGames; i++) {
        const game = activeGames[i];
        const assignedMode = i < easyCount ? 'easy' : 'hard';

        // If forceOverrideBotManagement is false, skip games that already have botDifficulty set
        if (config.forceOverrideBotManagement === false) {
          const anyBotHasDifficulty = game.players.some(p => p.isBot && p.botDifficulty != null);
          if (anyBotHasDifficulty) continue;
        }

        // Find if we need to update bot difficulties in this game
        let needsUpdate = false;
        const updatedPlayers = game.players.map(p => {
          if (p.isBot && p.botDifficulty !== assignedMode) {
            needsUpdate = true;
            return { ...p, botDifficulty: assignedMode };
          }
          return p;
        });

        if (needsUpdate) {
          bulkOps.push({
            updateOne: {
              filter: { _id: game._id },
              update: { $set: { players: updatedPlayers } }
            }
          });

          auditEntries.push({
            gameId: game._id,
            assignedMode,
            betAmount: game.betAmount || 0,
            probability: config.winProbability,
            reason: 'recalculate',
            createdAt: new Date(),
          });
        }
      }

      // Batched update
      if (bulkOps.length > 0) {
        // Execute in batches of 500 to avoid locking
        const batchSize = 500;
        for (let i = 0; i < bulkOps.length; i += batchSize) {
          const batch = bulkOps.slice(i, i + batchSize);
          await Game.bulkWrite(batch, { ordered: false });
        }

        // Insert audit entries if any
        try {
          if (auditEntries.length > 0) {
            await ProbabilityAudit.insertMany(auditEntries, { ordered: false });
          }
        } catch (auditErr) {
          logger.warn('Probability Manager: failed to write audit entries', auditErr);
        }

        logger.info(`Probability Manager: Recalculated and updated ${bulkOps.length} games. Total: ${totalActiveGames}, Easy: ${easyCount}, Probability: ${config.winProbability}%`);
      }

    } catch (error) {
      logger.error('Error in ProbabilityService recalculate:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = new ProbabilityService();
