const { Op } = require('sequelize');
const User = require('../models/user.model');
const logger = require('../utils/logger');
const {
  LEADERBOARD_TOP_N,
  LEADERBOARD_MIN_GAMES,
} = require('../constants/stats.constants');

class StatsRepository {
  /**
   * Leaderboard: win rate (min games), tiebreaker total games, then wins, then id.
   * Excludes bots.
   */
  async fetchLeaderboardRaw() {
    try {
      const users = await User.findAll({
        where: {
          isBot: { [Op.ne]: true },
          totalGames: { [Op.gte]: LEADERBOARD_MIN_GAMES },
        },
        order: [
          ['winRate', 'DESC'],
          ['totalGames', 'DESC'],
          ['wins', 'DESC'],
          ['id', 'ASC'],
        ],
        limit: LEADERBOARD_TOP_N,
        attributes: ['name', 'avatar', 'wins', 'losses', 'totalGames', 'winRate', 'rankPoints'],
      });
      return users.map(u => u.toJSON());
    } catch (error) {
      logger.error('fetchLeaderboardRaw error:', error);
      throw error;
    }
  }

  /**
   * Rank position (1-based) for a human with enough games; null if unranked.
   */
  async countUsersRankedAbove(userId, me) {
    try {
      if (!me || me.isBot || me.totalGames < LEADERBOARD_MIN_GAMES) {
        return null;
      }
      const numericId = parseInt(userId, 10);
      if (isNaN(numericId)) return null;

      const ahead = await User.count({
        where: {
          isBot: { [Op.ne]: true },
          totalGames: { [Op.gte]: LEADERBOARD_MIN_GAMES },
          [Op.or]: [
            { winRate: { [Op.gt]: me.winRate } },
            {
              winRate: me.winRate,
              totalGames: { [Op.gt]: me.totalGames },
            },
            {
              winRate: me.winRate,
              totalGames: me.totalGames,
              wins: { [Op.gt]: me.wins },
            },
            {
              winRate: me.winRate,
              totalGames: me.totalGames,
              wins: me.wins,
              id: { [Op.lt]: numericId },
            },
          ],
        },
      });
      return ahead + 1;
    } catch (error) {
      logger.error('countUsersRankedAbove error:', error);
      return null;
    }
  }
}

module.exports = new StatsRepository();
