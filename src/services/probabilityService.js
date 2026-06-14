const ProbabilityConfig = require('../models/probabilityConfig.model');
const Game = require('../models/game.model');
const logger = require('../utils/logger');
const ProbabilityAudit = require('../models/probabilityAudit.model');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

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
      await config.update(data);
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
      const activeGames = await Game.findAll({
        where: {
          status: { [Op.in]: ['active', 'ongoing'] },
          [Op.and]: [
            sequelize.literal("JSON_CONTAINS(players, JSON_OBJECT('isBot', true))")
          ]
        },
        attributes: ['id', 'gameId', 'betAmount', 'createdAt', 'players']
      });

      const activeGamesPlain = activeGames.map(g => g.toJSON());
      const totalActiveGames = activeGamesPlain.length;
      
      // Case 1: No Active Games
      if (totalActiveGames === 0) {
        this.isRunning = false;
        return;
      }

      // Step 2: Sort by bet amount (asc), createdAt (asc), id (asc)
      activeGamesPlain.sort((a, b) => {
        const betA = a.betAmount || 0;
        const betB = b.betAmount || 0;
        if (betA !== betB) return betA - betB;
        
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        
        return String(a.id).localeCompare(String(b.id));
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
      const auditEntries = [];

      for (let i = 0; i < totalActiveGames; i++) {
        const game = activeGamesPlain[i];
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
          await Game.update(
            { players: updatedPlayers },
            { where: { id: game.id } }
          );

          auditEntries.push({
            gameId: game.gameId || String(game.id),
            assignedMode,
            betAmount: game.betAmount || 0,
            probability: config.winProbability,
            reason: 'recalculate',
            createdAt: new Date(),
          });
        }
      }

      // Insert audit entries if any
      if (auditEntries.length > 0) {
        try {
          await ProbabilityAudit.bulkCreate(auditEntries);
        } catch (auditErr) {
          logger.warn('Probability Manager: failed to write audit entries', auditErr);
        }
        logger.info(`Probability Manager: Recalculated and updated ${auditEntries.length} games. Total: ${totalActiveGames}, Easy: ${easyCount}, Probability: ${config.winProbability}%`);
      }

    } catch (error) {
      logger.error('Error in ProbabilityService recalculate:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = new ProbabilityService();
